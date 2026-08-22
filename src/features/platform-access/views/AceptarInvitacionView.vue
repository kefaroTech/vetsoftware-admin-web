<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import PawLoader from '@/components/feedback/PawLoader.vue'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import PasswordChecklist, {
  PASSWORD_MAX,
  PASSWORD_MIN,
} from '@/components/ui/PasswordChecklist.vue'
import { length } from '@/composables/validators'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import { usePlatformAccess } from '../composables/usePlatformAccess'

/**
 * `/aceptar-invitacion?token=…` — el solicitante aprobado crea su contraseña.
 *
 * Máquina de estados: `loading | form | invalid | success`. La validación del
 * token ocurre ANTES de pintar el formulario: pedir una contraseña sobre un
 * enlace muerto hace escribirla para nada.
 *
 * **Sin auto-login y sin redirección automática.** El usuario acaba de elegir
 * una contraseña que nunca ha escrito: la pantalla de éxito con un botón
 * explícito le da el momento de fijarla y de guardarla en el gestor. Un
 * `setTimeout` que redirigiera solo incumpliría §2.2.1 Timing Adjustable.
 */
type Estado = 'loading' | 'form' | 'invalid' | 'success'

const route = useRoute()
const { loading, loadInvitation, acceptInvitation } = usePlatformAccess()

const estado = ref<Estado>('loading')
const email = ref('')
const password = ref('')
const confirmacion = ref('')
const verPassword = ref(false)
const verConfirmacion = ref(false)
const submitted = ref(false)
const errorEnvio = ref(false)
const serverErrors = ref<Record<string, string>>({})

const layout = ref<InstanceType<typeof PublicLayout> | null>(null)
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

const SHOW_LOADER_MS = 200
const mostrarLoader = ref(false)
let loaderTimer: ReturnType<typeof setTimeout> | undefined

const IDS = { password: 'invitacion-password', confirmacion: 'invitacion-confirmacion' } as const

const token = computed(() => {
  const raw = route.query.token
  return typeof raw === 'string' ? raw : ''
})

// `length()` produce los tres mensajes exactos que pide el diseño: «La
// contraseña es obligatoria.», «… debe tener al menos 12 caracteres.» y
// «… no puede pasar de 100 caracteres.»
const errors = computed(() => ({
  password:
    serverErrors.value.password ||
    length(password.value, 'La contraseña', PASSWORD_MIN, PASSWORD_MAX),
  confirmacion: !confirmacion.value
    ? 'Confirma la contraseña.'
    : confirmacion.value !== password.value
      ? 'Las contraseñas no coinciden.'
      : '',
}))

const summaryItems = computed(() =>
  submitted.value ? toSummaryItems(errors.value, IDS, ['password', 'confirmacion']) : [],
)

function err(field: keyof typeof IDS) {
  return submitted.value ? errors.value[field] || undefined : undefined
}

onMounted(async () => {
  if (!token.value) {
    estado.value = 'invalid'
    return
  }
  loaderTimer = setTimeout(() => (mostrarLoader.value = true), SHOW_LOADER_MS)
  const resultado = await loadInvitation(token.value)
  clearTimeout(loaderTimer)
  if (resultado.outcome === 'ok') {
    // El correo se muestra porque lo devuelve el `GET` de validación, para que
    // el usuario compruebe que la invitación es para él. NO se saca del token
    // en el cliente.
    email.value = resultado.data.email
    estado.value = 'form'
    await nextTick()
    document.getElementById(IDS.password)?.focus()
    return
  }
  estado.value = 'invalid'
})

onBeforeUnmount(() => clearTimeout(loaderTimer))

async function crear() {
  if (loading.value) return
  submitted.value = true
  serverErrors.value = {}
  if (Object.values(errors.value).some(Boolean)) {
    await nextTick()
    summary.value?.focus()
    return
  }

  errorEnvio.value = false
  const resultado = await acceptInvitation(token.value, password.value)

  if (resultado.outcome === 'ok') {
    estado.value = 'success'
    await nextTick()
    layout.value?.focusTitle()
    return
  }
  // SOLO 404/410 tiran el formulario. Un 500 o una caída de red dejarían al
  // usuario sin la contraseña que acaba de escribir, y esa pérdida es peor que
  // el propio fallo.
  if (resultado.outcome === 'invalid') {
    estado.value = 'invalid'
    await nextTick()
    layout.value?.focusTitle()
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

const shell = computed(() => {
  switch (estado.value) {
    case 'form':
      return {
        documentTitle: 'Crear contraseña · VetSoftware',
        eyebrow: 'INVITACIÓN',
        title: 'Crea tu contraseña',
        subtitle: email.value
          ? `Vas a activar la cuenta de plataforma de ${email.value}. La usarás cada vez que inicies sesión.`
          : 'Vas a activar tu cuenta de plataforma. Esta contraseña la usarás cada vez que inicies sesión.',
        statusIcon: undefined,
        statusTone: 'accent' as const,
      }
    case 'success':
      return {
        documentTitle: 'Contraseña creada · VetSoftware',
        eyebrow: undefined,
        title: 'Cuenta activada',
        subtitle: 'Tu contraseña quedó creada. Ya puedes iniciar sesión con ella.',
        statusIcon: ICONS.SUCCESS,
        statusTone: 'success' as const,
      }
    case 'invalid':
      // Ni «caducó hace 20 minutos», ni «ya se usó el 21 de agosto», ni «no
      // existe ninguna invitación con ese token»: un solo texto para los tres.
      return {
        documentTitle: 'Enlace no válido · VetSoftware',
        eyebrow: undefined,
        title: 'Este enlace ya no sirve',
        subtitle: 'La invitación no es válida, caducó o ya se usó. Pide que te envíen una nueva.',
        statusIcon: ICONS.ERROR,
        statusTone: 'danger' as const,
      }
    default:
      return {
        documentTitle: 'Crear contraseña · VetSoftware',
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
    :max-width="estado === 'form' ? 480 : 440"
  >
    <template #topRight>
      <RouterLink :to="{ name: ROUTE_NAMES.LOGIN }">Iniciar sesión</RouterLink>
    </template>

    <!-- Si la respuesta llega antes de 200 ms no debe verse parpadeo: por
         debajo de 0,1 s el indicador molesta más que ayuda. `PawLoader` ya trae
         `role="status"`, así que el estado se anuncia solo. -->
    <div v-if="estado === 'loading'" class="cargando ds-stack ds-stack--16" aria-busy="true">
      <template v-if="mostrarLoader">
        <PawLoader :size="72" label="Comprobando la invitación" />
        <p class="ds-meta">Comprobando la invitación…</p>
      </template>
    </div>

    <form
      v-else-if="estado === 'form'"
      class="ds-stack ds-stack--16"
      novalidate
      @submit.prevent="crear"
    >
      <ErrorSummary ref="summary" :items="summaryItems" />

      <p
        v-if="errorEnvio"
        class="ds-banner ds-banner--error ds-banner--sm ds-banner--flush"
        role="alert"
      >
        No pudimos crear la contraseña. Inténtalo de nuevo.
      </p>

      <div class="ds-stack ds-stack--10">
        <AppInput
          :id="IDS.password"
          v-model="password"
          label="Contraseña"
          required
          :type="verPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :disabled="loading"
          :error="err('password')"
        >
          <template #trailing>
            <button
              type="button"
              class="eye-btn"
              :aria-label="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              :disabled="loading"
              @click="verPassword = !verPassword"
            >
              <component :is="verPassword ? ICONS.EYE_OFF : ICONS.EYE" :size="15" />
            </button>
          </template>
        </AppInput>
        <PasswordChecklist :value="password" />
      </div>

      <!-- Los dos ojos son independientes: revelar la contraseña no revela la
           confirmación, porque si se revelan las dos a la vez la confirmación
           deja de confirmar nada. -->
      <AppInput
        :id="IDS.confirmacion"
        v-model="confirmacion"
        label="Confirmar contraseña"
        required
        :type="verConfirmacion ? 'text' : 'password'"
        autocomplete="new-password"
        :disabled="loading"
        :error="err('confirmacion')"
      >
        <template #trailing>
          <button
            type="button"
            class="eye-btn"
            :aria-label="verConfirmacion ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            :disabled="loading"
            @click="verConfirmacion = !verConfirmacion"
          >
            <component :is="verConfirmacion ? ICONS.EYE_OFF : ICONS.EYE" :size="15" />
          </button>
        </template>
      </AppInput>

      <button
        type="submit"
        class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"
        :disabled="loading"
      >
        <template v-if="loading">Creando…</template>
        <template v-else>
          Crear contraseña y activar
          <component :is="ICONS.ARROW_RIGHT" :size="14" aria-hidden="true" />
        </template>
      </button>
    </form>

    <div v-else class="salida">
      <RouterLink
        v-if="estado === 'success'"
        class="ds-btn ds-btn--primary"
        :to="{ name: ROUTE_NAMES.LOGIN }"
      >
        Iniciar sesión
      </RouterLink>
      <RouterLink v-else class="ds-btn ds-btn--ghost" :to="{ name: ROUTE_NAMES.LOGIN }">
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

/* §2.5.8 Target Size (Minimum), 24×24 CSS px: el icono son 15 px y el botón de
   ojo de `LoginView` no declaraba tamaño. Es un defecto heredado que no se
   copia. Vive aquí y no en `AppInput` porque el contenido de slot se compila
   con el `data-v` del padre. */
.eye-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-subtle);
  display: grid;
  place-items: center;
  min-width: 24px;
  min-height: 24px;
}

.eye-btn:hover:not(:disabled) {
  color: var(--amatista-700);
}

.eye-btn:disabled {
  cursor: not-allowed;
}

.salida {
  display: flex;
  justify-content: center;
}
</style>
