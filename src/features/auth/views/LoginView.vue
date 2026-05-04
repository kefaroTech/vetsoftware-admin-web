<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useAuth } from '../composables/useAuth'
import { useNotification } from '@/composables/useNotification'
import { ICONS } from '@/constants/icons'

const { login } = useAuth()
const { notify } = useNotification()

const code = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function handleSubmit() {
  if (!code.value.trim() || !password.value) {
    errorMessage.value = 'Ingresa tu código y contraseña.'
    return
  }
  errorMessage.value = null
  loading.value = true
  try {
    await login({ code: code.value.trim(), password: password.value })
  } catch {
    errorMessage.value = 'Credenciales inválidas. Verifica e intenta de nuevo.'
    notify('Código o contraseña incorrectos', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-shell">
    <div class="blob blob-tr" aria-hidden="true" />
    <div class="blob blob-bl" aria-hidden="true" />

    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">
          <Icon :icon="ICONS.PAW" width="16" height="16" />
        </div>
        <span class="brand-name">VetSoftware</span>
      </div>
      <div class="topbar-link">
        ¿Eres nuevo? <a href="#">Solicita acceso</a>
      </div>
    </header>

    <main class="login-main">
      <div class="login-card">
        <div class="eyebrow">Panel administrativo</div>
        <h1 class="title">Inicia sesión</h1>
        <p class="subtitle">Accede al panel para administrar VetSoftware.</p>

        <form class="form" novalidate @submit.prevent="handleSubmit">
          <div v-if="errorMessage" class="error-banner" role="alert">
            {{ errorMessage }}
          </div>

          <div class="field">
            <label for="login-code">Código de usuario</label>
            <div class="input-box" :class="{ 'has-error': !!errorMessage }">
              <Icon :icon="ICONS.USER" width="15" height="15" class="leading-icon" aria-hidden="true" />
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

          <div class="field">
            <label for="login-password">Contraseña</label>
            <div class="input-box" :class="{ 'has-error': !!errorMessage }">
              <Icon :icon="ICONS.LOCK" width="15" height="15" class="leading-icon" aria-hidden="true" />
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
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
                <Icon :icon="showPassword ? ICONS.EYE_OFF : ICONS.EYE" width="15" height="15" />
              </button>
            </div>
          </div>

          <button type="submit" class="primary-btn" :disabled="loading">
            <template v-if="loading">Iniciando…</template>
            <template v-else>
              Iniciar sesión
              <Icon :icon="ICONS.ARROW_RIGHT" width="14" height="14" aria-hidden="true" />
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
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at top, #f3e8ff 0%, #f5f1fa 50%, #ede8f4 100%);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
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
  background: radial-gradient(circle, rgba(192, 132, 252, 0.25), transparent 60%);
}
.blob-bl {
  bottom: -150px;
  left: -150px;
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.18), transparent 60%);
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
  color: #ffffff;
  box-shadow: 0 2px 6px -1px rgba(126, 34, 206, 0.4);
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
  background: #ffffff;
  border: 1px solid #ece5f4;
  border-radius: 16px;
  padding: 40px 44px;
  box-shadow:
    0 24px 48px -16px rgba(91, 33, 182, 0.18),
    0 4px 12px -4px rgba(91, 33, 182, 0.08);
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

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.error-banner {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  font-size: 12px;
  padding: 10px 12px;
  border-radius: 8px;
}

.field {
  display: flex;
  flex-direction: column;
}

.field label {
  font-size: 12px;
  font-weight: 600;
  color: #3d2e57;
  letter-spacing: 0.01em;
  margin-bottom: 6px;
}

.input-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #ece5f4;
  border-radius: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input-box:focus-within {
  border-color: #a855f7;
  box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.12);
}
.input-box.has-error {
  border-color: #dc2626;
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
  color: #a89bbd;
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
  color: #ffffff;
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
    0 4px 12px -2px rgba(126, 34, 206, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: transform 0.12s, box-shadow 0.15s;
}
.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 8px 20px -4px rgba(126, 34, 206, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
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

@media (max-width: 640px) {
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
