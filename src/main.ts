import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { startTelemetry } from '@/services/telemetry/telemetry'
import vuetify from './plugins/vuetify'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import './assets/styles/tokens.css'
import './assets/styles/base.css'
import './assets/styles/primitives.css'
import './assets/styles/app.css'

const app = createApp(App)
app.use(createPinia()).use(router).use(vuetify)

// Si hay sesión al arrancar, rehidratamos los permisos (GET /auth/me) antes de montar
// para que el permissionGuard tenga datos frescos en la primera navegación. Montamos
// igual aunque /auth/me falle (el interceptor 401 se encarga del redirect).
const authStore = useAuthStore()
if (authStore.isAuthenticated) {
  authStore.fetchMe().finally(() => app.mount('#app'))
} else {
  app.mount('#app')
}

// TR-05: despues de montar y en un chunk aparte, para no entrar en la ruta critica que mide
// el presupuesto de bundle. Si no hay colector configurado, no descarga nada.
void startTelemetry()
