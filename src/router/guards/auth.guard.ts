import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ROUTE_NAMES } from '@/constants/routes'

export function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const isPublic = to.meta.public === true
  const authStore = useAuthStore()

  if (isPublic) return next()
  // Conserva el destino para volver ahí tras autenticar, en vez de mandar
  // siempre al home. `to` nunca es la propia ruta de login: es pública y ya
  // se resolvió en el `if` de arriba, así que `fullPath` siempre es la ruta
  // protegida a la que el usuario quería llegar, nunca un `/login` anidado.
  if (!authStore.token) return next({ name: ROUTE_NAMES.LOGIN, query: { redirect: to.fullPath } })

  // Con el access vencido se deja pasar igualmente: el refresh token vive en una
  // cookie HttpOnly y este código no puede comprobar si existe. El primer 401
  // dispara el refresh transparente, y si no hay cookie el backend responde 401
  // otra vez y el interceptor manda a login limpiando la sesión.
  //
  // Antes se decidía aquí leyendo el refresh token de localStorage. Perder esa
  // comprobación cuesta una petición en el caso de sesión ya muerta, y a cambio
  // el refresh deja de ser legible por cualquier script de la página.
  next()
}
