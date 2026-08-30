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
  // siempre al home — pero SOLO el `path`, nunca la cadena de consulta.
  // `to` nunca es la propia ruta de login: es pública y ya se resolvió en el
  // `if` de arriba, así que `to.path` siempre es la ruta protegida a la que el
  // usuario quería llegar, nunca un `/login` anidado.
  //
  // La cadena de consulta ya ha transportado un secreto real en este producto
  // (el token de restablecer contraseña, el de aceptar/aprobar invitación, el
  // de recuperar una propuesta — todos bajo el nombre `token`). Reenviarla tal
  // cual aquí la republica en la barra de direcciones, en el historial del
  // navegador y en el `Referer` de lo próximo que el usuario visite tras
  // autenticar: exactamente el escenario en que el equipo puede estar
  // compartido o la pantalla proyectada.
  //
  // Un allowlist de parámetros "seguros" (pestaña, filtro, página) no cierra
  // el riesgo: un guard de router es infraestructura genérica sin visibilidad
  // de qué feature usa qué nombre de parámetro, y nada impide que la próxima
  // pantalla llame a su secreto `code`, `ref` o `key` en vez de `token`.
  // Perder una pestaña o un filtro en el caso excepcional de una sesión
  // expirada es una degradación menor y acotada; un secreto reexpuesto en la
  // URL de login no lo es. Si una pantalla concreta necesita sobrevivir a
  // esto, que persista su propio estado (store, `sessionStorage`) — no lo
  // intentes aquí, en el único punto que ve TODAS las navegaciones de la app.
  //
  // Es el mismo recorte que hace `redirectToLogin()` en `http.client.ts` para
  // el mecanismo hermano (la redirección dura del interceptor de 401). Los dos
  // tienen que recortar: cerrar uno solo deja la puerta abierta a medias.
  if (!authStore.token) return next({ name: ROUTE_NAMES.LOGIN, query: { redirect: to.path } })

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
