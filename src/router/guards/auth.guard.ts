import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useNotification } from '@/composables/useNotification'
import { ROUTE_NAMES } from '@/constants/routes'

export function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const isPublic = to.meta.public === true
  const authStore = useAuthStore()

  if (isPublic) return next()
  if (!authStore.token) return next({ name: ROUTE_NAMES.LOGIN })

  // Access vencido y SIN refresh token → no se puede renovar: limpiamos y avisamos.
  // Con refresh token dejamos pasar: el primer 401 dispara el refresh transparente.
  if (authStore.isExpired && !authStore.refreshToken) {
    authStore.clearSession()
    useNotification().notify('Sesión expirada, vuelve a iniciar sesión.', 'warning')
    return next({ name: ROUTE_NAMES.LOGIN })
  }

  next()
}
