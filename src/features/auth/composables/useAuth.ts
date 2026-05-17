import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { authApi } from '../api/auth.api'
import { ROUTE_NAMES } from '@/constants/routes'
import type { LoginCommand } from '../types/auth.types'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  async function login(payload: LoginCommand) {
    const { data } = await authApi.login(payload)
    authStore.setToken(data.token)
    await router.push({ name: ROUTE_NAMES.DASHBOARD })
  }

  function logout() {
    authStore.logout()
    window.location.assign('/login')
  }

  return { login, logout, isAuthenticated: authStore.isAuthenticated }
}
