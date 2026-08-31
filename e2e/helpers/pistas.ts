import { expect, type Locator, type Page, type Request } from '@playwright/test'
import { bloquearFuentesRemotas, esperarVeloOculto, seedSession } from './app-shell'
import type { CatalogItemAiHintResponse } from '@/features/catalog-ai-hints/types/catalog-ai-hints.types'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Arnés de las **pistas del asistente** — `/asistente/pistas` y su ficha.
 *
 * ── Por qué la API va interceptada, y aquí no es comodidad ─────────────────
 * Tres motivos, y cada uno bastaría solo:
 *
 *  1. **La fila que más importa no se puede sembrar.** `catalogItemCode` y
 *     `catalogItemName` llegan `null` cuando el artículo dejó de estar
 *     habilitado en el catálogo — dos de los cuatro campos que el contrato NO
 *     declara `required`—. Provocarlo contra `localdev` exigiría deshabilitar
 *     un artículo del catálogo GLOBAL de plataforma que además tuviera pista
 *     viva, y dejarlo así: es mutar el catálogo comercial para probar otra
 *     pantalla.
 *  2. **`catalog_item_ai_hints` es historial append-only.** Ni el `PUT` ni el
 *     `DELETE` borran fila: el primero inserta una revisión y el segundo cierra
 *     la vigencia. Una suite que publicara y retirara contra el servidor real
 *     dejaría revisiones permanentes que NADA puede quitar después, y el índice
 *     único `(catalog_item_id, hint_hash)` impide siquiera republicar el texto
 *     anterior. «Cada spec deja el sistema como lo encontró» sería imposible de
 *     cumplir. Es el mismo argumento de `helpers/supresion.ts`.
 *  3. **Los tres estados de la cabecera de la ficha** —vigente, retirada, nunca
 *     tuvo pista— exigen tres artículos en tres estados distintos a la vez, y
 *     el segundo solo se consigue apagando comercialmente un artículo de
 *     verdad.
 *
 * Y hay un cuarto que pesa por sí mismo: editar aquí **cambia lo que se le
 * vende a desconocidos**, al instante y sin despliegue. Una suite que escriba
 * pistas de mentira en un servidor compartido las pone delante del siguiente
 * prospecto que escriba en la landing.
 *
 * ── El contador de llamadas es el instrumento, no un adorno ────────────────
 * Media suite afirma AUSENCIA: «cancelar no llama al `DELETE`», «el diálogo que
 * falla no vuelve a llamar». Una afirmación de ausencia sin control positivo no
 * distingue «no se llamó» de «mi prueba no mira las llamadas». Por eso
 * {@link ApiSimulada.escrituras} es el MISMO instrumento que reporta el cero
 * antes de confirmar y el uno después.
 *
 * ── Sin backend, en su propio proyecto de Playwright ───────────────────────
 * `pistas-asistente` en `playwright.config.ts`, sin `dependencies`: no arrastra
 * el proyecto `setup`, que sí exige `localdev` arriba. Mismo criterio que
 * `armazon-tablet` y `supresion-datos`.
 */

/** Las dos rutas de la feature (`catalog-ai-hints.routes.ts`). */
export const RUTA_LISTADO = '/asistente/pistas'
export const rutaFicha = (catalogItemId: number) => `/asistente/pistas/${catalogItemId}`

/** Quien mira, tal y como lo declara el `/auth/me` simulado. `signerLabel` lo pinta «tú». */
export const YO = 7
/** Otro operador cualquiera: su firma se pinta «usuario #12», sin el «tú». */
export const OTRO = 12

// ───────────────────────────────────────────────────────────────────────────
// Datos de prueba
//
// Todo lleva `E2E` a la vista para que sea reconocible como dato de prueba si
// alguna vez llegara a un servidor de verdad — que con este arnés no ocurre.
//
// ⚠️ TODAS las marcas de tiempo son FIJAS Y DEL PASADO. Ninguna se calcula a
// partir de «hoy». Este repositorio ya se quemó dos veces con expresiones de
// fecha estrechadas al mes en curso que se ponían rojas solas el día 1 del mes
// siguiente; una fecha de 2018 nunca se convierte en la de hoy.
// ───────────────────────────────────────────────────────────────────────────

/** Un texto de pista con los tres bloques que exige el dominio. */
function pista(que: string, senales: string, no: string): string {
  return [que, senales, no].join('\n\n')
}

const TEXTO_GROOMING_V4 = pista(
  'E2E · Servicio de peluquería y baño para mascotas dentro de la clínica.',
  'El prospecto escribe baño, corte de pelo, estética, guardería con baño.',
  'NO aplica si solo pide agenda o si la clínica no tiene sala de peluquería.',
)
const TEXTO_GROOMING_V3 = pista(
  'E2E · Peluquería canina y felina.',
  'Dice baño o corte.',
  'NO aplica en clínicas sin sala.',
)
const TEXTO_GROOMING_V2 = pista('E2E · Peluquería.', 'Dice baño.', 'NO aplica sin sala.')
const TEXTO_GROOMING_V1 = pista('E2E · Baños.', 'Dice baño.', 'NO aplica.')

const TEXTO_KARDEX_V2 = pista(
  'E2E · Control de existencias de medicamentos e insumos.',
  'El prospecto habla de inventario, existencias, vencimientos, lotes.',
  'NO aplica si no maneja medicamentos propios.',
)
const TEXTO_KARDEX_V1 = pista('E2E · Inventario.', 'Habla de existencias.', 'NO aplica sin stock.')

const TEXTO_HUERFANA = pista(
  'E2E · Pista viva sobre un artículo que ya no está habilitado en el catálogo.',
  'El prospecto pide algo que la plataforma dejó de vender.',
  'NO aplica nunca: por eso esta pista es candidata a retirar.',
)

/**
 * El historial de cada artículo, **de la más nueva a la más vieja**, que es el
 * orden en que lo sirve `GET /{id}/revisions`.
 *
 * <p>El de `901` está construido para agotar los CUATRO pies de procedencia de
 * `provenanceText` en una sola pantalla, incluido el incoherente —firmante de
 * retirada sin fecha—, que es una laguna real del changeset 393 y no una
 * hipótesis.
 */
export const HISTORIAL_901: CatalogItemAiHintResponse[] = [
  {
    id: 5104,
    catalogItemId: 901,
    catalogItemCode: 'E2E-GROOMING',
    catalogItemName: 'Peluquería E2E',
    hintRevision: 4,
    hintText: TEXTO_GROOMING_V4,
    publishedAt: '2019-04-02T11:20:00',
    publishedBySystemUserId: YO,
    supersededAt: null,
    supersededBySystemUserId: null,
    current: true,
    createdDate: '2019-04-02T11:20:00',
  },
  {
    id: 5103,
    catalogItemId: 901,
    catalogItemCode: 'E2E-GROOMING',
    catalogItemName: 'Peluquería E2E',
    hintRevision: 3,
    hintText: TEXTO_GROOMING_V3,
    publishedAt: '2018-11-14T10:00:00',
    publishedBySystemUserId: OTRO,
    supersededAt: '2019-04-02T11:20:00',
    supersededBySystemUserId: YO,
    current: false,
    createdDate: '2018-11-14T10:00:00',
  },
  {
    id: 5102,
    catalogItemId: 901,
    catalogItemCode: 'E2E-GROOMING',
    catalogItemName: 'Peluquería E2E',
    hintRevision: 2,
    hintText: TEXTO_GROOMING_V2,
    publishedAt: '2018-06-05T09:15:00',
    publishedBySystemUserId: OTRO,
    supersededAt: '2018-11-14T10:00:00',
    // La firma de retirada la añadió el changeset 393: antes NO se guardaba.
    supersededBySystemUserId: null,
    current: false,
    createdDate: '2018-06-05T09:15:00',
  },
  {
    id: 5101,
    catalogItemId: 901,
    catalogItemCode: 'E2E-GROOMING',
    catalogItemName: 'Peluquería E2E',
    hintRevision: 1,
    hintText: TEXTO_GROOMING_V1,
    publishedAt: '2018-01-20T08:00:00',
    publishedBySystemUserId: OTRO,
    // Incoherente A PROPÓSITO: firmante de retirada sin fecha de retirada.
    supersededAt: null,
    supersededBySystemUserId: OTRO,
    current: false,
    createdDate: '2018-01-20T08:00:00',
  },
]

/** Un artículo con pista vigente, publicada por OTRO: la firma no dice «tú». */
export const HISTORIAL_902: CatalogItemAiHintResponse[] = [
  {
    id: 5201,
    catalogItemId: 902,
    catalogItemCode: 'E2E-AGENDA',
    catalogItemName: 'Agenda E2E',
    hintRevision: 1,
    hintText: pista(
      'E2E · Agenda de citas con recordatorios.',
      'El prospecto habla de citas, turnos, recordatorios por WhatsApp.',
      'NO aplica si solo atiende por orden de llegada.',
    ),
    publishedAt: '2018-09-30T15:45:00',
    publishedBySystemUserId: OTRO,
    supersededAt: null,
    supersededBySystemUserId: null,
    current: true,
    createdDate: '2018-09-30T15:45:00',
  },
]

/**
 * **La fila del artículo no disponible.** Pista viva con `catalogItemCode` y
 * `catalogItemName` nulos: el artículo dejó de estar habilitado y el asistente
 * sigue pudiendo proponer algo que ya no se vende.
 */
export const HISTORIAL_903: CatalogItemAiHintResponse[] = [
  {
    id: 5301,
    catalogItemId: 903,
    catalogItemCode: null,
    catalogItemName: null,
    hintRevision: 1,
    hintText: TEXTO_HUERFANA,
    publishedAt: '2018-03-11T12:00:00',
    publishedBySystemUserId: OTRO,
    supersededAt: null,
    supersededBySystemUserId: null,
    current: true,
    createdDate: '2018-03-11T12:00:00',
  },
]

/** Un artículo cuya última pista **se retiró**: la de arriba no es vigente. */
export const HISTORIAL_904: CatalogItemAiHintResponse[] = [
  {
    id: 5402,
    catalogItemId: 904,
    catalogItemCode: 'E2E-KARDEX',
    catalogItemName: 'Kardex E2E',
    hintRevision: 2,
    hintText: TEXTO_KARDEX_V2,
    publishedAt: '2018-07-18T09:30:00',
    publishedBySystemUserId: OTRO,
    supersededAt: '2019-02-25T16:10:00',
    supersededBySystemUserId: YO,
    current: false,
    createdDate: '2018-07-18T09:30:00',
  },
  {
    id: 5401,
    catalogItemId: 904,
    catalogItemCode: 'E2E-KARDEX',
    catalogItemName: 'Kardex E2E',
    hintRevision: 1,
    hintText: TEXTO_KARDEX_V1,
    publishedAt: '2018-02-02T11:00:00',
    publishedBySystemUserId: OTRO,
    supersededAt: '2018-07-18T09:30:00',
    supersededBySystemUserId: OTRO,
    current: false,
    createdDate: '2018-02-02T11:00:00',
  },
]

/** Las fechas de arriba, ya pintadas por `formatDate` (`dd/mm/aaaa`). */
export const PINTADA = {
  GROOMING_V4: '02/04/2019',
  GROOMING_V3: '14/11/2018',
  GROOMING_V2: '05/06/2018',
  GROOMING_V1: '20/01/2018',
  AGENDA_V1: '30/09/2018',
  KARDEX_RETIRADA: '25/02/2019',
  KARDEX_V2: '18/07/2018',
} as const

function articulo(over: Partial<CatalogItemResponse> & { id: number }): CatalogItemResponse {
  return {
    code: `E2E-${over.id}`,
    name: `Artículo E2E ${over.id}`,
    shortDescription: null,
    longDescription: null,
    itemType: 'MODULE',
    capacityUnit: null,
    core: false,
    minQuantity: 1,
    maxQuantity: null,
    sortOrder: 10,
    status: 'ACTIVE',
    createdDate: '2018-01-01T09:00:00',
    enabled: true,
    defaultTrialDays: null,
    ...over,
  }
}

/**
 * El catálogo de artículos, que es la otra mitad del cruce de «Sin pista».
 *
 * <p>Contiene a propósito los dos artículos que la derivación tiene que
 * DESCARTAR —uno deshabilitado y uno en borrador—, porque el criterio
 * `enabled && status === 'ACTIVE'` no es cosmético: es exactamente la guarda de
 * publicación del backend, y listar un borrador aquí ofrecería un botón que el
 * servidor rechaza con 404.
 *
 * <p>`903` NO está en esta lista, y es coherente: su pista está viva y su
 * artículo ya no figura habilitado. Por eso su fila llega con los dos campos
 * nulos.
 */
export const ARTICULOS: CatalogItemResponse[] = [
  articulo({ id: 901, code: 'E2E-GROOMING', name: 'Peluquería E2E' }),
  articulo({ id: 902, code: 'E2E-AGENDA', name: 'Agenda E2E' }),
  articulo({ id: 904, code: 'E2E-KARDEX', name: 'Kardex E2E' }),
  // El único que debe salir en «Sin pista».
  articulo({ id: 910, code: 'E2E-CAJA', name: 'Caja E2E', itemType: 'MODULE' }),
  // Deshabilitado: fuera.
  articulo({ id: 911, code: 'E2E-BODEGA', name: 'Bodega E2E', enabled: false }),
  // En borrador: fuera.
  articulo({ id: 912, code: 'E2E-LABORATORIO', name: 'Laboratorio E2E', status: 'DRAFT' }),
  // Nunca tuvo pista y se abre por su ficha: el respaldo `GET /catalog-items/{id}`
  // es lo único que puede poner código y nombre en el título.
  articulo({ id: 905, code: 'E2E-TRAZA', name: 'Trazabilidad E2E' }),
]

/** El historial completo, por artículo. Se copia al montar: cada test tiene el suyo. */
export const HISTORIALES: Record<number, CatalogItemAiHintResponse[]> = {
  901: HISTORIAL_901,
  902: HISTORIAL_902,
  903: HISTORIAL_903,
  904: HISTORIAL_904,
  905: [],
}

// ───────────────────────────────────────────────────────────────────────────
// El servidor simulado
// ───────────────────────────────────────────────────────────────────────────

/** Lo que el servidor contestará a la siguiente ESCRITURA (POST/PUT/DELETE). */
export type RespuestaAEscritura =
  | { clase: 'ok' }
  | { clase: 'problema'; status: number; code: string; detail: string; traceId: string }

/** Lo que el servidor contestará a `GET /catalog-item-ai-hints` (el listado). */
export type RespuestaAlListado =
  { clase: 'ok' } | { clase: 'problema'; status: number; detail: string; traceId: string }

export interface Escritura {
  readonly metodo: string
  /** El path REAL, ya sin `/api/v1`. Es lo que distingue el `catalogItemId` del `id` de la fila. */
  readonly ruta: string
  readonly cuerpo: unknown
}

export interface ApiSimulada {
  /** Cada POST/PUT/DELETE que salió del navegador, en orden. */
  readonly escrituras: readonly Escritura[]
  /** Los paths de todas las lecturas. Es el preflight de que el arnés está enchufado. */
  readonly lecturas: readonly string[]
  /** Cambia lo que contestará la siguiente escritura, sin recargar la página. */
  responderAEscrituraCon(respuesta: RespuestaAEscritura): void
  /** Cambia lo que contestará el siguiente `GET` del listado. */
  responderAlListadoCon(respuesta: RespuestaAlListado): void
}

export interface ConfigApi {
  /** Historiales iniciales. Por defecto, {@link HISTORIALES}. */
  historiales?: Record<number, CatalogItemAiHintResponse[]>
  articulos?: CatalogItemResponse[]
  escritura?: RespuestaAEscritura
  listado?: RespuestaAlListado
}

/**
 * Las cabeceras CORS del backend real, copiadas de `CorsConfig.java:25`.
 *
 * <p>La aplicación corre en `:5173` y la API en `:8080` (ver `.env.localdev`),
 * o sea CRUZANDO ORIGEN. Sin `access-control-expose-headers` el navegador deja
 * leer el cuerpo pero ESCONDE `X-Trace-Id` a JavaScript, y la prueba de la
 * traza se pondría roja contra un producto que está bien — la peor clase de
 * fallo, porque acusa al código en vez de al instrumento. Misma copia fiel que
 * `helpers/supresion.ts`.
 */
function cabecerasCors(peticion: Request): Record<string, string> {
  const cabeceras = peticion.headers()
  return {
    'access-control-allow-origin': cabeceras['origin'] ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': cabeceras['access-control-request-headers'] ?? '*',
    'access-control-expose-headers': 'Authorization, X-Trace-Id, X-Request-Id',
    'access-control-max-age': '3600',
  }
}

const USUARIO_SIMULADO = {
  id: YO,
  type: 'SYSTEM_USER',
  companyId: null,
  name: 'Operador de pruebas E2E',
  employeeCode: null,
  permissions: [],
  mustChangePassword: false,
  branchIds: [],
}

function pagina<T>(contenido: T[], pageSize: number) {
  return {
    content: contenido,
    page: 0,
    pageSize,
    totalElements: contenido.length,
    totalPages: contenido.length === 0 ? 0 : 1,
  }
}

const PAGINA_VACIA = pagina([], 20)

/** La marca de retirada que pone el servidor simulado. Fija, como todo lo demás. */
export const RETIRADA_AHORA = '2019-06-14T10:00:00'
export const RETIRADA_AHORA_PINTADA = '14/06/2019'

/**
 * Intercepta TODA la API con **un solo manejador**. Uno y no varias rutas
 * porque Playwright las resuelve en orden inverso al de registro, y depender de
 * ese orden es lo que se rompe al añadir un caso (misma lección que
 * `helpers/app-shell.ts` y `helpers/supresion.ts`).
 *
 * <p>El servidor simulado **muta**: el `DELETE` cierra la vigencia de la
 * revisión de arriba en vez de borrarla, igual que el de verdad. Sin eso, la
 * fila no desaparecería del listado tras retirar y el caso del foco —el que
 * esta suite existe para cubrir— no probaría nada.
 */
export async function montarApi(page: Page, config: ConfigApi = {}): Promise<ApiSimulada> {
  const historiales: Record<number, CatalogItemAiHintResponse[]> = Object.fromEntries(
    Object.entries(config.historiales ?? HISTORIALES).map(([id, revs]) => [
      Number(id),
      revs.map((r) => ({ ...r })),
    ]),
  )
  const articulos = (config.articulos ?? ARTICULOS).map((a) => ({ ...a }))
  const escrituras: Escritura[] = []
  const lecturas: string[] = []
  let alEscribir: RespuestaAEscritura = config.escritura ?? { clase: 'ok' }
  let alListar: RespuestaAlListado = config.listado ?? { clase: 'ok' }

  /** Las pistas vigentes: la revisión de arriba de cada artículo, si rige. */
  function vigentes(): CatalogItemAiHintResponse[] {
    return Object.values(historiales)
      .map((revs) => revs[0])
      .filter((rev): rev is CatalogItemAiHintResponse => rev !== undefined && rev.current)
      .sort((a, b) => a.catalogItemId - b.catalogItemId)
  }

  await page.route(/\/api\/v1\//, async (route) => {
    const peticion = route.request()
    const url = new URL(peticion.url())
    const ruta = url.pathname.replace(/^.*\/api\/v1/, '')
    const metodo = peticion.method()
    const cors = cabecerasCors(peticion)
    const json = (cuerpo: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: { ...cors, 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })

    // Toda petición con `Authorization` va preflighted al cruzar origen. Sin
    // contestar el OPTIONS el navegador ni llega a mandar el POST.
    if (metodo === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors, body: '' })
      return
    }

    if (metodo !== 'GET') {
      escrituras.push({
        metodo,
        ruta,
        cuerpo: peticion.postData() === null ? null : peticion.postDataJSON(),
      })
      if (alEscribir.clase === 'problema') {
        await route.fulfill({
          status: alEscribir.status,
          headers: {
            ...cors,
            'content-type': 'application/problem+json',
            'x-trace-id': alEscribir.traceId,
          },
          body: JSON.stringify({
            type: 'about:blank',
            title: 'Conflict',
            status: alEscribir.status,
            detail: alEscribir.detail,
            code: alEscribir.code,
          }),
        })
        return
      }
      // El DELETE de verdad cierra la vigencia sin borrar: se hace igual.
      const retirar = /^\/catalog-item-ai-hints\/(\d+)$/.exec(ruta)
      if (metodo === 'DELETE' && retirar) {
        const revs = historiales[Number(retirar[1])]
        const arriba = revs?.[0]
        if (arriba) {
          arriba.current = false
          arriba.supersededAt = RETIRADA_AHORA
          arriba.supersededBySystemUserId = YO
        }
        await route.fulfill({ status: 204, headers: cors, body: '' })
        return
      }
      await json({}, metodo === 'POST' ? 201 : 200)
      return
    }

    lecturas.push(ruta)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20)

    if (ruta === '/auth/me') {
      await json(USUARIO_SIMULADO)
      return
    }

    if (ruta === '/catalog-item-ai-hints') {
      if (alListar.clase === 'problema') {
        await route.fulfill({
          status: alListar.status,
          headers: {
            ...cors,
            'content-type': 'application/problem+json',
            'x-trace-id': alListar.traceId,
          },
          body: JSON.stringify({
            type: 'about:blank',
            title: 'Internal Server Error',
            status: alListar.status,
            detail: alListar.detail,
          }),
        })
        return
      }
      await json(pagina(vigentes(), pageSize))
      return
    }

    const revisiones = /^\/catalog-item-ai-hints\/(\d+)\/revisions$/.exec(ruta)
    if (revisiones) {
      await json(pagina(historiales[Number(revisiones[1])] ?? [], pageSize))
      return
    }

    // 404 es el estado NORMAL de un artículo sin pista vigente. La ficha no lo
    // usa; el listado sí, tras un 409 de «ya tiene pista».
    const vigente = /^\/catalog-item-ai-hints\/(\d+)$/.exec(ruta)
    if (vigente) {
      const arriba = historiales[Number(vigente[1])]?.[0]
      if (arriba?.current) {
        await json(arriba)
        return
      }
      await json({ type: 'about:blank', status: 404, code: 'CATALOG_ITEM_AI_HINT_NOT_FOUND' }, 404)
      return
    }

    if (ruta === '/catalog-items') {
      await json(pagina(articulos, pageSize))
      return
    }

    const item = /^\/catalog-items\/(\d+)$/.exec(ruta)
    if (item) {
      const encontrado = articulos.find((a) => a.id === Number(item[1]))
      if (encontrado) {
        await json(encontrado)
        return
      }
      await json({ type: 'about:blank', status: 404 }, 404)
      return
    }

    await json(PAGINA_VACIA)
  })

  return {
    escrituras,
    lecturas,
    responderAEscrituraCon: (respuesta) => {
      alEscribir = respuesta
    },
    responderAlListadoCon: (respuesta) => {
      alListar = respuesta
    },
  }
}

/**
 * **Preflight que falla rápido.** Comprueba que el arnés está enchufado, y lo
 * comprueba en segundos.
 *
 * <p>La suite del otro front se colgaba en vez de fallar cuando faltaba el
 * servidor: la pantalla se quedaba en blanco y el rojo llegaba sesenta segundos
 * después, con el mensaje de un localizador que no encuentra nada — que no dice
 * NADA de la causa. Aquí, si la aplicación no arranca o si el `page.route` deja
 * de casar (un cambio de prefijo en `VITE_API_URL`, por ejemplo), lo que falla
 * es esta línea, en cinco segundos y diciendo exactamente qué pasó.
 */
async function preflight(page: Page): Promise<void> {
  await expect(page.locator('main#contenido')).toBeVisible({ timeout: 15_000 })
}

/** Abre el listado con sesión sembrada y API interceptada. */
export async function abrirListado(
  page: Page,
  config: ConfigApi = {},
  query = '',
): Promise<ApiSimulada> {
  await bloquearFuentesRemotas(page)
  const api = await montarApi(page, config)
  await seedSession(page)
  await page.goto(`${RUTA_LISTADO}${query}`)
  await preflight(page)
  await expect(page.getByRole('heading', { name: 'Pistas del asistente', level: 1 })).toBeVisible()
  await expect
    .poll(() => api.lecturas.filter((r) => r.startsWith('/catalog-item-ai-hints')).length, {
      timeout: 5_000,
      message:
        'El arnés no interceptó ninguna lectura de /catalog-item-ai-hints: o la aplicación no llegó a pedir el listado, o el `page.route` dejó de casar con la URL de la API.',
    })
    .toBeGreaterThan(0)
  await esperarVeloOculto(page)
  return api
}

/** Abre la ficha de un artículo. */
export async function abrirFicha(
  page: Page,
  catalogItemId: number,
  config: ConfigApi = {},
): Promise<ApiSimulada> {
  await bloquearFuentesRemotas(page)
  const api = await montarApi(page, config)
  await seedSession(page)
  await page.goto(rutaFicha(catalogItemId))
  await preflight(page)
  await expect
    .poll(() => api.lecturas.filter((r) => r.endsWith('/revisions')).length, {
      timeout: 5_000,
      message:
        'El arnés no interceptó ninguna lectura de /revisions: la ficha no llegó a pedir el historial.',
    })
    .toBeGreaterThan(0)
  await esperarVeloOculto(page)
  return api
}

// ───────────────────────────────────────────────────────────────────────────
// Localizadores
//
// Por ROL y NOMBRE ACCESIBLE siempre que se puede: así la prueba comprueba de
// paso la accesibilidad, que es lo que un `data-testid` no mira.
//
// ⚠️ Regla que esta suite respeta a rajatabla: **cuando el texto es lo que se
// está verificando, no se usa además como localizador**. Un rótulo equivocado
// haría fallar la prueba diciendo «no lo encuentro», que señala al sitio
// equivocado. Por eso el botón de retirar de una fila se localiza por su
// POSICIÓN dentro de la fila (ver {@link botonRetirarDeLaFila}) y el de enviar
// del compositor por ser el último del pie del diálogo.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Las filas de datos, sin el esqueleto de carga.
 *
 * <p>`AppTable` pinta el esqueleto en un `<tbody aria-hidden="true">` aparte, y
 * contar `tbody tr` a secas mezclaría cinco filas falsas con las de verdad
 * según lo rápido que conteste el arnés — una prueba que pasa o falla por
 * carrera.
 */
export const filas = (page: Page) => page.locator('tbody:not([aria-hidden="true"]) tr')

/**
 * La fila de un artículo, localizada por el `href` de su enlace al historial.
 *
 * <p>Estructural a propósito: el `catalogItemId` de la ruta es un identificador
 * del producto, no un texto traducible, y sobre todo <b>no es ninguno de los
 * textos que esta suite verifica</b>.
 */
export const fila = (page: Page, catalogItemId: number): Locator =>
  filas(page).filter({ has: page.locator(`a[href="${rutaFicha(catalogItemId)}"]`) })

/** Las seis celdas de una fila, por índice: 0 Código · 1 Artículo · 2 Primer bloque · 3 Rev. · 4 Publicada. */
export const celda = (row: Locator, indice: number) => row.locator('td').nth(indice)

/**
 * El botón de retirar de una fila, **por posición y no por su rótulo**.
 *
 * <p>La celda de acciones lleva un enlace (historial) y dos botones, en este
 * orden: corregir, retirar. El nombre accesible de ese botón —«Retirar la pista
 * de X»— es justo lo que otro caso de esta suite verifica: usarlo también como
 * localizador convertiría un rótulo equivocado en un «no lo encuentro», y el
 * rojo señalaría al caso del foco en vez de al del rótulo.
 */
export const botonRetirarDeLaFila = (row: Locator) => row.getByRole('button').nth(1)

/** El botón de corregir de una fila. Mismo criterio: posición, no rótulo. */
export const botonCorregirDeLaFila = (row: Locator) => row.getByRole('button').nth(0)

/** Las dos pestañas. `role="tab"` es del producto (patrón APG), no del test. */
export const pestanas = (page: Page) => page.getByRole('tab')
export const pestanaActiva = (page: Page) => page.getByRole('tab', { selected: true })

/** El diálogo de retirada: `role="alertdialog"` es un ancla del producto. */
export const dialogoRetirada = (page: Page) => page.getByRole('alertdialog')

/**
 * El botón rojo que retira: **el último del diálogo**, no su rótulo.
 *
 * <p>Es el botón que apaga comercialmente un artículo, y su rótulo —«Retirar la
 * pista»— es uno de los textos que esta suite verifica. Localizarlo por él
 * convertiría un rótulo equivocado en un «no lo encuentro»: la prueba fallaría,
 * sí, pero señalando al caso del foco en vez de al del texto.
 */
export const botonConfirmarRetirada = (page: Page) =>
  dialogoRetirada(page).getByRole('button').last()

/** El compositor: `ModalShell` con `role="dialog"` por defecto. */
export const compositor = (page: Page) => page.getByRole('dialog')

/**
 * El botón que envía el compositor: **el último del pie**, no su rótulo.
 *
 * <p>Ese rótulo —«Publicar la pista» / «Publicar la revisión N»— es exactamente
 * lo que se verifica, así que no puede ser también el localizador.
 */
export const botonEnviarDelCompositor = (page: Page) => compositor(page).getByRole('button').last()

/** El resumen de errores del compositor (`ErrorSummary`), por su ancla del producto. */
export const resumenDeErrores = (page: Page) => page.locator('[data-error-anchor]')

/** La cabecera de estado de la ficha. Ver el `data-testid` de `CatalogAiHintDetailView`. */
export const estadoDeLaFicha = (page: Page) => page.getByTestId('estado-pista')

/** El historial de la ficha. Ver el `data-testid` de `HintRevisionList`. */
export const historial = (page: Page) => page.getByTestId('historial-revisiones')
export const revision = (page: Page, indice: number) =>
  historial(page).getByRole('listitem').nth(indice)

/** Qué tiene el foco ahora mismo, en una etiqueta legible para el mensaje de fallo. */
export async function elementoConFoco(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el) return 'ninguno'
    const rol = el.getAttribute('role') ?? el.tagName.toLowerCase()
    const nombre = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? ''
    return `${rol}: ${nombre}`
  })
}
