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
    /**
     * Empresa objetivo de una escritura o lectura que un `SystemUserContext`
     * ejecuta sobre el contrato de un tercero (docs/ux/suscripciones-consola-
     * especificacion.md §1.1/§2, tarea W1-A). El backend resuelve la empresa
     * de un system user leyendo la cabecera `X-Company-Id`
     * (`Authz.requiredSystemCompanyId()`, `Authz.java:155-175`) y lanza si
     * falta.
     *
     * El envío es CONDICIONAL —solo viaja si el llamador pasa este campo— y
     * EXPLÍCITO: nunca se infiere de un store "empresa activa" ni de ningún
     * otro estado global. La especificación lo dice sin rodeos: una cabecera
     * invisible que cambia el destinatario de una escritura es el mecanismo
     * con el que se cancela el contrato equivocado. Quien pasa `companyId` lo
     * hace porque la pantalla que lo invoca ya hace visible de qué empresa se
     * trata —el expediente del contrato (W2-A)—, nunca un valor recordado
     * entre pantallas.
     *
     * El front del tenant nunca necesita esto: su empresa la resuelve el
     * backend a partir del `EmployeeContext` del token, nunca de esta
     * cabecera —solo un `SystemUserContext` la exige—. El campo viaja aquí de
     * todos modos porque este archivo es gemelo TR-02 byte a byte con el de
     * la consola de plataforma: mantenerlo como código compartido con una
     * rama inerte en el tenant cuesta menos que declarar una cuarta
     * divergencia permitida y tener que justificarla en cada auditoría de
     * paridad (ver CLAUDE.md, "Los dos fronts son independientes, pero se
     * escriben igual").
     */
    companyId?: number

    /**
     * <b>Punto de extensión D-91 · el motivo del acceso de soporte. NO existe
     * todavía, y su ausencia es deliberada.</b>
     *
     * `models/modelo-datos-suscripciones.html` (D-91) decidió que soporte SÍ
     * puede entrar en la cuenta de un cliente, pero que queda constancia de
     * quién entró, a qué clínica, cuándo y **por qué motivo** — y que se
     * auditan también las LECTURAS. Hoy no queda ninguna: con la cabecera de
     * arriba, un usuario de plataforma lee la historia clínica y la cartera de
     * cualquier empresa sin dejar rastro. La propia fuente lo llama la
     * exposición mayor del sistema.
     *
     * **El backend todavía no acepta ningún motivo.** La única cabecera de
     * ámbito que lee es `COMPANY_SCOPE_HEADER` (`Authz.java:19`); no hay
     * ninguna constante de motivo en `src/main/java`, y `api/openapi.json` no
     * declara más cabecera de petición que `X-Webhook-Signature` (comprobado el
     * 27-08-2026). Por eso aquí no hay campo, y no lo hay a propósito:
     * inventarle un nombre a la cabecera sería peor que no mandarla, porque la
     * pantalla pediría un motivo que el borde descarta y el operador creería
     * que queda registrado cuando no queda nada.
     *
     * Cuando el backend lo publique —seguimiento en
     * kefaroTech/vetsoftware-backend#634— el cambio es de dos líneas: se
     * declara el campo aquí y se añade su `headers.set(...)` junto al de
     * `COMPANY_ID_HEADER`, en el mismo interceptor y con la MISMA regla —
     * condicional y explícito, nunca inferido de un store—. Y quien lo haga
     * tiene que pedir el motivo en la pantalla que abre el expediente, no
     * rellenarlo por defecto: un motivo automático no es constancia de nada.
     */
  }
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
    _loaderPushed?: boolean
    _networkRetries?: number
    companyId?: number
  }
}

/** Nombre exacto de la cabecera que exige `Authz.requiredSystemCompanyId()` (backend, `Authz.java:19`). */
export const COMPANY_ID_HEADER = 'X-Company-Id'

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

/**
 * Issue #215 · `withBranchBody` (features/branches) lee la sede activa de forma
 * SÍNCRONA: si una escritura sale antes de que vuelva /auth/me + el listado de
 * sedes, el cuerpo viaja sin `branchId` y el backend responde 400 a quien tiene
 * más de una sede. Cerrarlo en 21 llamadores (9 ficheros de API) es el cambio
 * donde uno se queda sin migrar; se cierra aquí, en el único punto por el que
 * pasa toda petición.
 *
 * La marca NO puede vivir en un WeakSet por identidad (así vivía antes, y
 * estaba inerte): axios clona el cuerpo en `mergeConfig` — `getMergedValue`
 * cae en `utils.merge({}, source)` para todo objeto plano, ANTES de que corra
 * este interceptor — así que `config.data` nunca es el mismo objeto que
 * `withBranchBody` marcó. Comprobado contra el axios instalado (1.19.0):
 * `merged.data === original` da `false`.
 *
 * La marca vive en un SÍMBOLO propio del cuerpo, y un símbolo SÍ sobrevive a
 * ese clon: `utils.merge` de axios copia explícitamente los símbolos
 * enumerables del origen, además de las claves de cadena (comprobado contra
 * el axios instalado). Y un símbolo tiene una garantía extra que una cadena no
 * tendría: `JSON.stringify` nunca serializa claves de símbolo, así que ni
 * siquiera un fallo en el borrado de abajo dejaría la marca viajando en el
 * cuerpo — aun así se borra explícitamente de `config.data` para no dejarla
 * ni un instante en el objeto que ven otros interceptores.
 *
 * La marca en el objeto ORIGINAL (el que se queda en manos de `withBranchBody`
 * y su llamador) se retira ella sola, en el siguiente microtask:
 * `mergeConfig` corre de forma SÍNCRONA dentro de la llamada a `http.post(...)`
 * (antes del primer `await` de `Axios.prototype.request`), así que para cuando
 * el microtask se ejecuta, la copia ya existe con el símbolo dentro. El
 * llamador nunca observa la marca.
 */
const PENDING_BRANCH_BODY = Symbol('pendingBranchBody')

/** Llamado por `withBranchBody`. No se importa el store aquí para no crear el
 *  ciclo store → http.client → store: quien construye el cuerpo solo necesita
 *  marcarlo, no resolver la sede. */
export function markPendingBranchBody(body: object): void {
  const marked = body as Record<symbol, boolean>
  marked[PENDING_BRANCH_BODY] = true
  void Promise.resolve().then(() => {
    Reflect.deleteProperty(marked, PENDING_BRANCH_BODY)
  })
}

// Handler de resolución de sede, inyectado por `branch.store.ts` — mismo patrón
// y mismo motivo que `refreshHandler`/`sessionClearHandler`. Debe deduplicar
// llamadas concurrentes (el store ya lo hace) y devolver la sede activa una vez
// resuelta, o `null` si el usuario no tiene ninguna operable.
type BranchResolver = () => Promise<number | null>
let branchResolver: BranchResolver | null = null
export function setBranchResolver(resolver: BranchResolver) {
  branchResolver = resolver
}

http.interceptors.request.use(async (config) => {
  const token = storageService.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)

  // Condicional y explícito (ver el doc de `companyId` arriba): solo viaja si
  // ESTA petición lo pasó, nunca por defecto.
  if (config.companyId != null) config.headers.set(COMPANY_ID_HEADER, String(config.companyId))

  // Excluye por construcción las peticiones de las que depende la propia
  // resolución (/auth/me, el listado de sedes): ninguna de las dos pasa por
  // `withBranchBody`, así que nunca quedan marcadas y jamás esperan a sí mismas.
  if (
    branchResolver &&
    config.data &&
    typeof config.data === 'object' &&
    (config.data as Record<symbol, boolean>)[PENDING_BRANCH_BODY]
  ) {
    const data = config.data as Record<string | symbol, unknown>
    Reflect.deleteProperty(data, PENDING_BRANCH_BODY)
    const id = await branchResolver()
    config.data = id != null ? { ...data, branchId: id } : data
  }

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
 *
 * El discriminador es si HUBO respuesta, no si `error.message` tiene contenido:
 * axios rellena `error.message` incluso cuando la petición nunca llegó a
 * completarse (`"Network Error"`, sin traducir, ante una caída de red), así que
 * usarlo como señal tapaba el `fallback` del llamador justo en el caso para el
 * que se escribió. Con respuesta pero sin `ProblemDetail` en el cuerpo,
 * `error.message` sí aporta algo real y se conserva.
 */
export function getProblemDetailMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (error instanceof AxiosError && error.response) {
    const pd = error.response.data as ProblemDetail | undefined
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
