import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { storageService } from '@/services/storage/storage.service'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'
import type { ProblemDetail } from '@/types/api.types'
import { createApiBaseUrl } from './api-base-url'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Marca interna: la request ya se reintentó tras un refresh (evita bucles). */
    _retry?: boolean
    /** Marca interna: esta request incrementó el loader y debe decrementarlo una sola vez. */
    _loaderPushed?: boolean
    /** Marca interna: reintentos por fallo de red o 5xx ya consumidos. */
    _networkRetries?: number
  }
}

/**
 * Sin timeout, una petición que nunca resuelve deja el contador del loader
 * incrementado para siempre: el velo de carga se queda puesto y la única salida
 * es recargar la página. Con wifi compartido —el escenario normal de una
 * clínica— eso no es un caso de borde.
 *
 * 20 s es holgado para cualquier operación de este panel: son todas CRUD contra
 * la API, sin subidas de archivo ni descargas de informes ni transmisión a la
 * DIAN (eso vive en el front operativo, que sí necesita excepciones por llamada).
 */
export const DEFAULT_TIMEOUT_MS = 20_000

/** Reintentos ante fallo de red o 5xx, solo para GET. */
const MAX_NETWORK_RETRIES = 2
const RETRY_BACKOFF_MS = 300

export const http = axios.create({
  baseURL: createApiBaseUrl(import.meta.env.VITE_API_URL),
  headers: { 'Content-Type': 'application/json' },
  timeout: DEFAULT_TIMEOUT_MS,
  // El refresh token viaja en una cookie HttpOnly que emite el backend, así que
  // el navegador tiene que adjuntarla en /auth/refresh y /auth/logout. Sin esto
  // la cookie ni siquiera se guarda: en una petición cross-origin, el navegador
  // descarta Set-Cookie salvo que la petición se hiciera con credenciales.
  // El backend ya responde con Access-Control-Allow-Credentials y una lista
  // explícita de orígenes, que es lo que este flag exige.
  withCredentials: true,
})

/** Limpia el token y fuerza el ir a login (hard redirect). Usado cuando el refresh no es posible. */
function redirectToLogin() {
  storageService.removeToken()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// Handler de refresh registrado por el store de auth (evita ciclo http.client ↔ store).
// Devuelve el nuevo access token, o `null` si el refresh falló.
//
// Contrato: DEBE persistir el token nuevo antes de resolver. El reintento vuelve
// a pasar por el interceptor de request, que relee el token del storage; si el
// handler resolviera sin persistir, la petición se reintentaría con el token
// viejo y volvería a dar 401.
type RefreshHandler = () => Promise<string | null>
let refreshHandler: RefreshHandler | null = null
export function setRefreshHandler(handler: RefreshHandler) {
  refreshHandler = handler
}

http.interceptors.request.use((config) => {
  const token = storageService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  pushLoader()
  config._loaderPushed = true
  return config
})

/**
 * Decrementa el loader exactamente una vez por petición que lo incrementó. La
 * marca vive en la config, no en el interceptor, para que el reintento —que
 * vuelve a pasar por el interceptor de request— quede balanceado y para que un
 * error sin `config` (rechazo antes de enviar) no decremente lo que nunca subió.
 */
function releaseLoader(config: InternalAxiosRequestConfig | undefined): void {
  if (!config?._loaderPushed) return
  config._loaderPushed = false
  popLoader()
}

/**
 * Un GET es idempotente, así que reintentarlo es seguro y tapa el corte de red
 * momentáneo. Lo que NO se reintenta es el timeout: hacerlo multiplicaría por
 * tres el tiempo que la interfaz pasa bloqueada, que es justo lo que este
 * cambio viene a evitar.
 */
function shouldRetry(error: AxiosError, config: InternalAxiosRequestConfig): boolean {
  if (config.method?.toLowerCase() !== 'get') return false
  if ((config._networkRetries ?? 0) >= MAX_NETWORK_RETRIES) return false
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) return false
  const status = error.response?.status
  return status === undefined || status >= 500
}

http.interceptors.response.use(
  (response) => {
    releaseLoader(response.config)
    return response
  },
  async (error: AxiosError<ProblemDetail>) => {
    const original = error.config
    releaseLoader(original)

    // Cancelación deliberada del llamador: no es un fallo de la aplicación.
    if (axios.isCancel(error)) return Promise.reject(error)

    if (original && shouldRetry(error, original)) {
      const attempt = (original._networkRetries ?? 0) + 1
      original._networkRetries = attempt
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * 2 ** (attempt - 1)))
      return http(original)
    }

    const status = error.response?.status
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
