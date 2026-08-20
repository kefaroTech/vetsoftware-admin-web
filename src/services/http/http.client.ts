import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'
import { storageService } from '@/services/storage/storage.service'
import type { ProblemDetail } from '@/types/api.types'
import { createApiBaseUrl } from './api-base-url'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Deja pasar la petición sin velo de carga. Solo para lo que sería invasivo
     * bloquear: búsqueda con debounce, polling, validación en vivo. Por omisión
     * el loader está activo.
     */
    skipGlobalLoader?: boolean
    /** Marca interna: la request ya se reintentó tras un refresh (evita bucles). */
    _retry?: boolean
    /** Marca interna: esta request incrementó el loader y debe decrementarlo una sola vez. */
    _loaderPushed?: boolean
    /** Marca interna: reintentos ya consumidos ante fallo de red o 5xx. */
    _networkRetries?: number
  }
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
    _loaderPushed?: boolean
    _networkRetries?: number
  }
}

/**
 * Sin timeout, una petición que nunca resuelve deja el contador del loader
 * incrementado para siempre: el velo se queda puesto y la única salida es
 * recargar la página. Con wifi compartido —el escenario normal de una clínica—
 * eso no es un caso de borde.
 *
 * 20 s es holgado para el CRUD de la aplicación, pero NO para todo: hay
 * operaciones cuyo presupuesto en el servidor es legítimamente mayor, y esas
 * pasan su propio `timeout` por llamada. Un timeout global corto sobre ellas no
 * protegería al usuario: abortaría la petición en el navegador mientras el
 * backend sigue trabajando, dejándolo sin el resultado de algo que sí ocurrió.
 */
export const DEFAULT_TIMEOUT_MS = 20_000

// --- Presupuestos por llamada propios de esta aplicación ---------------------
// El resto de este archivo se mantiene idéntico en los dos fronts (TR-02); este
// bloque es el único punto donde cada uno declara lo suyo. Esta consola no tiene
// ninguno: son todas operaciones CRUD contra la API, sin subidas de archivo,
// descargas de informes ni transmisión a la DIAN — eso vive en el front operativo,
// que sí declara aquí `DIAN_TIMEOUT_MS` y `TRANSFER_TIMEOUT_MS`.
// -----------------------------------------------------------------------------

/** Reintentos ante fallo de red o 5xx, solo para GET. */
const MAX_NETWORK_RETRIES = 2
const RETRY_BACKOFF_MS = 300

export const http = axios.create({
  baseURL: createApiBaseUrl(import.meta.env.VITE_API_URL),
  headers: { 'Content-Type': 'application/json' },
  timeout: DEFAULT_TIMEOUT_MS,
  // El refresh token viaja en una cookie HttpOnly que emite el backend. Sin
  // credenciales, el navegador ni siquiera guarda el Set-Cookie de una respuesta
  // cross-origin, y /auth/refresh se quedaría sin nada que enviar. El backend ya
  // responde con Access-Control-Allow-Credentials y lista explícita de orígenes.
  withCredentials: true,
})

/**
 * Limpia la sesión y fuerza el ir a login (hard redirect). Usado cuando el
 * refresh no es posible.
 *
 * El store se limpia ANTES que el storage y de forma incondicional —igual que
 * `storageService.clearVolatile()` de la línea siguiente—, no solo cuando hay
 * recarga dura: si dependiera del `if` de abajo, un 401 llegando mientras el
 * usuario ya está en `/login` dejaría los refs del store de auth reportando
 * `isAuthenticated === true` con un token que el backend acaba de rechazar,
 * sin ninguna recarga que lo corrigiera.
 *
 * Conserva el destino en la URL de login (`?redirect=`) para que, tras
 * autenticar de nuevo, el usuario vuelva a donde iba y no siempre al home.
 */
function redirectToLogin() {
  sessionClearHandler?.()
  storageService.clearVolatile()
  if (window.location.pathname !== '/login') {
    const target = window.location.pathname + (window.location.search || '')
    window.location.href = `/login?redirect=${encodeURIComponent(target)}`
  }
}

// Handler de refresh registrado por el store de auth. Se inyecta así (en vez de importar el
// store aquí) para no crear un ciclo http.client ↔ store. Devuelve el nuevo access token, o
// `null` si el refresh falló. Debe deduplicar llamadas concurrentes (single-flight).
//
// Y debe persistir la sesión ANTES de resolver: el reintento vuelve a pasar por
// el interceptor de request, que relee el token del storage. Si resolviera sin
// persistir, la petición se reintentaría con el token viejo y volvería a dar 401.
type RefreshHandler = () => Promise<string | null>
let refreshHandler: RefreshHandler | null = null
export function setRefreshHandler(handler: RefreshHandler) {
  refreshHandler = handler
}

// Handler de limpieza de sesión registrado por el store de auth, con el mismo
// motivo y el mismo patrón que `refreshHandler`: este módulo no puede importar
// el store sin crear un ciclo http.client ↔ store, así que el store se inyecta
// a sí mismo aquí. Se invoca cuando el refresh no es posible y hay que forzar
// el logout — debe dejar los refs del store (`session`, `permissions`) tal como
// los deja `clearSession()`.
type SessionClearHandler = () => void
let sessionClearHandler: SessionClearHandler | null = null
export function setSessionClearHandler(handler: SessionClearHandler) {
  sessionClearHandler = handler
}

http.interceptors.request.use((config) => {
  const token = storageService.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)

  if (!config.skipGlobalLoader) {
    pushLoader()
    config._loaderPushed = true
  }
  return config
})

/**
 * Decrementa el loader exactamente una vez por petición que lo incrementó. La
 * marca vive en la config, no en el interceptor, por dos motivos: el reintento
 * vuelve a pasar por el interceptor de request y así queda balanceado, y un
 * error sin `config` —rechazo antes de enviar— ya no decrementa lo que nunca
 * subió, que era lo que podía retirar el velo con otra petición aún en vuelo.
 */
function releaseLoader(config: InternalAxiosRequestConfig | undefined): void {
  if (!config?._loaderPushed) return
  config._loaderPushed = false
  popLoader()
}

function isRetriableNetworkFailure(error: AxiosError): boolean {
  const status = error.response?.status
  if (status === undefined) return error.code !== 'ECONNABORTED'
  return status >= 500
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

http.interceptors.response.use(
  (response) => {
    releaseLoader(response.config)
    return response
  },
  async (error: AxiosError) => {
    const original = error.config
    releaseLoader(original)

    if (original && original.method?.toLowerCase() === 'get' && isRetriableNetworkFailure(error)) {
      const attempts = original._networkRetries ?? 0
      if (attempts < MAX_NETWORK_RETRIES) {
        original._networkRetries = attempts + 1
        await delay(RETRY_BACKOFF_MS * (attempts + 1))
        return http(original)
      }
    }

    const status = error.response?.status
    const url = original?.url ?? ''
    const code = getProblemDetailCode(error)

    if (status === 401 && code === 'SESSION_REPLACED') {
      storageService.setSessionReplacedNotice('Tu cuenta se inició en otro dispositivo.')
    }

    // Las llamadas de auth no entran al flujo de refresh (evita recursión).
    const isAuthCall =
      url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')

    if (status === 401 && original && !isAuthCall) {
      // Solo el access expirado se intenta refrescar; token inválido/revocado → a login.
      if (code === 'TOKEN_EXPIRED' && !original._retry && refreshHandler) {
        original._retry = true
        const newToken = await refreshHandler()
        if (newToken) {
          original.headers.set('Authorization', `Bearer ${newToken}`)
          return http(original)
        }
      }
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

/**
 * Identificador de la traza distribuida que corresponde a esta petición fallida (TR-05).
 *
 * <p>El backend ya hacía todo el trabajo: emite la cabecera `X-Trace-Id` en cada respuesta y la
 * declara en `exposedHeaders` del CORS **precisamente** para que este código pueda leerla. Nadie
 * la leía, así que cuando un veterinario reportaba «se quedó cargando», soporte no tenía forma de
 * encontrar la traza: el dato estaba a un acceso de distancia.
 *
 * <p><b>Este cliente ya no genera `traceparent`.</b> Lo hizo durante un tiempo (ver historial):
 * fabricaba también un span-id de padre al azar para completar la cabecera W3C, y ese span-id no
 * correspondía a ningún span real —no hay OpenTelemetry en el navegador, solo cuatro líneas de
 * `crypto.randomUUID()`. El backend, fiel al estándar, adoptaba esa traza y colgaba su propio
 * span de un padre que no existía en ningún proceso. Resultado verificado en Tempo: el 100 % de
 * las trazas del sistema quedaban sin raíz (`rootTraceName: null`). Se decidió revertirlo:
 * ahora el backend es quien origina la traza. La contrapartida, aceptada a sabiendas, es que una
 * petición que muere sin respuesta —timeout, red caída— vuelve a no tener ningún identificador
 * que mostrar, porque no hay `X-Trace-Id` ni `ProblemDetail` de los que sacarlo. Antes de
 * reintroducir la generación en el cliente, resolver primero cómo evitar el span huérfano.
 */
export function getTraceId(error: unknown): string | undefined {
  if (!(error instanceof AxiosError)) return undefined
  const header = error.response?.headers?.['x-trace-id']
  if (typeof header === 'string' && header.trim()) return header.trim()
  const pd = error.response?.data as ProblemDetail | undefined
  return pd?.traceId?.trim() || undefined
}

/**
 * Mensaje redactado por el backend en el `ProblemDetail`, o `fallback` si no hay
 * ninguno. Se prefiere siempre lo que dice el servidor: el texto fijo del
 * llamador describe la pantalla, no lo que falló.
 */
export function getProblemDetailMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (error instanceof AxiosError) {
    const pd = error.response?.data as ProblemDetail | undefined
    if (pd?.detail) return pd.detail
    if (pd?.title) return pd.title
    if (error.message) return error.message
  }
  return fallback
}

/** Código de negocio del `ProblemDetail` (`pd.code`), o `null` si no aplica. */
export function getProblemDetailCode(error: unknown): string | null {
  if (error instanceof AxiosError) {
    const pd = error.response?.data as ProblemDetail | undefined
    if (pd?.code) return pd.code
  }
  return null
}

/**
 * `true` si el backend respondió 409 por optimistic locking (`@Version`): dos
 * operaciones tocaron la misma entidad versionada a la vez. El llamador debería
 * recargar datos frescos y permitir reintentar sobre el estado actual.
 */
export function isConcurrencyConflict(error: unknown): boolean {
  return getProblemDetailCode(error) === 'CONCURRENT_MODIFICATION'
}

/**
 * `true` si el backend respondió 409 porque la cita se solapa con otra
 * (BE-17): la duración ahora bloquea el hueco, y dos agendamientos lo
 * disputaron a la vez. El llamador puede reintentar marcando un flag de
 * forzado para agendar igualmente pese al solape.
 */
export function isAppointmentOverlap(error: unknown): boolean {
  return getProblemDetailCode(error) === 'APPOINTMENT_OVERLAP'
}

/** Errores de validación por campo del `ProblemDetail`, indexados por nombre de campo. */
export function getProblemDetailFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof AxiosError)) return {}
  const pd = error.response?.data as ProblemDetail | undefined
  if (!pd?.errors) return {}
  return pd.errors.reduce<Record<string, string>>((acc, e) => {
    acc[e.field] = e.message
    return acc
  }, {})
}
