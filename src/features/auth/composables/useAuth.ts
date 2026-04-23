import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { authApi } from '../api/auth.api'
import { ROUTE_NAMES } from '@/constants/routes'
import { useNotification } from '@/composables/useNotification'
import type { LoginCommand } from '../types/auth.types'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()
  const { notify } = useNotification()

  async function login(payload: LoginCommand) {
    const { data } = await authApi.login(payload)
    authStore.setToken(data.token)
    await router.push({ name: ROUTE_NAMES.DASHBOARD })
  }

  async function logout() {
    authStore.logout()
    notify('Sesión cerrada', 'info')
    await router.push({ name: ROUTE_NAMES.LOGIN })
  }

  return { login, logout, isAuthenticated: authStore.isAuthenticated }
}
