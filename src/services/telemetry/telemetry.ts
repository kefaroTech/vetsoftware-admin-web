/**
 * Telemetría del navegador (TR-05, nivel 2).
 *
 * <p>El nivel 1 —`traceparent` en cada petición— hace que el servidor adopte el identificador
 * del navegador, así que un fallo ya se puede correlacionar con lo que ocurrió en el backend.
 * Lo que falta es el otro lado: cuánto tardó el *render*, si hubo reintentos, de qué pantalla
 * venía el usuario. Eso lo aporta Faro, que instrumenta el navegador y envía sus tramos al mismo
 * pipeline por el que ya viajan las trazas del servidor.
 *
 * <p><b>Se carga de forma diferida, y no es un detalle de estilo.</b> El presupuesto de
 * `check-bundle-budget.mjs` mide la ruta crítica —el *entry* y sus precargas—, que está al 81 %
 * de su techo. Faro y OTel web pesan más que el margen que queda, así que importarlos desde
 * `main.ts` rompería el presupuesto y con él el CI. Un `import()` después del montaje los deja en
 * un *chunk* aparte que el navegador pide cuando ya pintó, y que no cuenta como ruta crítica.
 *
 * <p><b>Y no se activa si no hay a dónde enviar.</b> `VITE_TELEMETRY_URL` sin valor deja esto en
 * nada: ni descarga el *chunk*. Es deliberado — en producción el colector (Alloy) vive en un
 * registro DNS interno al que un navegador no llega, y abrirlo al exterior es una decisión de
 * plataforma con su propio ingress, autenticación y límite de peticiones. Mientras esa decisión
 * no se tome, esto queda inerte en prod y funcionando donde sí haya endpoint.
 *
 * <p><b>Los dos imports de tipo de abajo (`@opentelemetry/api`, `@grafana/faro-web-sdk`) se
 * borran en compilación</b> — no son un `import` de valor, así que no rompen la carga diferida:
 * el chunk de Faro sigue sin descargarse hasta que `startTelemetry()` llama a `import()`.
 *
 * <p><b>La telemetría no puede llevar la cadena de consulta de la URL.</b> Los dos fronts validan
 * credenciales de un solo uso como parámetro de consulta (`?token=...`: recuperar propuesta,
 * restablecer contraseña, verificar correo, aceptar invitación, aprobar acceso — las dos últimas
 * permiten fijar o crear la credencial de una cuenta). Sin la redacción de abajo, esa cadena
 * saldría por SEIS vías a la vez — la segunda a la sexta se fueron encontrando reparando las
 * anteriores: cada vez que se cerraba una, otra instrumentación de `getWebInstrumentations()`
 * traía el mismo defecto de fondo (guardar `location.href`, o la URL que ya tenía a mano, sin
 * pensar en qué lleva esa URL). Barridas por si había más: `WebVitalsInstrumentation`,
 * `SessionInstrumentation` y `UserActionInstrumentation` — ningún literal de `location` ni de
 * URL en las tres. No se revisó nada fuera de `getWebInstrumentations()`.
 *
 * <p>1) `@opentelemetry/instrumentation-fetch` y `@opentelemetry/instrumentation-xml-http-request`
 * ponen la URL completa —con su `?...`— como atributo del span (`http.url`, `url.full`) en cuanto
 * lo crean, antes de que exista respuesta. Es la petición que valida el token la que lleva el
 * token como atributo de su propio span; no depende de ninguna carrera. `redactSpanUrlAttributes`
 * se enchufa como `applyCustomAttributesOnSpan` de las dos instrumentaciones — hacen falta las
 * dos porque axios usa XHR en el navegador salvo que se configure el adaptador `fetch`.
 *
 * <p>2) `@grafana/faro-web-sdk` toma `location.href` como metadato de página (`meta.page.url`) y
 * lo adjunta a CADA señal (trazas, logs, excepciones, eventos, mediciones) mientras la URL
 * conserve el `?token=`. `redactPageUrlMeta` limpia ese metadato.
 *
 * <p>3) `NavigationInstrumentation` —incluida en `getWebInstrumentations()`, no es opcional— emite
 * un evento `faro.navigation` con `fromUrl`/`toUrl` en texto plano cada vez que el router cambia de
 * ruta dentro de la SPA (`@grafana/faro-web-sdk/.../instrumentations/navigation/instrumentation.js`).
 * Entrar o salir de una pantalla que llegó por enlace de correo dejaría el token ahí aunque los dos
 * puntos de arriba ya vinieran limpios. `redactNavigationEventUrls` lo limpia también.
 *
 * <p>4) `ErrorsInstrumentation` (tampoco opcional) arma el stacktrace de cada excepción con
 * `getStackFramesFromError`; cuando una línea del stack trae función pero no nombre de archivo
 * —frames `<anonymous>`, código evaluado, ciertos frames sintéticos según el motor—,
 * `buildStackFrame` rellena ese hueco con `document.location.href`
 * (`@grafana/faro-web-sdk/.../instrumentations/errors/stackFrames/buildStackFrame.js`). El campo
 * queda en `ExceptionEvent.stacktrace.frames[].filename`, que ninguna de las redacciones de arriba
 * toca porque no es un atributo de span, ni `meta.page`, ni un evento.
 * `redactExceptionStackFrameFilenames` lo limpia.
 *
 * <p>5) `PerformanceInstrumentation` (incluida por defecto, `enablePerformanceInstrumentation` no
 * está a `false`) copia el `name` —la URL completa, del Resource Timing API— de CADA entrada de
 * navegación y de CADA recurso `xmlhttprequest`/`fetch` (el filtro por defecto de
 * `observeResourceTimings`; `trackResources` no está fijado) en los eventos
 * `faro.performance.navigation` y `faro.performance.resource`
 * (`@grafana/faro-web-sdk/.../instrumentations/performance/{navigation,resource}.js`, vía
 * `createFaroResourceTiming`). Es la MISMA petición que 1) ya redacta en el span — pero por una
 * ruta de captura completamente distinta (Resource Timing API, no OTel), así que 1) no la cubre:
 * dispara en CADA llamada a la API, no solo en las de error. `redactPerformanceEventUrls` lo limpia.
 *
 * <p>6) `CSPInstrumentation` (incluida salvo que `enableContentSecurityPolicyInstrumentation` sea
 * `false`, que no lo es) escucha `securitypolicyviolation` y reporta `documentURI` —la URL
 * completa del documento que violó la política— y `referrer`, tal cual el navegador los entrega
 * (`@grafana/faro-web-sdk/.../instrumentations/csp/instrumentation.js`). Que esto se dispare
 * significa además que algo en la página está violando la CSP en ese instante — el momento en
 * que más importa no perder también el token. `redactCspViolationEventUrls` lo limpia.
 *
 * <p>Las seis comparten forma: ninguna reconstruye la URL desde la respuesta o desde
 * `window.location` en el momento del envío (`Response.url` / `xhr.responseURL` pueden venir
 * vacíos en el camino de error, y eso dejaría el original —con el token dentro— intacto justo en
 * el caso que más importa diagnosticar). Las seis redactan lo que la instrumentación ya escribió,
 * así cubren éxito y error por igual, y las seis recortan solo la consulta: endpoint, método,
 * host, ruta y resultado siguen viajando, que es lo que hace falta para diagnosticar un fallo real.
 * `redactBeforeSend` compone 2), 3), 4), 5) y 6) en el único `beforeSend` que admite Faro.
 *
 * <p>Hoy esto es intocable en la práctica —`VITE_TELEMETRY_URL` vacío corta antes de descargar el
 * chunk—, así que no hay señales reales que inspeccionar. La cobertura de esta redacción vive en
 * `tests/unit/telemetry.spec.ts`, con señales fabricadas y su propio control positivo.
 */

import type { Span } from '@opentelemetry/api'
import type {
  BeforeSendHook,
  EventEvent,
  ExceptionEvent,
  TransportItem,
} from '@grafana/faro-web-sdk'

/** Recorta la cadena de consulta de una URL. Conserva esquema, host, puerto y ruta. */
export function redactUrlQuery(url: string): string {
  const queryIndex = url.indexOf('?')
  return queryIndex === -1 ? url : url.slice(0, queryIndex)
}

/**
 * Atributos de span en los que las dos instrumentaciones web de OTel escriben la URL completa:
 * semconv antiguo (`http.url`) y estable (`url.full`). Los dos coexisten porque
 * `getDefaultOTELInstrumentations` no fija `semconvStabilityOptIn`.
 */
const SPAN_URL_ATTRIBUTE_KEYS = ['http.url', 'url.full'] as const

/**
 * `applyCustomAttributesOnSpan` de `@opentelemetry/instrumentation-fetch` y
 * `-xml-http-request` (vía `@grafana/faro-web-tracing`). Se ejecuta después de que la
 * instrumentación ya fijó `http.url`/`url.full` con la URL completa, así que sobrescribirlos aquí
 * con `span.setAttribute` es suficiente — no hace falta interceptar la creación del span.
 */
export function redactSpanUrlAttributes(span: Span): void {
  // El tipo público `Span` de `@opentelemetry/api` no declara `.attributes`; la implementación
  // real (`@opentelemetry/sdk-trace-base`) sí lo expone como propiedad de lectura. Lo leemos para
  // redactar lo que la instrumentación YA escribió, en vez de reconstruir la URL desde la
  // petición o la respuesta (ver el comentario de cabecera: esos campos faltan en error).
  const attributes = (span as Span & { attributes?: Record<string, unknown> }).attributes
  if (!attributes) return
  for (const key of SPAN_URL_ATTRIBUTE_KEYS) {
    const value = attributes[key]
    if (typeof value === 'string') {
      span.setAttribute(key, redactUrlQuery(value))
    }
  }
}

/** Redacta `meta.page.url`, sin descartar la señal. */
export function redactPageUrlMeta<P>(item: TransportItem<P>): TransportItem<P> {
  const pageUrl = item.meta.page?.url
  if (!pageUrl) return item
  return {
    ...item,
    meta: {
      ...item.meta,
      page: { ...item.meta.page, url: redactUrlQuery(pageUrl) },
    },
  }
}

/** Tipo de señal en el que Faro reporta eventos (`faro.navigation`, `faro.performance.*`, CSP...). */
const EVENT_ITEM_TYPE = 'event'

/**
 * Redacta, dentro de un evento cuyo nombre coincida con `eventNames`, las claves de
 * `urlAttributeKeys` cuyo valor sea una URL. No toca ninguna otra señal ni ningún otro evento.
 * Compartida por las tres redacciones de eventos de abajo para que las tres se comporten igual:
 * si una se corrige, las otras dos no pueden quedarse con el comportamiento viejo por descuido.
 */
function redactEventUrlAttributes<P>(
  item: TransportItem<P>,
  eventNames: readonly string[],
  urlAttributeKeys: readonly string[],
): TransportItem<P> {
  if (item.type !== EVENT_ITEM_TYPE) return item
  // `TransportItem<P>.payload` no se estrecha por `.type` en los tipos públicos de Faro (los dos
  // campos comparten un único parámetro de tipo). El propio valor de `.type`, comprobado arriba,
  // es la garantía real de que esto es un `EventEvent`.
  const payload = item.payload as unknown as EventEvent
  if (!eventNames.includes(payload.name) || !payload.attributes) return item

  const attributes = { ...payload.attributes }
  let redacted = false
  for (const key of urlAttributeKeys) {
    const value = attributes[key]
    if (typeof value === 'string') {
      const redactedValue = redactUrlQuery(value)
      if (redactedValue !== value) {
        attributes[key] = redactedValue
        redacted = true
      }
    }
  }
  if (!redacted) return item
  return { ...item, payload: { ...payload, attributes } as unknown as P }
}

const NAVIGATION_EVENT_NAME = 'faro.navigation'
const NAVIGATION_URL_ATTRIBUTE_KEYS = ['fromUrl', 'toUrl'] as const

/** Redacta `fromUrl`/`toUrl` del evento `faro.navigation`, sin tocar ningún otro tipo de señal. */
export function redactNavigationEventUrls<P>(item: TransportItem<P>): TransportItem<P> {
  return redactEventUrlAttributes(item, [NAVIGATION_EVENT_NAME], NAVIGATION_URL_ATTRIBUTE_KEYS)
}

/** Los dos eventos que `PerformanceInstrumentation` arma con `createFaroResourceTiming`. */
const PERFORMANCE_EVENT_NAMES = [
  'faro.performance.navigation',
  'faro.performance.resource',
] as const
/** `name` es el campo en el que `createFaroResourceTiming` copia la URL completa del recurso. */
const PERFORMANCE_URL_ATTRIBUTE_KEYS = ['name'] as const

/**
 * Redacta `name` de `faro.performance.navigation`/`faro.performance.resource`. Es la misma URL de
 * petición que `redactSpanUrlAttributes` ya redacta en el span — pero por una ruta de captura
 * distinta (Resource Timing API), así que hace falta esta segunda redacción para la misma URL.
 */
export function redactPerformanceEventUrls<P>(item: TransportItem<P>): TransportItem<P> {
  return redactEventUrlAttributes(item, PERFORMANCE_EVENT_NAMES, PERFORMANCE_URL_ATTRIBUTE_KEYS)
}

const CSP_VIOLATION_EVENT_NAME = 'securitypolicyviolation'
/**
 * `documentURI` y `referrer` son URLs de la propia página (la que violó la política, y de la que
 * vino). `blockedURI`/`sourceFile` son del recurso bloqueado, casi siempre de terceros — se
 * redactan igual por consistencia y porque no cuesta nada si no llevaban consulta.
 */
const CSP_URL_ATTRIBUTE_KEYS = ['documentURI', 'referrer', 'blockedURI', 'sourceFile'] as const

/** Redacta las URLs del evento `securitypolicyviolation` que emite `CSPInstrumentation`. */
export function redactCspViolationEventUrls<P>(item: TransportItem<P>): TransportItem<P> {
  return redactEventUrlAttributes(item, [CSP_VIOLATION_EVENT_NAME], CSP_URL_ATTRIBUTE_KEYS)
}

/** Tipo de señal en el que Faro reporta excepciones. */
const EXCEPTION_ITEM_TYPE = 'exception'

/**
 * Redacta `stacktrace.frames[].filename` de una excepción. `buildStackFrame` (ver el comentario
 * de cabecera, punto 4) rellena ese campo con `document.location.href` cuando un frame no trae
 * nombre de archivo propio.
 */
export function redactExceptionStackFrameFilenames<P>(item: TransportItem<P>): TransportItem<P> {
  if (item.type !== EXCEPTION_ITEM_TYPE) return item
  // Mismo caso que en `redactEventUrlAttributes`: `.type` es la garantía real de que esto es un
  // `ExceptionEvent`, aunque el tipo público de `TransportItem<P>.payload` no se estreche por él.
  const payload = item.payload as unknown as ExceptionEvent
  const frames = payload.stacktrace?.frames
  if (!frames || frames.length === 0) return item

  let redacted = false
  const redactedFrames = frames.map((frame) => {
    if (typeof frame.filename !== 'string') return frame
    const redactedFilename = redactUrlQuery(frame.filename)
    if (redactedFilename === frame.filename) return frame
    redacted = true
    return { ...frame, filename: redactedFilename }
  })
  if (!redacted) return item
  return {
    ...item,
    payload: {
      ...payload,
      stacktrace: { ...payload.stacktrace, frames: redactedFrames },
    } as unknown as P,
  }
}

/** `beforeSend` de Faro: compone las cinco redacciones de arriba en el único hook que admite Faro. */
export const redactBeforeSend: BeforeSendHook = (item) => {
  let redacted = redactPageUrlMeta(item)
  redacted = redactNavigationEventUrls(redacted)
  redacted = redactPerformanceEventUrls(redacted)
  redacted = redactCspViolationEventUrls(redacted)
  redacted = redactExceptionStackFrameFilenames(redacted)
  return redacted
}

let arrancada = false

export async function startTelemetry(): Promise<void> {
  const url = import.meta.env.VITE_TELEMETRY_URL
  if (!url || arrancada) return
  arrancada = true

  try {
    const [{ initializeFaro, getWebInstrumentations }, { TracingInstrumentation }] =
      await Promise.all([import('@grafana/faro-web-sdk'), import('@grafana/faro-web-tracing')])

    initializeFaro({
      url,
      app: {
        name: 'vetsoftware-admin',
        version: import.meta.env.VITE_APP_VERSION ?? 'dev',
        environment: import.meta.env.VITE_TELEMETRY_ENV ?? import.meta.env.MODE,
      },
      // Quita el `?token=...` de `meta.page.url`, de los eventos `faro.navigation`,
      // `faro.performance.*` y `securitypolicyviolation`, y del stacktrace de las excepciones,
      // antes de que cualquier señal salga (ver el comentario de cabecera).
      beforeSend: redactBeforeSend,
      instrumentations: [
        ...getWebInstrumentations(),
        new TracingInstrumentation({
          instrumentationOptions: {
            // Solo hacia la propia API. Sin esta lista, la instrumentación inyectaría cabeceras de
            // traza en peticiones a terceros y filtraría identificadores fuera del sistema.
            propagateTraceHeaderCorsUrls: [new RegExp(escapeRegExp(apiOrigin()))],
            // Quita el `?token=...` de `http.url`/`url.full` en el span de cada petición (fetch y
            // XHR) antes de que se exporte — ver el comentario de cabecera.
            fetchInstrumentationOptions: { applyCustomAttributesOnSpan: redactSpanUrlAttributes },
            xhrInstrumentationOptions: { applyCustomAttributesOnSpan: redactSpanUrlAttributes },
          },
        }),
      ],
    })
  } catch {
    // La telemetría no puede tumbar la aplicación: si el chunk no descarga o el colector no
    // responde, la pantalla sigue funcionando sin ella.
    arrancada = false
  }
}

/** Origen de la API, que es el único destino al que se propagan cabeceras de traza. */
function apiOrigin(): string {
  try {
    return new URL(import.meta.env.VITE_API_URL ?? window.location.origin).origin
  } catch {
    return window.location.origin
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
