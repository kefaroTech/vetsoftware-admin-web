import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { authApi } from '../api/auth.api'
import { ROUTE_NAMES } from '@/constants/routes'
import type { LoginCommand } from '../types/auth.types'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()
  // `storeToRefs` y no `authStore.isAuthenticated`: Pinia desenvuelve el
  // computed al leerlo, así que devolverlo directo entrega un booleano
  // CONGELADO —el valor que tenía en el momento de llamar a `useAuth()`— y
  // ningún consumidor se entera del login ni del logout.
  const { isAuthenticated } = storeToRefs(authStore)

  async function login(payload: LoginCommand) {
    const { data } = await authApi.login(payload)
    authStore.setSession(data.token)
    // Hidrata permisos antes de navegar para que el permissionGuard tenga datos frescos.
    await authStore.fetchMe()
    await router.push({ name: ROUTE_NAMES.DASHBOARD })
  }

  async function logout() {
    await authStore.logout()
    window.location.assign('/login')
  }

  return { login, logout, isAuthenticated }
}
