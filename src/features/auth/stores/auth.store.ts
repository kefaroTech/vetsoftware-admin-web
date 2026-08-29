import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storageService, type AuthSession } from '@/services/storage/storage.service'
import { setRefreshHandler, setSessionClearHandler } from '@/services/http/http.client'
import { authApi } from '../api/auth.api'
import { decodeJwt } from '../utils/jwt'
import type { AuthSubjectType, MeResponse } from '../types/auth.types'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(storageService.getSession())
  const permissions = ref<string[]>([])
  /**
   * La identidad del usuario en sesión, tal y como la declara `GET /auth/me`.
   *
   * <p>Se guardaba solo `permissions` y se tiraba el resto, así que **el nombre
   * de quien está operando no existía en ninguna parte del cliente**: el JWT
   * solo trae `sub`, y con un identificador numérico no se puede escribir «Firma
   * Ana Ruiz» al lado del botón que condona una deuda. Ese es el único consumidor
   * nuevo (`SignedActionModal`, D-06); `permissions` se conserva aparte porque lo
   * lee `hasPermission` en cada guarda y no conviene encadenarlo a un opcional.
   */
  const me = ref<MeResponse | null>(null)

  const token = computed<string | null>(() => session.value?.token ?? null)
  const claims = computed(() => (session.value ? decodeJwt(session.value.token) : null))
  const userId = computed<number | null>(() => {
    const sub = claims.value?.sub
    if (!sub) return null
    const id = Number(sub)
    return Number.isFinite(id) ? id : null
  })
  // La sesión persistida manda sobre el JWT: el backend la declara en `TokenResponse.type`.
  const userType = computed<AuthSubjectType | null>(
    () => session.value?.type ?? claims.value?.type ?? null,
  )
  const isAuthenticated = computed(() => session.value !== null)

  // `exp` del JWT en milisegundos (el claim viene en segundos epoch).
  const expiresAt = computed<number | null>(() =>
    claims.value?.exp ? claims.value.exp * 1000 : null,
  )
  // Expiración proactiva en cliente: permite expulsar/refrescar sin esperar al 401.
  const isExpired = computed<boolean>(
    () => expiresAt.value !== null && Date.now() >= expiresAt.value,
  )

  /**
   * Persiste la sesión tras un login o una rotación.
   *
   * Ya no recibe el refresh token: el backend lo emite en una cookie HttpOnly
   * que este código no puede leer ni necesita. Aquí solo queda el access token.
   */
  function setSession(next: AuthSession) {
    storageService.setSession(next)
    session.value = next
  }

  /** Limpia sesión y storage sin redirigir (útil para expiración proactiva vía router). */
  function clearSession() {
    // Conserva preferencias y el aviso SESSION_REPLACED; solo elimina credenciales de auth.
    storageService.clearSession()
    session.value = null
    permissions.value = []
    me.value = null
  }

  /** Hidrata los permisos del usuario actual desde `GET /auth/me` (SYSTEM_USER o EMPLOYEE). */
  async function fetchMe() {
    if (!token.value) return
    try {
      const data = await authApi.me()
      me.value = data
      permissions.value = data.permissions ?? []
    } catch {
      // token inválido/expirado → el interceptor 401 (o el guard) hará el redirect.
      me.value = null
      permissions.value = []
    }
  }

  function hasPermission(permission: string) {
    return userType.value === 'SYSTEM_USER' || permissions.value.includes(permission)
  }

  // Single-flight: varias requests 401 concurrentes comparten un único /auth/refresh.
  let refreshInFlight: Promise<string | null> | null = null

  /**
   * Rota el refresh token y actualiza la sesión; devuelve el nuevo access token
   * o null.
   *
   * Ya no comprueba antes si hay refresh token: vive en una cookie HttpOnly y
   * este código no puede verla. La ausencia se resuelve en el servidor, que
   * responde 401 y aquí acaba en `clearSession()`. Un viaje de red de más en el
   * único caso en que la sesión ya estaba perdida.
   */
  async function refreshSession(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight
    refreshInFlight = authApi
      .refresh()
      .then((tokens) => {
        setSession({ token: tokens.token, type: tokens.type })
        return tokens.token
      })
      .catch(() => {
        clearSession()
        return null
      })
      .finally(() => {
        refreshInFlight = null
      })
    return refreshInFlight
  }

  // El interceptor de axios usa este handler para refrescar ante un 401 TOKEN_EXPIRED.
  setRefreshHandler(refreshSession)
  // Y este otro para limpiar el store cuando el refresh no fue posible y hay que
  // forzar el logout: sin él, `session` y `permissions` sobreviven al redirect
  // duro y `isAuthenticated` sigue en `true` con un token que el backend ya rechazó.
  setSessionClearHandler(clearSession)

  async function logout() {
    // Logout server-side (best-effort): revoca los refresh tokens. Limpiamos local igual.
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    // Vaciado total solo en el logout explícito: una expiración no debe llevarse
    // las preferencias ni el aviso de sesión desplazada.
    //
    // Aquí `clearAll()` y no `clearVolatile()`, y la asimetría con el front del
    // tenant es deliberada: la consola no tiene ninguna preferencia de
    // dispositivo que conservar —solo existen `AUTH_STORAGE_KEY` y
    // `SESSION_REPLACED_NOTICE_KEY`, las dos dentro de `storageService`—, así que
    // puede permitirse la limpieza más fuerte, que además se lleva
    // `sessionStorage` (donde vive el identificador de sesión de Faro) en un
    // puesto compartido. El tenant usa `clearVolatile()` porque debe preservar
    // `vetrina:receipt-width`, que es del equipo y no del usuario. Cada front usa
    // la limpieza más fuerte que puede permitirse; esto NO es deriva TR-02.
    //
    // Este logout es hoy el ÚNICO llamador de `clearAll()` en los dos fronts: si
    // alguien lo da por muerto y lo retira del servicio gemelo, se lleva por
    // delante esta limpieza.
    clearSession()
    storageService.clearAll()
  }

  return {
    session,
    token,
    permissions,
    me,
    userId,
    userType,
    isAuthenticated,
    expiresAt,
    isExpired,
    setSession,
    fetchMe,
    hasPermission,
    clearSession,
    logout,
  }
})
