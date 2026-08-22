<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '@/composables/useToast'
import { storageService } from '@/services/storage/storage.service'
import { ICONS } from '@/constants/icons'

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
  <div class="login-shell ds-stack">
    <div class="blob blob-tr" aria-hidden="true" />
    <div class="blob blob-bl" aria-hidden="true" />

    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">
          <component :is="ICONS.PAW" :size="16" />
        </div>
        <span class="brand-name">VetSoftware</span>
      </div>
      <div class="topbar-link">¿Eres nuevo? <a href="#">Solicita acceso</a></div>
    </header>

    <main class="login-main">
      <div class="login-card">
        <div class="eyebrow">Panel administrativo</div>
        <h1 class="title">Inicia sesión</h1>
        <p class="subtitle">Accede al panel para administrar VetSoftware.</p>

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

          <button type="submit" class="primary-btn" :disabled="loading">
            <template v-if="loading">Iniciando…</template>
            <template v-else>
              Iniciar sesión
              <component :is="ICONS.ARROW_RIGHT" :size="14" aria-hidden="true" />
            </template>
          </button>
        </form>
      </div>
    </main>

    <footer class="footer">
      <span>© 2026 VetSoftware</span>
      <div class="footer-links">
        <a href="#">Privacidad</a>
        <a href="#">Términos</a>
        <a href="#">Soporte</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.login-shell {
  position: relative;
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #f3e8ff 0%, #f5f1fa 50%, #ede8f4 100%);
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  color: #1a1325;
  overflow-x: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.blob-tr {
  top: -150px;
  right: -150px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgb(192 132 252 / 25%), transparent 60%);
}

.blob-bl {
  bottom: -150px;
  left: -150px;
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, rgb(168 85 247 / 18%), transparent 60%);
}

.topbar {
  position: relative;
  z-index: 1;
  padding: 24px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #a855f7, #581c87);
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 2px 6px -1px rgb(126 34 206 / 40%);
}

.brand-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #1a1325;
}

.topbar-link {
  font-size: 13px;
  color: #6b5b80;
}

.topbar-link a {
  color: #7e22ce;
  font-weight: 600;
  text-decoration: none;
}

.topbar-link a:hover {
  color: #581c87;
}

.login-main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border: 1px solid #ece5f4;
  border-radius: 16px;
  padding: 40px 44px;
  box-shadow:
    0 24px 48px -16px rgb(91 33 182 / 18%),
    0 4px 12px -4px rgb(91 33 182 / 8%);
}

.eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: #7e22ce;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.title {
  font-family: 'Instrument Serif', serif;
  font-size: 34px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: #1a1325;
}

.subtitle {
  font-size: 13px;
  color: #6b5b80;
  margin: 10px 0 28px;
  line-height: 1.5;
}

.field label {
  font-size: 12px;
  font-weight: 600;
  color: #3d2e57;
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
  color: #a89bbd;
  flex-shrink: 0;
  transition: color 0.15s;
}

.input-box:focus-within .leading-icon {
  color: #7e22ce;
}

.input-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1a1325;
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
  color: #a89bbd;
  display: grid;
  place-items: center;
  transition: color 0.15s;
}

.eye-btn:hover:not(:disabled) {
  color: #7e22ce;
}

.eye-btn:disabled {
  cursor: not-allowed;
}

.primary-btn {
  margin-top: 6px;
  padding: 12px 16px;
  border-radius: 9px;
  background: linear-gradient(180deg, #9333ea, #7e22ce);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow:
    0 4px 12px -2px rgb(126 34 206 / 40%),
    inset 0 1px 0 rgb(255 255 255 / 15%);
  transition:
    transform 0.12s,
    box-shadow 0.15s;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 8px 20px -4px rgb(126 34 206 / 50%),
    inset 0 1px 0 rgb(255 255 255 / 15%);
}

.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}

.footer {
  position: relative;
  z-index: 1;
  padding: 20px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #6b5b80;
}

.footer-links {
  display: flex;
  gap: 16px;
}

.footer-links a {
  color: #6b5b80;
  text-decoration: none;
}

.footer-links a:hover {
  color: #7e22ce;
}

@media (width <= 640px) {
  .topbar,
  .footer {
    padding: 16px 20px;
  }

  .login-card {
    padding: 28px 24px;
  }

  .title {
    font-size: 28px;
  }

  .footer {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .primary-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
