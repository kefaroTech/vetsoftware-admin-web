import axios, { AxiosError } from 'axios'
import { storageService } from '@/services/storage/storage.service'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'
import type { ProblemDetail } from '@/types/api.types'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Marca interna: la request ya se reintentó tras un refresh (evita bucles). */
    _retry?: boolean
  }
}

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

/** Limpia el token y fuerza el ir a login (hard redirect). Usado cuando el refresh no es posible. */
function redirectToLogin() {
  storageService.removeToken()
  storageService.removeRefreshToken()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// Handler de refresh registrado por el store de auth (evita ciclo http.client ↔ store).
// Devuelve el nuevo access token, o `null` si el refresh falló.
type RefreshHandler = () => Promise<string | null>
let refreshHandler: RefreshHandler | null = null
export function setRefreshHandler(handler: RefreshHandler) {
  refreshHandler = handler
}

http.interceptors.request.use((config) => {
  const token = storageService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  pushLoader()
  return config
})

http.interceptors.response.use(
  (response) => {
    popLoader()
    return response
  },
  async (error: AxiosError<ProblemDetail>) => {
    popLoader()
    const status = error.response?.status
    const original = error.config
    const url = original?.url ?? ''
    const isAuthCall =
      url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')

    if (status === 401 && original && !isAuthCall) {
      const code = (error.response?.data as ProblemDetail | undefined)?.code
      if (code === 'TOKEN_EXPIRED' && !original._retry && refreshHandler) {
        original._retry = true
        const newToken = await refreshHandler()
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`
          return http(original)
        }
      }
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

export function getProblemDetailMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (error instanceof AxiosError) {
    const pd = error.response?.data as ProblemDetail | undefined
    if (pd?.detail) return pd.detail
    if (pd?.title) return pd.title
    if (error.message) return error.message
  }
  return fallback
}
