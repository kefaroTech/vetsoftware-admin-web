<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PawLoader from '@/components/feedback/PawLoader.vue'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import { CODE_LENGTH, sanitizeCode, usePlatformAccess } from '../composables/usePlatformAccess'
import type { AccessRequestResponse } from '../types/platform-access.types'

/**
 * `/aprobar-acceso?token=…` — alguien recibió un correo, hizo clic y tiene que
 * decidir. Puede estar en el móvil. La decisión es **irreversible en los dos
 * sentidos**: aprobar crea una cuenta con control total de la plataforma;
 * rechazar quema la solicitud.
 *
 * Máquina de estados: `loading | form | invalid | blocked | approved | rejected`.
 * `blocked` no es un estado nuevo de pantalla: es el `invalid` con el único
 * texto que sí puede diferenciarse, porque ahí el usuario necesita saber que
 * fue cosa suya.
 */
type Estado = 'loading' | 'form' | 'invalid' | 'blocked' | 'approved' | 'rejected'

const route = useRoute()
const { confirm } = useConfirmDialog()
const { loading, loadAccessRequest, resolveAccessRequest } = usePlatformAccess()

const estado = ref<Estado>('loading')
const solicitud = ref<AccessRequestResponse | null>(null)
const code = ref('')
const codeError = ref('')
const accion = ref<'approve' | 'reject' | null>(null)

const layout = ref<InstanceType<typeof PublicLayout> | null>(null)
/**
 * El código se pinta con `AppInput` y no con un componente propio: un
 * `CodeInput.vue` tenía que recopiar los cuerpos `.field`/`.label`/`.error`
 * de `AppInput`/`AppTextarea`/`AppSelect`/`AppListSearch` y eso empujaba tres
 * grupos duplicados por encima del techo de `css-budget` (FE-08). Lo único
 * que `AppInput` no traía —la presentación monoespaciada y espaciada— entró
 * como prop aditiva `mono`; el saneado vive aquí.
 *
 * Al no haber componente, el elemento se localiza por su `id`, que es el
 * mismo que `<label for>`.
 */
const CODE_ID = 'aprobar-codigo'

function campoCodigo(): HTMLInputElement | null {
  return document.getElementById(CODE_ID) as HTMLInputElement | null
}

/**
 * Sanea a dígitos y **reescribe el DOM**.
 *
 * La reescritura no es un adorno: si el valor saneado coincide con el que ya
 * había —teclear una letra sobre un código vacío, pegar un séptimo dígito—,
 * el modelo no cambia, Vue no repinta, y el carácter sobrante se queda en
 * pantalla mientras el modelo dice otra cosa. Ese desajuste no lanza ningún
 * error y acaba mandando al servidor algo distinto de lo que el usuario ve.
 */
function onCode(raw: string) {
  const digits = sanitizeCode(raw)
  const sinCambio = digits === code.value
  code.value = digits
  if (sinCambio) {
    const el = campoCodigo()
    if (el && el.value !== digits) el.value = digits
  }
}

/**
 * Umbral anti-parpadeo, el mismo que el velo global (200 ms): por debajo de
 * 0,1 s un indicador molesta más que ayuda (NN/g, *Response Times*).
 */
const SHOW_LOADER_MS = 200
const mostrarLoader = ref(false)
let loaderTimer: ReturnType<typeof setTimeout> | undefined

const token = computed(() => {
  const raw = route.query.token
  return typeof raw === 'string' ? raw : ''
})

onMounted(async () => {
  // Sin token no se llama al servidor: no hay nada que preguntarle y una
  // petición vacía solo le diría a quien prueba enlaces que la ruta existe.
  if (!token.value) {
    estado.value = 'invalid'
    return
  }
  loaderTimer = setTimeout(() => (mostrarLoader.value = true), SHOW_LOADER_MS)
  const resultado = await loadAccessRequest(token.value)
  clearTimeout(loaderTimer)
  if (resultado.outcome === 'ok') {
    solicitud.value = resultado.data
    estado.value = 'form'
    // A5 · el usuario llegó desde un correo para hacer justo esto.
    await nextTick()
    campoCodigo()?.focus()
    return
  }
  // Un fallo de red tampoco deja al aprobador mirando el loader para siempre:
  // el enlace puede seguir siendo bueno, pero esta pantalla no puede saberlo.
  estado.value = 'invalid'
})

onBeforeUnmount(() => clearTimeout(loaderTimer))

const solicitadaEl = computed(() => {
  const iso = solicitud.value?.requestedAt
  if (!iso) return ''
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

async function irA(nuevo: Estado) {
  estado.value = nuevo
  await nextTick()
  layout.value?.focusTitle()
}

/**
 * Se valida AL PULSAR, nunca al teclear. Y los dos botones se quedan
 * habilitados mientras el código está incompleto: deshabilitar el envío hasta
 * que el formulario sea válido es el antipatrón que GOV.UK y NN/g rechazan —
 * el usuario no sabe por qué no puede pulsar y nada se lo explica.
 */
function validarCodigo(): boolean {
  if (!code.value) {
    codeError.value = 'El código es obligatorio.'
    return false
  }
  if (code.value.length < CODE_LENGTH) {
    codeError.value = `El código tiene ${CODE_LENGTH} dígitos.`
    return false
  }
  codeError.value = ''
  return true
}

async function decidir(decision: 'approve' | 'reject') {
  if (loading.value) return
  if (!validarCodigo()) {
    await nextTick()
    campoCodigo()?.focus()
    return
  }

  const nombre = solicitud.value?.fullName ?? 'esta persona'
  const correo = solicitud.value?.email ?? 'su correo'
  const opciones =
    decision === 'approve'
      ? {
          message: `¿Aprobar el acceso de ${nombre}?`,
          consequence:
            `Se creará una cuenta con control total de la plataforma y se le enviará una ` +
            `invitación a ${correo}. Esta acción no se puede deshacer.`,
          confirmLabel: 'Aprobar acceso',
        }
      : {
          message: `¿Rechazar la solicitud de ${nombre}?`,
          consequence:
            `La solicitud se descarta y el enlace deja de servir. Si te equivocas, esa persona ` +
            `tendrá que solicitar el acceso otra vez.`,
          confirmLabel: 'Rechazar solicitud',
        }

  if (!(await confirm(opciones))) return

  accion.value = decision
  const resultado = await resolveAccessRequest(token.value, code.value, decision)
  accion.value = null

  if (resultado.outcome === 'ok') {
    await irA(decision === 'approve' ? 'approved' : 'rejected')
    return
  }
  if (resultado.outcome === 'invalid') {
    await irA('invalid')
    return
  }
  if (resultado.outcome === 'blocked') {
    await irA('blocked')
    return
  }
  if (resultado.outcome === 'wrong-code') {
    // Un código erróneo NO es el estado `invalid`: el enlace sigue siendo
    // bueno. El error va en el propio campo, que además se selecciona entero
    // para que reescribir sea teclear encima.
    const n = resultado.remainingAttempts
    codeError.value =
      n === null
        ? 'El código no es correcto.'
        : n === 1
          ? 'El código no es correcto. Te queda 1 intento.'
          : `El código no es correcto. Te quedan ${n} intentos.`
    await nextTick()
    // Se selecciona entero para que reescribir sea teclear encima.
    const el = campoCodigo()
    el?.focus()
    el?.select()
  }
}

/**
 * Un solo texto para: falta el token, token desconocido, token caducado, token
 * ya usado y solicitud ya resuelta por otra persona. Distinguirlos le dice a
 * quien prueba enlaces cuáles existieron.
 */
const shell = computed(() => {
  switch (estado.value) {
    case 'form':
      return {
        documentTitle: 'Aprobar acceso · VetSoftware',
        eyebrow: 'APROBACIÓN DE ACCESO',
        title: 'Revisa esta solicitud',
        subtitle:
          'Alguien pidió una cuenta de administración de plataforma. Tu decisión es definitiva.',
        statusIcon: undefined,
        statusTone: 'accent' as const,
      }
    case 'blocked':
      return {
        documentTitle: 'Enlace no válido · VetSoftware',
        eyebrow: undefined,
        title: 'Demasiados intentos',
        subtitle:
          'Introdujiste el código incorrecto demasiadas veces y este enlace quedó bloqueado. Pide que te envíen la solicitud otra vez.',
        statusIcon: ICONS.ERROR,
        statusTone: 'danger' as const,
      }
    case 'approved':
      return {
        documentTitle: 'Acceso aprobado · VetSoftware',
        eyebrow: undefined,
        title: 'Acceso aprobado',
        subtitle:
          `Enviamos una invitación a ${solicitud.value?.email ?? 'su correo'}. Tiene una hora ` +
          `para crear su contraseña; después, tendrás que aprobar una solicitud nueva.`,
        statusIcon: ICONS.SUCCESS,
        statusTone: 'success' as const,
      }
    case 'rejected':
      return {
        documentTitle: 'Solicitud rechazada · VetSoftware',
        eyebrow: undefined,
        title: 'Solicitud rechazada',
        subtitle:
          'Descartamos la solicitud y avisamos a quien la hizo. No hace falta que hagas nada más.',
        statusIcon: ICONS.CLOSE,
        statusTone: 'danger' as const,
      }
    case 'invalid':
      return {
        documentTitle: 'Enlace no válido · VetSoftware',
        eyebrow: undefined,
        title: 'Este enlace ya no sirve',
        subtitle:
          'El enlace de aprobación no es válido, caducó o ya se usó. Si la solicitud sigue pendiente, pide que te la envíen otra vez.',
        statusIcon: ICONS.ERROR,
        statusTone: 'danger' as const,
      }
    default:
      // Sin `<h1>` durante `loading`: el título todavía no se sabe (depende del
      // estado al que se llegue) y uno provisional obliga a cambiarlo, lo que
      // en un lector de pantalla se oye dos veces.
      return {
        documentTitle: 'Aprobar acceso · VetSoftware',
        eyebrow: undefined,
        title: undefined,
        subtitle: undefined,
        statusIcon: undefined,
        statusTone: 'accent' as const,
      }
  }
})
</script>

<template>
  <PublicLayout
    ref="layout"
    :eyebrow="shell.eyebrow"
    :title="shell.title"
    :subtitle="shell.subtitle"
    :status-icon="shell.statusIcon"
    :status-tone="shell.statusTone"
    :document-title="shell.documentTitle"
    :max-width="estado === 'form' ? 520 : 440"
  >
    <!-- Si la respuesta llega antes de 200 ms no debe verse parpadeo: por
         debajo de 0,1 s el indicador molesta más que ayuda. `PawLoader` ya trae
         `role="status"`, así que el estado se anuncia solo. -->
    <div v-if="estado === 'loading'" class="cargando ds-stack ds-stack--16" aria-busy="true">
      <template v-if="mostrarLoader">
        <PawLoader :size="72" label="Comprobando el enlace" />
        <p class="ds-meta">Comprobando el enlace…</p>
      </template>
    </div>

    <form
      v-else-if="estado === 'form'"
      class="ds-stack ds-stack--16"
      novalidate
      @submit.prevent="decidir('approve')"
    >
      <!-- Los datos de la solicitud son un `<dl>`: no son focalizables ni deben
           serlo. Se muestran a quien tenga el enlace, así que el token que lo
           protege es el secreto de esta pantalla. -->
      <dl class="datos ds-stack ds-stack--8">
        <div class="dato">
          <dt class="ds-label">Nombre</dt>
          <dd class="valor">{{ solicitud?.fullName }}</dd>
        </div>
        <div class="dato">
          <dt class="ds-label">Correo</dt>
          <dd class="valor">{{ solicitud?.email }}</dd>
        </div>
        <div v-if="solicitadaEl" class="dato">
          <dt class="ds-label">Solicitada</dt>
          <dd class="valor">{{ solicitadaEl }}</dd>
        </div>
        <div class="dato">
          <dt class="ds-label">Motivo</dt>
          <dd class="valor">{{ solicitud?.reason }}</dd>
        </div>
      </dl>

      <p class="ds-banner ds-banner--warning ds-banner--sm ds-banner--flush">
        Aprobar crea una cuenta con control total de la plataforma. No se puede deshacer.
      </p>

      <!-- El código se pide UNA vez y sirve para las dos acciones, y va ANTES
           de los botones, en el orden en que se usa. Sin auto-envío al sexto
           dígito: dispararía una acción irreversible sin que el usuario haya
           declarado cuál de las dos quiere (§3.3.4). -->
      <AppInput
        :id="CODE_ID"
        :model-value="code"
        label="Código de verificación"
        required
        mono
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        hint="Los 6 dígitos que te enviamos por correo."
        :error="codeError || undefined"
        :disabled="loading"
        @update:model-value="onCode"
      />

      <div class="acciones">
        <!-- `type="button"`: Enter dentro del campo tiene que activar la acción
             PRIMARIA, no rechazar. Y como aprobar abre confirmación, un Enter
             accidental no aprueba nada. -->
        <button
          type="button"
          class="ds-btn ds-btn--danger ds-btn--lg"
          :disabled="loading"
          @click="decidir('reject')"
        >
          {{ accion === 'reject' ? 'Rechazando…' : 'Rechazar' }}
        </button>
        <button
          type="submit"
          class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"
          :disabled="loading"
        >
          {{ accion === 'approve' ? 'Aprobando…' : 'Aprobar acceso' }}
        </button>
      </div>
    </form>

    <div v-else class="salida">
      <RouterLink class="ds-btn ds-btn--ghost" :to="{ name: ROUTE_NAMES.LOGIN }">
        Ir a iniciar sesión
      </RouterLink>
    </div>
  </PublicLayout>
</template>

<style scoped>
.cargando {
  align-items: center;
  padding: var(--space-16) 0;
}

.datos {
  margin: 0;
}

.dato {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: var(--space-10);
  align-items: baseline;
}

.valor {
  margin: 0;
  color: var(--text);
  font-size: var(--text-body);
}

/* La única rejilla nueva de las tres vistas. En móvil se apilan a ancho
   completo con «Aprobar acceso» arriba: se reordena el DOM con `order`… NO, se
   acepta el orden de escritorio, porque `column-reverse`/`order` dejarían el
   orden visual y el de tabulación desalineados (§1.3.2, §2.4.3). */
.acciones {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-10);
}

@media (width <= 520px) {
  .acciones {
    grid-template-columns: 1fr;
  }

  .dato {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
}

.salida {
  display: flex;
  justify-content: center;
}
</style>
