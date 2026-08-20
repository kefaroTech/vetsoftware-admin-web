import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { authApi } from '../api/auth.api'
import { ROUTE_NAMES } from '@/constants/routes'
import type { LoginCommand } from '../types/auth.types'

/**
 * Ruta interna a la que volver tras autenticar (el `?redirect=` de la URL de
 * login), o `null` si `value` no es una ruta interna válida.
 *
 * Solo se acepta una ruta de la propia SPA. Sin este filtro, `?redirect=`
 * sería un open redirect: quien controla el enlace de login legítimo —el
 * dominio real, con TLS válido— decide a dónde aterriza el usuario tras
 * autenticarse.
 *
 *  - Debe empezar por "/": descarta cualquier URL absoluta (`https://evil.com`).
 *  - No puede empezar por "//": el navegador la resuelve como protocol-relative
 *    contra el host que siga, es decir, otro dominio (`//evil.com`).
 *  - No puede contener ":": descarta un esquema explícito en medio de la ruta
 *    (`/x:javascript:alert(1)`, `/\evil.com`) y cualquier URL con puerto o
 *    esquema disfrazada de ruta.
 */
export function sanitizeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.includes(':')) return null
  return value
}

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()
  // `storeToRefs` y no `authStore.isAuthenticated`: Pinia desenvuelve el
  // computed al leerlo, así que devolverlo directo entrega un booleano
  // CONGELADO —el valor que tenía en el momento de llamar a `useAuth()`— y
  // ningún consumidor se entera del login ni del logout.
  const { isAuthenticated } = storeToRefs(authStore)

  async function login(payload: LoginCommand) {
    const data = await authApi.login(payload)
    authStore.setSession({ token: data.token, type: data.type })
    // Hidrata permisos antes de navegar para que el permissionGuard tenga datos frescos.
    await authStore.fetchMe()
    const redirect = sanitizeRedirect(route.query.redirect)
    await router.push(redirect ?? { name: ROUTE_NAMES.DASHBOARD })
  }

  async function logout() {
    await authStore.logout()
    window.location.assign('/login')
  }

  return { login, logout, isAuthenticated }
}
