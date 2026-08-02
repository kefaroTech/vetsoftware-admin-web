import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storageService } from '@/services/storage/storage.service'
import { setRefreshHandler } from '@/services/http/http.client'
import { authApi } from '../api/auth.api'
import { decodeJwt } from '../utils/jwt'

export type UserType = 'EMPLOYEE' | 'SYSTEM_USER'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(storageService.getToken())
  const refreshToken = ref<string | null>(storageService.getRefreshToken())
  const permissions = ref<string[]>([])

  const payload = computed(() => (token.value ? decodeJwt(token.value) : null))
  const userId = computed<number | null>(() => {
    const sub = payload.value?.sub
    if (!sub) return null
    const id = Number(sub)
    return Number.isFinite(id) ? id : null
  })
  const userType = computed<UserType | null>(() => payload.value?.type ?? null)
  const isAuthenticated = computed(() => !!token.value)

  // Expiración proactiva en cliente: el `exp` del JWT viene en segundos epoch.
  const isExpired = computed<boolean>(() => {
    const exp = payload.value?.exp
    return typeof exp === 'number' && Date.now() >= exp * 1000
  })

  function setToken(newToken: string) {
    token.value = newToken
    storageService.setToken(newToken)
  }

  /** Persiste el par access + refresh (login y rotación). */
  function setSession(newToken: string, newRefreshToken: string) {
    token.value = newToken
    refreshToken.value = newRefreshToken
    storageService.setToken(newToken)
    storageService.setRefreshToken(newRefreshToken)
  }

  function clearSession() {
    token.value = null
    refreshToken.value = null
    permissions.value = []
    storageService.clearAll()
  }

  /** Hidrata los permisos del usuario actual desde `GET /auth/me` (SYSTEM_USER o EMPLOYEE). */
  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await authApi.me()
      permissions.value = data.permissions ?? []
    } catch {
      // token inválido/expirado → el interceptor 401 (o el guard) hará el redirect.
      permissions.value = []
    }
  }

  function hasPermission(permission: string) {
    return userType.value === 'SYSTEM_USER' || permissions.value.includes(permission)
  }

  // Single-flight: varias requests 401 concurrentes comparten un único /auth/refresh.
  let refreshInFlight: Promise<string | null> | null = null

  /** Rota el refresh token y actualiza la sesión; devuelve el nuevo access token o null. */
  async function refreshSession(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight
    const current = refreshToken.value
    if (!current) return null
    refreshInFlight = authApi
      .refresh(current)
      .then(({ data }) => {
        setSession(data.token, data.refreshToken)
        return data.token
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

  async function logout() {
    // Logout server-side (best-effort): revoca los refresh tokens. Limpiamos local igual.
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    clearSession()
  }

  return {
    token,
    refreshToken,
    permissions,
    userId,
    userType,
    isAuthenticated,
    isExpired,
    setToken,
    setSession,
    fetchMe,
    hasPermission,
    clearSession,
    logout,
  }
})
