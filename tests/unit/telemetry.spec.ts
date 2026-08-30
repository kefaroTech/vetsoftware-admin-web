import { describe, it, expect } from 'vitest'
import {
  redactBeforeSend,
  redactCspViolationEventUrls,
  redactExceptionStackFrameFilenames,
  redactNavigationEventUrls,
  redactPageUrlMeta,
  redactPerformanceEventUrls,
  redactSpanUrlAttributes,
  redactUrlQuery,
} from '@/services/telemetry/telemetry'

/**
 * El séptimo sitio por el que un token salía del producto (ver `telemetry.ts`) resultó ser SEIS
 * sitios dentro del mismo SDK, encontrados de a uno reparando el anterior:
 *
 * 1. El span de la petición que valida la credencial llevaba la credencial como atributo
 *    (`http.url` / `url.full`, escritos por `@opentelemetry/instrumentation-fetch` y
 *    `-xml-http-request` en cuanto crean el span).
 * 2. `@grafana/faro-web-sdk` adjuntaba `location.href` a cada señal mientras la URL conservara
 *    el `?token=` (`meta.page.url`).
 * 3. `NavigationInstrumentation` —incluida por defecto— emitía un evento `faro.navigation` con
 *    `fromUrl`/`toUrl` en cada cambio de ruta de la SPA.
 * 4. `ErrorsInstrumentation` rellenaba `stacktrace.frames[].filename` con `document.location.href`
 *    cuando un frame del stack no traía nombre de archivo propio.
 * 5. `PerformanceInstrumentation` copiaba la URL completa de cada navegación y cada recurso
 *    XHR/fetch —la MISMA petición que 1) ya redacta en el span, por una ruta de captura distinta,
 *    el Resource Timing API— en los eventos `faro.performance.navigation`/`faro.performance.resource`.
 * 6. `CSPInstrumentation` reportaba `documentURI`/`referrer` tal cual el navegador los entrega en
 *    cada evento `securitypolicyviolation`.
 *
 * Estas pruebas no pueden observar el colector real: `VITE_TELEMETRY_URL` está vacío en los dos
 * fronts y `startTelemetry()` corta antes de descargar el SDK. Lo que sí se ejercita es la lógica
 * de redacción con señales fabricadas — incluido un control positivo por bloque que demuestra que
 * la prueba detecta la fuga si la redacción no se aplica.
 */

const URL_CON_TOKEN =
  'https://api.vetsoftware.test/api/v1/platform-access/accesses/approve?token=un-secreto-de-un-solo-uso'
const URL_SIN_TOKEN = 'https://api.vetsoftware.test/api/v1/platform-access/accesses/approve'

describe('redactUrlQuery — control positivo', () => {
  it('la URL fabricada SÍ lleva el token (si esto fallara, el resto de la prueba no probaría nada)', () => {
    expect(URL_CON_TOKEN).toContain('token=')
  })

  it('quita la cadena de consulta y conserva esquema, host y ruta', () => {
    expect(redactUrlQuery(URL_CON_TOKEN)).toBe(URL_SIN_TOKEN)
    expect(redactUrlQuery(URL_CON_TOKEN)).not.toContain('token=')
  })

  it('no toca una URL que ya viene sin consulta', () => {
    expect(redactUrlQuery(URL_SIN_TOKEN)).toBe(URL_SIN_TOKEN)
  })
})

describe('redactSpanUrlAttributes — atributos http.url / url.full del span', () => {
  function fakeSpan(attributes: Record<string, unknown>) {
    const span = {
      attributes,
      setAttribute(key: string, value: unknown) {
        attributes[key] = value
        return span
      },
    }
    return span
  }

  it('redacta http.url y url.full sin tocar el resto de atributos', () => {
    const span = fakeSpan({
      'http.url': URL_CON_TOKEN,
      'url.full': URL_CON_TOKEN,
      'http.method': 'POST',
      'http.status_code': 204,
    })

    // Control positivo: antes de redactar, el span fabricado SÍ lleva el token.
    expect(span.attributes['http.url']).toContain('token=')

    redactSpanUrlAttributes(span as never)

    expect(span.attributes['http.url']).toBe(URL_SIN_TOKEN)
    expect(span.attributes['url.full']).toBe(URL_SIN_TOKEN)
    // Lo que sigue haciendo falta para diagnosticar no se toca.
    expect(span.attributes['http.method']).toBe('POST')
    expect(span.attributes['http.status_code']).toBe(204)
  })

  it('no revienta si el span no trae atributos de URL', () => {
    const span = fakeSpan({ 'http.method': 'GET' })
    expect(() => redactSpanUrlAttributes(span as never)).not.toThrow()
    expect(span.attributes['http.method']).toBe('GET')
  })
})

describe('redactPageUrlMeta — meta.page.url', () => {
  function fakeItem(pageUrl: string | undefined) {
    return {
      type: 'trace',
      payload: {},
      meta: {
        page: pageUrl === undefined ? undefined : { url: pageUrl },
        app: { name: 'vetsoftware' },
      },
    }
  }

  it('redacta meta.page.url sin descartar la señal', () => {
    const item = fakeItem(URL_CON_TOKEN)

    // Control positivo.
    expect(item.meta.page?.url).toContain('token=')

    const result = redactPageUrlMeta(item as never)

    expect(result).not.toBeNull()
    expect(result?.meta.page?.url).toBe(URL_SIN_TOKEN)
    // El resto de metadatos de la señal sobrevive intacto.
    expect(result?.meta.app?.name).toBe('vetsoftware')
    expect(result?.type).toBe('trace')
  })

  it('no revienta si no hay metadato de página', () => {
    const item = fakeItem(undefined)
    expect(() => redactPageUrlMeta(item as never)).not.toThrow()
    expect(redactPageUrlMeta(item as never)).toBe(item)
  })
})

interface FakeNavigationItem {
  type: string
  payload: { name: string; attributes: Record<string, string> }
  meta: { page?: { url?: string }; app?: { name?: string } }
}

describe('redactNavigationEventUrls — evento faro.navigation', () => {
  function fakeNavigationItem(fromUrl: string, toUrl: string): FakeNavigationItem {
    return {
      type: 'event',
      payload: {
        name: 'faro.navigation',
        attributes: { fromUrl, toUrl, sameDocument: 'true', duration: '120' },
      },
      meta: { app: { name: 'vetsoftware' } },
    }
  }

  it('redacta fromUrl y toUrl sin tocar el resto de atributos del evento', () => {
    const item = fakeNavigationItem(URL_SIN_TOKEN, URL_CON_TOKEN)

    // Control positivo.
    expect(item.payload.attributes['toUrl']).toContain('token=')

    const result = redactNavigationEventUrls(item as never) as unknown as FakeNavigationItem

    expect(result.payload.attributes['fromUrl']).toBe(URL_SIN_TOKEN)
    expect(result.payload.attributes['toUrl']).toBe(URL_SIN_TOKEN)
    expect(result.payload.attributes['sameDocument']).toBe('true')
    expect(result.payload.attributes['duration']).toBe('120')
    expect(result.payload.name).toBe('faro.navigation')
  })

  it('no toca eventos que no sean faro.navigation', () => {
    const item: FakeNavigationItem = {
      type: 'event',
      payload: {
        name: 'faro.click',
        attributes: { toUrl: URL_CON_TOKEN },
      },
      meta: {},
    }

    const result = redactNavigationEventUrls(item as never) as unknown as FakeNavigationItem

    expect(result.payload.attributes['toUrl']).toBe(URL_CON_TOKEN)
  })

  it('no toca señales que no sean eventos (traces, logs, ...)', () => {
    const item = { type: 'trace', payload: {}, meta: {} }
    expect(redactNavigationEventUrls(item as never)).toBe(item)
  })
})

describe('redactPerformanceEventUrls — faro.performance.navigation / faro.performance.resource', () => {
  interface FakePerformanceItem {
    type: string
    payload: { name: string; attributes: Record<string, string> }
    meta: Record<string, unknown>
  }

  function fakePerformanceItem(eventName: string, name: string): FakePerformanceItem {
    return {
      type: 'event',
      payload: {
        name: eventName,
        attributes: { name, httpHost: 'api.vetsoftware.test', duration: '42' },
      },
      meta: {},
    }
  }

  it.each(['faro.performance.navigation', 'faro.performance.resource'])(
    'redacta el atributo name de %s sin tocar el resto',
    (eventName) => {
      const item = fakePerformanceItem(eventName, URL_CON_TOKEN)

      // Control positivo.
      expect(item.payload.attributes['name']).toContain('token=')

      const result = redactPerformanceEventUrls(item as never) as unknown as FakePerformanceItem

      expect(result.payload.attributes['name']).toBe(URL_SIN_TOKEN)
      expect(result.payload.attributes['httpHost']).toBe('api.vetsoftware.test')
      expect(result.payload.attributes['duration']).toBe('42')
    },
  )

  it('no toca eventos de otro nombre', () => {
    const item = fakePerformanceItem('faro.navigation', URL_CON_TOKEN)
    const result = redactPerformanceEventUrls(item as never) as unknown as FakePerformanceItem
    expect(result.payload.attributes['name']).toBe(URL_CON_TOKEN)
  })
})

describe('redactCspViolationEventUrls — evento securitypolicyviolation', () => {
  interface FakeCspItem {
    type: string
    payload: { name: string; attributes: Record<string, string> }
    meta: Record<string, unknown>
  }

  function fakeCspItem(): FakeCspItem {
    return {
      type: 'event',
      payload: {
        name: 'securitypolicyviolation',
        attributes: {
          documentURI: URL_CON_TOKEN,
          referrer: URL_CON_TOKEN,
          blockedURI: 'https://evil.example/inject.js',
          sourceFile: 'https://evil.example/inject.js',
          violatedDirective: 'script-src',
        },
      },
      meta: {},
    }
  }

  it('redacta documentURI y referrer sin tocar el resto de atributos', () => {
    const item = fakeCspItem()

    // Control positivo.
    expect(item.payload.attributes['documentURI']).toContain('token=')
    expect(item.payload.attributes['referrer']).toContain('token=')

    const result = redactCspViolationEventUrls(item as never) as unknown as FakeCspItem

    expect(result.payload.attributes['documentURI']).toBe(URL_SIN_TOKEN)
    expect(result.payload.attributes['referrer']).toBe(URL_SIN_TOKEN)
    expect(result.payload.attributes['blockedURI']).toBe('https://evil.example/inject.js')
    expect(result.payload.attributes['violatedDirective']).toBe('script-src')
  })

  it('no toca eventos que no sean securitypolicyviolation', () => {
    const item = fakeCspItem()
    item.payload.name = 'faro.navigation'
    const result = redactCspViolationEventUrls(item as never) as unknown as FakeCspItem
    expect(result.payload.attributes['documentURI']).toBe(URL_CON_TOKEN)
  })
})

describe('redactExceptionStackFrameFilenames — stacktrace.frames[].filename', () => {
  interface FakeExceptionItem {
    type: string
    payload: {
      type: string
      value: string
      stacktrace?: { frames: { filename: string; function: string }[] }
    }
    meta: Record<string, unknown>
  }

  function fakeExceptionItem(frames: { filename: string; function: string }[]): FakeExceptionItem {
    return {
      type: 'exception',
      payload: { type: 'TypeError', value: 'algo falló', stacktrace: { frames } },
      meta: {},
    }
  }

  it('redacta el filename de un frame sin nombre de archivo propio (fallback a document.location.href)', () => {
    const item = fakeExceptionItem([
      { filename: 'https://api.vetsoftware.test/assets/app.js', function: 'render' },
      // Este es el frame que produce buildStackFrame.js cuando no hay filename: cae a
      // document.location.href, que en la pantalla de aceptar invitación lleva el token.
      { filename: URL_CON_TOKEN, function: '<anonymous>' },
    ])

    // Control positivo.
    expect(item.payload.stacktrace?.frames[1]?.filename).toContain('token=')

    const result = redactExceptionStackFrameFilenames(item as never) as unknown as FakeExceptionItem
    const frames = result.payload.stacktrace?.frames ?? []

    // El frame con un archivo real de la aplicación no se toca.
    expect(frames[0]?.filename).toBe('https://api.vetsoftware.test/assets/app.js')
    expect(frames[0]?.function).toBe('render')
    // El frame que llevaba document.location.href queda sin la consulta.
    expect(frames[1]?.filename).toBe(URL_SIN_TOKEN)
    expect(frames[1]?.function).toBe('<anonymous>')
  })

  it('no revienta si la excepción no trae stacktrace', () => {
    const item = { type: 'exception', payload: { type: 'Error', value: 'x' }, meta: {} }
    expect(() => redactExceptionStackFrameFilenames(item as never)).not.toThrow()
    expect(redactExceptionStackFrameFilenames(item as never)).toBe(item)
  })

  it('no toca señales que no sean excepciones', () => {
    const item = { type: 'trace', payload: {}, meta: {} }
    expect(redactExceptionStackFrameFilenames(item as never)).toBe(item)
  })
})

describe('redactBeforeSend — el beforeSend que Faro registra de verdad', () => {
  it('compone las cinco redacciones: meta.page.url y el evento faro.navigation', () => {
    const item: FakeNavigationItem = {
      type: 'event',
      payload: {
        name: 'faro.navigation',
        attributes: { fromUrl: URL_SIN_TOKEN, toUrl: URL_CON_TOKEN },
      },
      meta: { page: { url: URL_CON_TOKEN }, app: { name: 'vetsoftware' } },
    }

    // Control positivo: la señal fabricada lleva el token en los dos sitios.
    expect(item.meta.page?.url).toContain('token=')
    expect(item.payload.attributes['toUrl']).toContain('token=')

    const result = redactBeforeSend(item as never) as unknown as FakeNavigationItem | null

    expect(result).not.toBeNull()
    expect(result?.meta.page?.url).toBe(URL_SIN_TOKEN)
    expect(result?.payload.attributes['toUrl']).toBe(URL_SIN_TOKEN)
  })

  it('también compone la redacción del recurso de rendimiento', () => {
    const item = {
      type: 'event',
      payload: { name: 'faro.performance.resource', attributes: { name: URL_CON_TOKEN } },
      meta: {},
    }

    expect(item.payload.attributes.name).toContain('token=')

    const result = redactBeforeSend(item as never) as unknown as {
      payload: { attributes: Record<string, string> }
    } | null

    expect(result?.payload.attributes['name']).toBe(URL_SIN_TOKEN)
  })

  it('también compone la redacción de la violación de CSP', () => {
    const item = {
      type: 'event',
      payload: { name: 'securitypolicyviolation', attributes: { documentURI: URL_CON_TOKEN } },
      meta: {},
    }

    expect(item.payload.attributes.documentURI).toContain('token=')

    const result = redactBeforeSend(item as never) as unknown as {
      payload: { attributes: Record<string, string> }
    } | null

    expect(result?.payload.attributes['documentURI']).toBe(URL_SIN_TOKEN)
  })

  it('también compone la redacción del stacktrace de una excepción', () => {
    const item = {
      type: 'exception',
      payload: {
        type: 'TypeError',
        value: 'x',
        stacktrace: { frames: [{ filename: URL_CON_TOKEN, function: '<anonymous>' }] },
      },
      meta: {},
    }

    expect(item.payload.stacktrace.frames[0]?.filename).toContain('token=')

    const result = redactBeforeSend(item as never) as unknown as {
      payload: { stacktrace: { frames: { filename: string }[] } }
    } | null

    expect(result?.payload.stacktrace.frames[0]?.filename).toBe(URL_SIN_TOKEN)
  })
})
