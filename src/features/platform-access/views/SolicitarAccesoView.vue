<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { length, maxLength, pattern } from '@/composables/validators'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import { usePlatformAccess } from '../composables/usePlatformAccess'

/**
 * `/solicitar-acceso` — alguien que va a administrar la plataforma pide una
 * cuenta. Se rellena una vez en la vida, desde un escritorio y sin prisa; lo
 * que la pantalla no puede hacer es perder lo escrito.
 *
 * Máquina de estados: `form → sending → sent`, y `form → closed` cuando el
 * `POST` responde 404.
 *
 * **No hay estado `checking`**: el contrato acordado con el backend no expone
 * un `GET` de disponibilidad, así que el formulario se pinta directamente y el
 * cierre se descubre al enviar. La consecuencia visible —el usuario escribe y
 * solo entonces se entera de que está cerrado— queda anotada como pendiente.
 */
type Estado = 'form' | 'sent' | 'closed'

const estado = ref<Estado>('form')

const { loading, submitRequest } = usePlatformAccess()

const layout = ref<InstanceType<typeof PublicLayout> | null>(null)
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const form = ref({ fullName: '', email: '', reason: '' })
const submitted = ref(false)
const enviado = ref({ email: '' })
const errorEnvio = ref(false)

/**
 * Errores por campo devueltos por el servidor (`400` con `ProblemDetail.errors[]`).
 * Se pintan JUNTO AL CAMPO y no solo en un toast: es la única forma de cumplir
 * §3.3.1 cuando la validación real vive en el backend. Se limpian en cuanto el
 * usuario reintenta, para que no sobrevivan a la corrección.
 */
const serverErrors = ref<Record<string, string>>({})

/**
 * Permisiva a propósito, no «correcta»: rechazar un correo válido raro es un
 * fallo peor que aceptar uno inválido, que el servidor rechazará igual.
 */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const MOTIVO_MAX = 500

const IDS = {
  fullName: 'acceso-nombre',
  email: 'acceso-email',
  reason: 'acceso-motivo',
} as const

const ORDEN = ['fullName', 'email', 'reason'] as const

// Los literales salen tal cual de `validators.ts` (`length`, `pattern`,
// `maxLength`): no se escribe ni un mensaje de error genérico nuevo.
const errors = computed(() => ({
  fullName: serverErrors.value.fullName || length(form.value.fullName, 'El nombre', 3, 120),
  email:
    serverErrors.value.email ||
    pattern(form.value.email, 'El correo electrónico', RE_EMAIL, 'nombre@empresa.com') ||
    maxLength(form.value.email, 'El correo electrónico', 150),
  reason: serverErrors.value.reason || length(form.value.reason, 'El motivo', 20, MOTIVO_MAX),
}))

const summaryItems = computed(() =>
  submitted.value ? toSummaryItems(errors.value, IDS, [...ORDEN]) : [],
)

function err(field: keyof typeof IDS) {
  return submitted.value ? errors.value[field] || undefined : undefined
}

// A5 · la pantalla existe para rellenar este formulario y el usuario llegó a
// ella desde un enlace, no navegando: enfocar el primer campo le ahorra un Tab.
onMounted(() => document.getElementById(IDS.fullName)?.focus())

async function irA(nuevo: Estado) {
  estado.value = nuevo
  // A1 · sin esto el foco se queda en un botón que ya no existe y el navegador
  // lo devuelve a `<body>`: el siguiente Tab reinicia el recorrido.
  await nextTick()
  layout.value?.focusTitle()
}

async function enviar() {
  if (loading.value) return
  submitted.value = true
  serverErrors.value = {}
  if (Object.values(errors.value).some(Boolean)) {
    // El foco va al RESUMEN y no al primer campo: el usuario necesita saber
    // cuántos problemas hay antes de ir a uno (GOV.UK, *Error summary*).
    await nextTick()
    summary.value?.focus()
    return
  }

  errorEnvio.value = false
  const email = form.value.email.trim()
  const resultado = await submitRequest({
    fullName: form.value.fullName.trim(),
    email,
    reason: form.value.reason.trim(),
  })

  if (resultado.outcome === 'sent') {
    enviado.value.email = email
    await irA('sent')
    return
  }
  if (resultado.outcome === 'closed') {
    await irA('closed')
    return
  }
  if (resultado.outcome === 'field-errors') {
    serverErrors.value = resultado.fieldErrors
    await nextTick()
    summary.value?.focus()
    return
  }
  errorEnvio.value = true
}

/** El `documentTitle` y el resto de props del shell cambian con el estado. */
const shell = computed(() => {
  if (estado.value === 'sent') {
    return {
      documentTitle: 'Solicitud enviada · VetSoftware',
      statusIcon: ICONS.SUCCESS,
      statusTone: 'success' as const,
      title: 'Solicitud enviada',
      subtitle:
        `Enviamos tu solicitud a revisión. Si se aprueba, recibirás un correo en ` +
        `${enviado.value.email} con el enlace para crear tu contraseña. El enlace caduca una ` +
        `hora después de que lo enviemos.`,
      eyebrow: undefined,
    }
  }
  if (estado.value === 'closed') {
    return {
      documentTitle: 'Solicitudes no disponibles · VetSoftware',
      // Tono NEUTRO, no de error: no ha fallado nada, el usuario simplemente no
      // puede hacer eso. Por eso tampoco hay banner rojo ni toast.
      statusIcon: undefined,
      statusTone: 'accent' as const,
      title: 'Las solicitudes de acceso están cerradas',
      subtitle: undefined,
      eyebrow: undefined,
    }
  }
  return {
    documentTitle: 'Solicitar acceso · VetSoftware',
    statusIcon: undefined,
    statusTone: 'accent' as const,
    title: 'Solicita una cuenta de plataforma',
    subtitle:
      'Tu solicitud la revisa una persona. Si se aprueba, te llegará un correo para crear tu contraseña.',
    eyebrow: 'SOLICITUD DE ACCESO',
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
    :max-width="estado === 'form' ? 480 : 440"
  >
    <template #topRight>
      ¿Ya tienes cuenta?
      <RouterLink :to="{ name: ROUTE_NAMES.LOGIN }">Iniciar sesión</RouterLink>
    </template>

    <form
      v-if="estado === 'form'"
      class="ds-stack ds-stack--16"
      novalidate
      @submit.prevent="enviar"
    >
      <ErrorSummary ref="summary" :items="summaryItems" />

      <p
        v-if="errorEnvio"
        class="ds-banner ds-banner--error ds-banner--sm ds-banner--flush"
        role="alert"
      >
        No pudimos enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.
      </p>

      <AppInput
        :id="IDS.fullName"
        v-model="form.fullName"
        label="Nombre completo"
        required
        placeholder="Ada Lovelace"
        autocomplete="name"
        :disabled="loading"
        :error="err('fullName')"
      />

      <AppInput
        :id="IDS.email"
        v-model="form.email"
        label="Correo electrónico"
        required
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="nombre@empresa.com"
        hint="Aquí te enviaremos la respuesta."
        :disabled="loading"
        :error="err('email')"
      />

      <!-- Sin `maxlength` duro: truncar en silencio a los 500 hace que el
           usuario pierda lo que escribió sin enterarse. El contador avisa, el
           validador bloquea el envío y el texto sigue ahí. -->
      <AppTextarea
        :id="IDS.reason"
        v-model="form.reason"
        label="Motivo de la solicitud"
        required
        :rows="4"
        :hint="`Explica para qué necesitas administrar la plataforma. ${form.reason.length}/${MOTIVO_MAX}`"
        :disabled="loading"
        :error="err('reason')"
      />

      <button
        type="submit"
        class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"
        :disabled="loading"
      >
        <template v-if="loading">Enviando…</template>
        <template v-else>
          Enviar solicitud
          <component :is="ICONS.ARROW_RIGHT" :size="14" aria-hidden="true" />
        </template>
      </button>
    </form>

    <div v-else-if="estado === 'sent'" class="ds-stack ds-stack--16">
      <!-- Sin `role`/`aria-live`: no apareció por una interacción sobre este
           bloque, y el cambio de estado ya lo anuncia el foco en el `<h1>`. -->
      <p class="ds-banner ds-banner--info ds-banner--sm ds-banner--flush">
        Revisa también la carpeta de correo no deseado. No hace falta que dejes esta página abierta.
      </p>
      <RouterLink class="ds-btn ds-btn--ghost" :to="{ name: ROUTE_NAMES.LOGIN }">
        Ir a iniciar sesión
      </RouterLink>
    </div>

    <!-- Estado CERRADO. Nunca «ya existe un superadministrador», nunca el
         `detail` del `ProblemDetail` del 404, nunca una fecha, y nunca «vuelve
         a intentarlo más tarde»: es falso, no se va a reabrir solo. La única
         salida real es iniciar sesión, por si ya tenía cuenta. -->
    <AppEmptyState
      v-else
      :icon="ICONS.WARNING"
      title="Esta consola no está aceptando solicitudes de acceso ahora mismo."
      description="Si necesitas una cuenta de plataforma, pídesela a quien ya administra VetSoftware en tu organización."
    >
      <RouterLink class="ds-btn ds-btn--ghost" :to="{ name: ROUTE_NAMES.LOGIN }">
        Ir a iniciar sesión
      </RouterLink>
    </AppEmptyState>
  </PublicLayout>
</template>
