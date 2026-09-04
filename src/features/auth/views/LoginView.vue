<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '@/composables/useToast'
import { storageService } from '@/services/storage/storage.service'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'

const { login } = useAuth()
const { errorFrom } = useToast()

const code = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const sessionNotice = ref('')

// El interceptor deja este aviso justo antes del redirect duro cuando el backend
// responde SESSION_REPLACED. Sin mostrarlo, el usuario aparece en el login sin
// explicación y lo lee como un fallo de la aplicación.
// Se consume de una vez: leerlo lo borra, para que no reaparezca en el siguiente login.
onMounted(() => {
  sessionNotice.value = storageService.takeSessionReplacedNotice() ?? ''
})

async function handleSubmit() {
  if (!code.value.trim() || !password.value) {
    errorMessage.value = 'Ingresa tu código y contraseña.'
    return
  }
  errorMessage.value = null
  loading.value = true
  try {
    await login({ code: code.value.trim(), password: password.value })
  } catch (e) {
    errorMessage.value = 'Credenciales inválidas. Verifica e intenta de nuevo.'
    errorFrom('Código o contraseña incorrectos', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- El shell (barra superior, tarjeta, pie, blobs y sus 297 líneas de estilo)
       vive ahora en `PublicLayout`. La extracción es pixel-exacta: ni un color
       ni un valor cambian. -->
  <PublicLayout
    eyebrow="Panel administrativo"
    title="Inicia sesión"
    subtitle="Accede al panel para administrar Lumbre."
    document-title="Iniciar sesión · Lumbre"
  >
    <template #topRight>
      ¿Eres nuevo?
      <!-- Era `<a href="#">`, un enlace muerto. Es el ÚNICO punto de entrada de
           todo el flujo de alta: sin él, `/solicitar-acceso` es una URL que
           nadie descubre. -->
      <RouterLink :to="{ name: ROUTE_NAMES.ACCESS_REQUEST }">Solicita acceso</RouterLink>
    </template>

    <!-- DS-02: el par «aviso» y «error» de esta pantalla se pintaba con seis
         hexadecimales propios. Ahora los pintan `.ds-banner--warning` y
         `.ds-banner--error`, que hasta este cambio tenían CERO usos en toda la
         consola: el sistema solo sabía dar banners a medida, uno por pantalla. -->
    <p v-if="sessionNotice" class="ds-banner ds-banner--warning ds-banner--sm" role="status">
      {{ sessionNotice }}
    </p>

    <form class="ds-stack ds-stack--14" novalidate @submit.prevent="handleSubmit">
      <!-- `--flush` porque el contenedor es una `.ds-stack--14` con `gap`: el
           `margin-bottom` de la primitiva se sumaría al hueco. -->
      <p
        v-if="errorMessage"
        class="ds-banner ds-banner--error ds-banner--sm ds-banner--flush"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div class="field ds-stack">
        <label for="login-code">Código de usuario</label>
        <div class="input-box ds-field ds-field-rest ds-focus-ring ds-flex-row">
          <component :is="ICONS.USER" :size="15" class="leading-icon" aria-hidden="true" />
          <input
            id="login-code"
            v-model="code"
            type="text"
            placeholder="SYS001"
            autocomplete="username"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="field ds-stack">
        <label for="login-password">Contraseña</label>
        <div class="input-box ds-field ds-field-rest ds-focus-ring ds-flex-row">
          <component :is="ICONS.LOCK" :size="15" class="leading-icon" aria-hidden="true" />
          <input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            :disabled="loading"
          />
          <button
            type="button"
            class="eye-btn"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            :disabled="loading"
            @click="showPassword = !showPassword"
          >
            <component :is="showPassword ? ICONS.EYE_OFF : ICONS.EYE" :size="15" />
          </button>
        </div>
      </div>

      <!-- El `.primary-btn` local (34 líneas) se retira: `.ds-btn--primary`
           pinta el MISMO degradado (`--gradient-primary`) y `.ds-btn--elevated`
           la misma sombra. Con él se va su bloque
           `@media (prefers-reduced-motion)`, que solo existía para anular el
           `translateY(-1px)` del hover: `.ds-btn` no eleva en hover. -->
      <button
        type="submit"
        class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated submit-btn"
        :disabled="loading"
      >
        <template v-if="loading">Iniciando…</template>
        <template v-else>
          Iniciar sesión
          <component :is="ICONS.ARROW_RIGHT" :size="14" aria-hidden="true" />
        </template>
      </button>
    </form>
  </PublicLayout>
</template>

<style scoped>
.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--warm-700);
  letter-spacing: 0.01em;
  margin-bottom: 6px;
}

/* DS-01 · La geometría, el borde, el fondo y el anillo de foco los ponen ahora
   `.ds-field` + `.ds-field-rest`/`.ds-field-invalid` + `.ds-focus-ring`. Este
   `.input-box` fue el ORIGEN de la paleta `--vs-field-*` que DS-01 retira: era la
   pantalla de la que se copiaron los seis hexadecimales al resto de la consola.
   Aquí solo queda lo que la primitiva no cubre.

   El tono es FIJO (`ds-field-rest` + `ds-focus-ring` escritos en el marcado), no
   un `toneClass` computado como el de `AppInput`/`AppSelect`: aquí no hay error
   por campo que pintar —el fallo de credenciales es del formulario entero y lo
   dice el banner con `role="alert"`, porque ninguno de los dos campos es más
   sospechoso que el otro— y el bloqueo durante el envío ya lo comunica
   `.input-box input:disabled`. Mismo patrón estático que `AppListSearch.vue`. */
.input-box {
  min-width: 0;
}

.leading-icon {
  color: var(--warm-450);
  flex-shrink: 0;
  transition: color 0.15s;
}

.input-box:focus-within .leading-icon {
  color: var(--amatista-600);
}

.input-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text);
  font-family: inherit;
  min-width: 0;
}

.input-box input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.input-box input::placeholder {
  color: var(--text-placeholder);
}

/* Issue #102 · el `<input>` de dentro recibe también la regla global de
   `base.css`, que se sumaría al anillo del envoltorio. */
.input-box input:focus-visible {
  box-shadow: none;
}

.eye-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--warm-450);
  display: grid;
  place-items: center;

  /* §2.5.8 Target Size (Minimum), 24×24 CSS px: el icono son 15 px y el botón
     no declaraba tamaño, así que el objetivo quedaba por debajo del mínimo. */
  min-width: 24px;
  min-height: 24px;
  transition: color 0.15s;
}

.eye-btn:hover:not(:disabled) {
  color: var(--amatista-600);
}

.eye-btn:disabled {
  cursor: not-allowed;
}

/* Lo único que `.ds-btn--primary` no trae del `.primary-btn` retirado: su
   separación del campo de arriba y el ancho completo del formulario. */
.submit-btn {
  margin-top: 6px;
  width: 100%;
}
</style>
