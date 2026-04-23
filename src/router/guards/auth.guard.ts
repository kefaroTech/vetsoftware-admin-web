import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { storageService } from '@/services/storage/storage.service'
import { ROUTE_NAMES } from '@/constants/routes'

export function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const isPublic = to.meta.public === true
  const token = storageService.getToken()

  if (isPublic) return next()
  if (!token) return next({ name: ROUTE_NAMES.LOGIN })

  next()
}
