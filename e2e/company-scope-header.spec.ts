import { test, expect, type Page, type Request } from '@playwright/test'
import { API_BASE, COMPANY_ID_HEADER } from './helpers/session'

/**
 * <b>issue #160 — `X-Company-Id` contra un backend real.</b>
 *
 * <p>La consola la opera un `SystemUserContext`, que no lleva empresa en el
 * token. Para las 25 rutas de las 54 que resuelven la empresa con
 * `Authz.currentCompanyId()`, el backend la lee de la cabecera `X-Company-Id`
 * (`Authz.requiredSystemCompanyId()`) y lanza si falta. El cliente HTTP la manda
 * <b>condicionalmente y por petición</b>: `http.client.ts:206`
 * <pre>if (config.companyId != null) config.headers.set(COMPANY_ID_HEADER, String(config.companyId))</pre>
 *
 * <p>Hasta este spec eso nunca se había ejercitado contra un backend real. Se
 * comprueban las <b>tres</b> situaciones: que la cabecera viaja cuando el
 * llamador la declara, que <b>no</b> viaja cuando no la declara, y qué contesta
 * el backend cuando falta.
 *
 * <h3>Por qué se conduce el cliente real desde el navegador y no se «mockea»</h3>
 *
 * <p>Un test que simule la petición comprobaría su propia simulación. Aquí se
 * importa en la página el <b>mismo módulo</b> que usa la aplicación
 * (`/src/services/http/http.client.ts`, servido por Vite sin transformar la
 * lógica), de modo que corre el interceptor de producción tal cual. La
 * aserción se hace sobre la petición que <b>sale por el cable</b>
 * (`page.on('request')`), no sobre lo que el test creía que iba a salir, y
 * contra el backend real: si el interceptor dejara de poner la cabecera, la
 * respuesta del servidor cambiaría de 200 a 400 y el test se caería por los dos
 * lados a la vez.
 */

/** Ruta de sistema que resuelve la empresa por cabecera. Sin ella el backend responde 400. */
const SCOPED_ENDPOINT = '/entitlements/access'
/** Ruta global del catálogo: NO lleva empresa, y por tanto no debe llevar cabecera. */
const GLOBAL_ENDPOINT = '/catalog-items'

interface DriverResult {
  status: number
  body: unknown
  error?: string
}

/**
 * Ruta del módulo TAL Y COMO LO SIRVE VITE. Va como argumento en tiempo de
 * ejecución —y no como literal en el `import`— porque TypeScript intentaría
 * resolver una ruta del navegador contra el sistema de ficheros. Es el módulo
 * de producción, sin transformar: por eso lo que se prueba es el interceptor
 * real y no una copia.
 */
const HTTP_CLIENT_MODULE = '/src/services/http/http.client.ts'

/** Forma mínima que necesita el conductor. El módulo real expone mucho más. */
interface HttpClientModule {
  http: {
    get: (
      url: string,
      config?: Record<string, unknown>,
    ) => Promise<{ status: number; data: unknown }>
  }
}

/**
 * Ejecuta una petición con el cliente HTTP REAL de la aplicación desde el
 * contexto de la página.
 *
 * `companyId` se pasa tal cual al `config` de axios, que es exactamente lo que
 * hacen `entitlements.api.ts`, `subscription-items.api.ts` y los demás
 * llamadores de `features/subscriptions-admin/api/`.
 */
async function callWithRealClient(
  page: Page,
  url: string,
  companyId?: number,
): Promise<DriverResult> {
  return page.evaluate(
    async ({ url, companyId, modulePath }) => {
      const loaded = (await import(/* @vite-ignore */ modulePath)) as HttpClientModule
      try {
        const config = companyId === undefined ? {} : { companyId }
        const response = await loaded.http.get(url, config)
        return { status: response.status, body: response.data }
      } catch (error) {
        const axiosError = error as {
          response?: { status: number; data: unknown }
          message?: string
        }
        return {
          status: axiosError.response?.status ?? 0,
          body: axiosError.response?.data ?? null,
          error: axiosError.message,
        }
      }
    },
    { url, companyId, modulePath: HTTP_CLIENT_MODULE },
  )
}

/** Captura las peticiones a la API y el valor de la cabecera en cada una. */
function recordApiRequests(page: Page) {
  const seen: { url: string; header: string | undefined }[] = []
  page.on('request', (request: Request) => {
    if (!request.url().startsWith(API_BASE)) return
    seen.push({ url: request.url(), header: request.headers()[COMPANY_ID_HEADER] })
  })
  return seen
}

test.describe('#160 · X-Company-Id contra el backend real', () => {
  test.beforeEach(async ({ page }) => {
    // La app tiene que estar cargada para poder importar sus módulos y para que
    // la sesión sembrada por el proyecto `setup` esté en `localStorage`.
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('VA: la cabecera viaja, y con su valor, cuando el llamador declara la empresa', async ({
    page,
  }) => {
    const seen = recordApiRequests(page)

    const result = await callWithRealClient(page, SCOPED_ENDPOINT, 7)

    const scoped = seen.filter((r) => r.url.includes(SCOPED_ENDPOINT))
    expect(scoped, `no salió ninguna petición a ${SCOPED_ENDPOINT}`).not.toHaveLength(0)
    // 1) La cabecera salió por el cable, con el valor exacto que pasó el llamador.
    expect(scoped[0]?.header).toBe('7')

    // 2) Y el backend la CONSUMIÓ: acepta la petición y devuelve el alcance
    //    resuelto a partir de ella. Esto es lo que distingue «la cabecera se
    //    envía» de «la cabecera sirve para algo».
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ companyId: 7 })
  })

  test('NO VA: una ruta global sale sin cabecera cuando el llamador no la declara', async ({
    page,
  }) => {
    const seen = recordApiRequests(page)

    const result = await callWithRealClient(page, GLOBAL_ENDPOINT)

    const global = seen.filter((r) => r.url.includes(GLOBAL_ENDPOINT))
    expect(global, `no salió ninguna petición a ${GLOBAL_ENDPOINT}`).not.toHaveLength(0)
    // La cabecera NO viaja por defecto: es la mitad del contrato que evita que
    // una empresa recordada de otra pantalla decida el destinatario de una
    // escritura.
    expect(global[0]?.header).toBeUndefined()
    expect(result.status).toBe(200)
  })

  test('FALTA: el backend rechaza con 400 la ruta con alcance si no se declara empresa', async ({
    page,
  }) => {
    const seen = recordApiRequests(page)

    const result = await callWithRealClient(page, SCOPED_ENDPOINT)

    const scoped = seen.filter((r) => r.url.includes(SCOPED_ENDPOINT))
    expect(scoped[0]?.header).toBeUndefined()
    // `requiredSystemCompanyId()` lanza `IllegalArgumentException`, que el
    // manejador global traduce a 400 `INVALID_INPUT`.
    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ code: 'INVALID_INPUT' })
  })

  test('FALTA (mal formada): un valor no numérico o no positivo se rechaza igual', async ({
    page,
  }) => {
    // No pasa por `config.companyId` —que es `number`— sino por una cabecera
    // puesta a mano: comprueba la validación del SERVIDOR, no la del cliente.
    const result = await page.evaluate(
      async ({ url, modulePath }) => {
        const loaded = (await import(/* @vite-ignore */ modulePath)) as HttpClientModule
        const attempt = async (value: string) => {
          try {
            const response = await loaded.http.get(url, { headers: { 'X-Company-Id': value } })
            return response.status
          } catch (error) {
            return (error as { response?: { status: number } }).response?.status ?? 0
          }
        }
        return {
          texto: await attempt('abc'),
          cero: await attempt('0'),
          negativo: await attempt('-3'),
        }
      },
      { url: SCOPED_ENDPOINT, modulePath: HTTP_CLIENT_MODULE },
    )

    expect(result.texto, 'un id no numérico debe rechazarse').toBe(400)
    expect(result.cero, 'el id 0 no es una empresa').toBe(400)
    expect(result.negativo, 'un id negativo no es una empresa').toBe(400)
  })

  test('ninguna pantalla filtra la cabecera en peticiones que no la piden', async ({ page }) => {
    // Recorrido por pantallas que NO trabajan sobre una empresa concreta. Si
    // alguna infiriera la empresa de un estado global —lo que el contrato
    // prohíbe— aparecería aquí una cabecera que nadie declaró.
    const seen = recordApiRequests(page)

    for (const route of ['/catalogo-comercial', '/empresas', '/suscripciones']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }

    const leaked = seen.filter((r) => r.header !== undefined)
    expect(
      leaked.map((r) => `${r.url} → ${r.header}`),
      'ninguna de estas pantallas declara empresa, así que ninguna petición debe llevar la cabecera',
    ).toEqual([])
    expect(seen.length, 'el recorrido no llegó a pedir nada a la API').toBeGreaterThan(0)
  })
})
