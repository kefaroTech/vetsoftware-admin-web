import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'

export function permissionGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const requiredPermission = to.meta.permission as string | undefined
  if (!requiredPermission) return next()

  const authStore = useAuthStore()
  if (!authStore.hasPermission(requiredPermission)) {
    return next({ name: 'dashboard' })
  }

  next()
}
