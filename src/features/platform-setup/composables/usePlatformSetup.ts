import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  getProblemDetailCode,
  getProblemDetailMessage,
  getTraceId,
} from '@/services/http/http.client'
import { parseISODate } from '@/composables/format'
import type { PageResponse } from '@/types/pagination'
import {
  catalogItemsApi,
  catalogPricesApi,
  priceListsApi,
} from '@/features/commercial-catalog/api/commercial-catalog.api'
import type {
  CatalogItemResponse,
  CatalogPriceResponse,
  PriceListResponse,
} from '@/features/commercial-catalog/types/commercial-catalog.types'
import {
  billingDocumentSequencesApi,
  catalogItemSubModulesApi,
  configuratorQuestionsApi,
  platformBillingConfigApi,
} from '../api/platform-setup.api'
import { usePlatformSetupStore } from '../stores/platform-setup.store'
import type { ConfiguratorQuestionResponse } from '@/features/configurator/types/configurator.types'
import type {
  BillingDocumentSequenceResponse,
  PlatformBillingConfigResponse,
} from '@/features/platform-billing/types/platform-billing.types'
import type { PlatformSetupStep, PlatformSetupStepId } from '../types/platform-setup.types'

/**
 * Las siete sondas de la puesta en marcha (§3.7).
 *
 * ── Por qué las condiciones no son literalmente las de la tabla de §3.7 ──────
 *
 * La tabla describe los pasos con el vocabulario del operador; el alta la
 * decide una consulta concreta,
 * `PlatformCatalogTemplateJpaRepository.findInitialContractTemplate`
 * (`VetSoftware/src/main/java/com/vetsoftware/app/subscription/infrastructure/
 * persistence/PlatformCatalogTemplateJpaRepository.java:44-79`), con cinco
 * `JOIN` que exigen más de lo que el rótulo sugiere: el artículo tiene que ser
 * `code='CORE'`, `is_core=TRUE`; el precio, del ciclo contratado y con
 * `tier_min = 1`; la tarifa, la que apunta `platform_billing_config`.
 *
 * Las sondas comprueban **lo que de verdad decide el alta**, y cada paso lleva
 * su `detail` diciéndolo. Una lista que pone «Listo» donde el alta va a fallar
 * es peor que no tener lista: es la interfaz afirmando un hecho falso sobre el
 * estado del sistema, que es exactamente el defecto que este repositorio ya
 * dejó sujeto con una prueba (EST-12, `sidebar-sin-cifras-inventadas.spec.ts`).
 */

/** El tope de filas por página del backend. */
const PROBE_PAGE_SIZE = 200

/**
 * Techo de páginas por sonda. Con 200 filas por página son 1.000 artículos o
 * precios: quien tenga más ya pasó la puesta en marcha hace mucho. El techo
 * existe para que un catálogo grande no dispare una ráfaga de peticiones en una
 * pantalla que solo quiere saber si hay algo.
 */
const MAX_PROBE_PAGES = 5

/**
 * Cuántos artículos se sondean uno a uno para el paso 2. Es el único paso que
 * cuesta una petición **por artículo** (`GET /catalog-items/{id}/sub-modules`),
 * así que se acota; el alta solo exige el puente del núcleo, y el núcleo va
 * siempre el primero de la lista sondeada.
 */
const MAX_SUBMODULE_PROBES = 20

/** El código del `ProblemDetail` con el que el backend rechaza el alta sin catálogo. */
export const PLATFORM_SETUP_PROBLEM_CODE = 'PLATFORM_CATALOG_NOT_CONFIGURED'

/** El código con el que el backend dice que falta la fila de configuración (paso 5). */
const BILLING_CONFIG_MISSING_CODE = 'PLATFORM_BILLING_CONFIG_NOT_CONFIGURED'

/**
 * ¿Este error es «la plataforma no está puesta en marcha»?
 *
 * Se mira el **código** del `ProblemDetail`, no su texto. El backend lanza dos
 * excepciones distintas con este mismo código —una desde el alta de la consola
 * (409, `PlatformCatalogNotConfiguredForSubscriptionException`, con un mensaje
 * en inglés que no enumera nada) y otra desde el autoservicio de registro (503,
 * `PlatformCatalogNotConfiguredException`, con el mensaje que sí enumera las
 * cinco piezas)—. Parsear la prosa para decidir sería atarse a un texto que el
 * backend puede reescribir; el código es el contrato.
 */
export function isPlatformSetupProblem(error: unknown): boolean {
  return getProblemDetailCode(error) === PLATFORM_SETUP_PROBLEM_CODE
}

/** Ordinal enumerado por el servidor → paso de §3.7. Coinciden uno a uno y en orden. */
const SERVER_ORDINAL_TO_STEP: Record<number, PlatformSetupStepId> = {
  1: 'catalog-item',
  2: 'sub-modules',
  3: 'price-list',
  4: 'catalog-prices',
  5: 'billing-config',
}

/**
 * Los pasos que el servidor nombró en su `ProblemDetail`, si los nombró.
 *
 * `PlatformCatalogNotConfiguredException` enumera las cinco piezas que faltan
 * con marcadores `(1)`…`(5)` y en el mismo orden que §3.7 — no por casualidad:
 * las dos listas salen de `docs/db/suscripciones-modelo.md` §6.2. Esto es lo que
 * cierra el círculo de §3.7: el resumen del servidor y la pantalla donde se
 * arregla hablan de los mismos pasos con las mismas palabras.
 *
 * Devuelve `[]` cuando el mensaje no enumera nada —que es el caso del 409 que
 * recibe esta consola— y entonces la lista se pinta con el estado **sondeado**,
 * que es más preciso que cualquier prosa.
 */
export function stepsFlaggedByServer(error: unknown): PlatformSetupStepId[] {
  if (!isPlatformSetupProblem(error)) return []
  const detail = getProblemDetailMessage(error, '')
  const flagged: PlatformSetupStepId[] = []
  for (const match of detail.matchAll(/\((\d)\)/g)) {
    const step = SERVER_ORDINAL_TO_STEP[Number(match[1])]
    if (step && !flagged.includes(step)) flagged.push(step)
  }
  return flagged
}

/** Resultado de una sonda: o el dato, o por qué no se pudo saber. */
type Probe<T> = { ok: true; value: T } | { ok: false; reason: string; code: string | null }

async function probe<T>(run: () => Promise<T>): Promise<Probe<T>> {
  try {
    return { ok: true, value: await run() }
  } catch (e) {
    return {
      ok: false,
      reason: getProblemDetailMessage(e, 'No se pudo comprobar este paso.'),
      code: getProblemDetailCode(e),
    }
  }
}

/** Recorre las páginas de un listado hasta traerlas todas o topar con el techo. */
async function fetchAllPages<T>(
  load: (page: number, pageSize: number) => Promise<PageResponse<T>>,
): Promise<T[]> {
  const first = await load(0, PROBE_PAGE_SIZE)
  const items = [...first.content]
  const pages = Math.min(first.totalPages, MAX_PROBE_PAGES)
  for (let page = 1; page < pages; page += 1) {
    const next = await load(page, PROBE_PAGE_SIZE)
    items.push(...next.content)
  }
  return items
}

/** El artículo núcleo, tal y como lo busca la consulta del alta. */
const isCoreItem = (item: CatalogItemResponse) =>
  item.enabled && item.status === 'ACTIVE' && item.core && item.code === 'CORE'

const isActiveItem = (item: CatalogItemResponse) => item.enabled && item.status === 'ACTIVE'

/** Tarifa publicada y vigente: «ya empezó y todavía no ha terminado». */
function isPublishedAndCurrent(list: PriceListResponse, today: Date): boolean {
  if (!list.enabled || list.status !== 'PUBLISHED' || list.publishedAt === null) return false
  if (list.validTo === null) return true
  const end = parseISODate(list.validTo)
  return end === null || end.getTime() >= today.getTime()
}

export function usePlatformSetup() {
  const store = usePlatformSetupStore()
  const { steps, loading, error, errorTraceId, checkedAt } = storeToRefs(store)

  const requiredSteps = computed(() => steps.value.filter((step) => step.required))
  const requiredTotal = computed(() => requiredSteps.value.length)
  const requiredDone = computed(
    () => requiredSteps.value.filter((step) => step.state === 'done').length,
  )
  const pendingRequired = computed(
    () => requiredSteps.value.filter((step) => step.state !== 'done').length,
  )

  /** Pasos que no se pudieron comprobar. Con alguno, el recuento no es una verdad completa. */
  const unknownSteps = computed(() => steps.value.filter((step) => step.state === 'unknown'))

  /** ¿Falta algo obligatorio? `false` también mientras no se haya sondeado nada. */
  const blocked = computed(() => steps.value.length > 0 && pendingRequired.value > 0)

  /**
   * Sondea los siete pasos y deja el resultado en el store.
   *
   * Se llama al montar cada pantalla que pinte la lista: la regla del proyecto es
   * recargar al abrir, y una lista de puesta en marcha servida de caché diría
   * «Pendiente» justo después de completar el paso. `loading` evita la doble
   * llamada cuando dos componentes se montan a la vez.
   */
  async function load(): Promise<void> {
    if (loading.value) return
    store.setLoading(true)
    store.setError(null)
    try {
      const [items, priceLists, config, sequences, questions] = await Promise.all([
        probe(() => fetchAllPages((page, size) => catalogItemsApi.listAll(page, size))),
        probe(() => fetchAllPages((page, size) => priceListsApi.listAll(page, size))),
        probe(() => platformBillingConfigApi.find()),
        probe(() => billingDocumentSequencesApi.listAll(0, PROBE_PAGE_SIZE)),
        probe(() => configuratorQuestionsApi.listAll(0, 1)),
      ])

      const today = new Date()
      const current = priceLists.ok
        ? (priceLists.value.find((list) => isPublishedAndCurrent(list, today)) ?? null)
        : null

      // La tarifa que mira el alta es la que apunta la configuración, no «alguna
      // publicada»: si son distintas, los precios del paso 4 hay que buscarlos en
      // la que de verdad se va a usar.
      const targetListId = configuredPriceListId(config) ?? current?.id ?? null

      const prices =
        targetListId === null
          ? null
          : await probe(() =>
              fetchAllPages((page, size) =>
                catalogPricesApi.listByPriceList(targetListId, page, size),
              ),
            )

      const bridges = items.ok ? await probeBridges(items.value) : null

      store.setSteps(
        buildSteps({ items, priceLists, config, sequences, questions, prices, bridges, current }),
        new Date().toISOString(),
      )
    } catch (e) {
      // Solo llega aquí un fallo que no es de una sonda concreta (las suyas las
      // captura `probe`): entonces no hay ninguna lista honesta que pintar.
      store.setError(
        getProblemDetailMessage(e, 'No se pudo comprobar la puesta en marcha.'),
        getTraceId(e) ?? null,
      )
    } finally {
      store.setLoading(false)
    }
  }

  return {
    steps,
    loading,
    error,
    errorTraceId,
    checkedAt,
    requiredTotal,
    requiredDone,
    pendingRequired,
    unknownSteps,
    blocked,
    load,
  }
}

function configuredPriceListId(config: Probe<PlatformBillingConfigResponse>): number | null {
  return config.ok ? (config.value.defaultPriceList?.id ?? null) : null
}

/** Puentes de submódulos de los artículos que pueden necesitarlos, el núcleo primero. */
async function probeBridges(
  items: CatalogItemResponse[],
): Promise<{ probed: number; withoutBridge: number; failed: number }> {
  const candidates = items
    .filter((item) => isActiveItem(item) && item.itemType === 'MODULE')
    .sort((a, b) => Number(isCoreItem(b)) - Number(isCoreItem(a)))
    .slice(0, MAX_SUBMODULE_PROBES)

  const results = await Promise.all(
    candidates.map((item) => probe(() => catalogItemSubModulesApi.listByCatalogItem(item.id))),
  )

  return {
    probed: candidates.length,
    withoutBridge: results.filter(
      (r) => r.ok && r.value.filter((bridge) => bridge.enabled).length === 0,
    ).length,
    failed: results.filter((r) => !r.ok).length,
  }
}

interface StepInputs {
  items: Probe<CatalogItemResponse[]>
  priceLists: Probe<PriceListResponse[]>
  config: Probe<PlatformBillingConfigResponse>
  sequences: Probe<PageResponse<BillingDocumentSequenceResponse>>
  questions: Probe<PageResponse<ConfiguratorQuestionResponse>>
  prices: Probe<CatalogPriceResponse[]> | null
  bridges: { probed: number; withoutBridge: number; failed: number } | null
  current: PriceListResponse | null
}

/** La secuencia con la que se numeran las cuentas de cobro. */
const DOCUMENT_SEQUENCE_PREFIX = 'DC'

function buildSteps(input: StepInputs): PlatformSetupStep[] {
  const { items, priceLists, config, sequences, questions, prices, bridges, current } = input
  const coreItem = items.ok ? (items.value.find(isCoreItem) ?? null) : null
  const activeItems = items.ok ? items.value.filter(isActiveItem) : []
  const targetListId = configuredPriceListId(config) ?? current?.id ?? null

  return [
    {
      id: 'catalog-item',
      order: 1,
      label: 'Al menos un artículo ACTIVE en el catálogo',
      detail:
        'El alta exige en concreto el artículo núcleo: código CORE, tipo Módulo, marcado como núcleo y activo.',
      to: '/catalogo-comercial',
      required: true,
      ...resolve(items, () => coreItem !== null),
    },
    {
      id: 'sub-modules',
      order: 2,
      label: 'Cada artículo MODULE activo tiene sus submódulos puenteados',
      detail:
        'Sin el puente se vende un módulo que no abre ninguna pantalla en la app del cliente. Se completa desde el catálogo: abre el artículo y usa «Qué pantallas abre».',
      to: '/catalogo-comercial',
      required: true,
      ...bridgeState(items, bridges),
    },
    {
      id: 'price-list',
      order: 3,
      label: 'Una lista de precios PUBLISHED y vigente',
      detail:
        'Publicada, con fecha de publicación y sin vigencia terminada. Publicar congela la lista y sus precios: es una puerta de un solo sentido.',
      to: '/catalogo-comercial',
      required: true,
      ...resolve(priceLists, () => current !== null),
    },
    {
      id: 'catalog-prices',
      order: 4,
      label: 'Precio para cada artículo activo en esa lista',
      detail:
        'El contrato inicial exige además que el artículo núcleo tenga precio mensual y tramo desde 1.',
      to: '/catalogo-comercial',
      required: true,
      ...priceState(items, prices, activeItems, coreItem, targetListId),
    },
    {
      id: 'billing-config',
      order: 5,
      label: 'Configuración de facturación con lista por defecto',
      detail:
        'Por «tarifa por defecto» es por donde el alta encuentra la lista de precios; sin ella no hay contrato inicial que firmar.',
      to: '/configuracion/facturacion',
      required: true,
      ...billingConfigState(config, priceLists),
    },
    {
      id: 'document-sequence',
      order: 6,
      label: 'Una secuencia de numeración DC',
      detail:
        'El alta de una empresa no la comprueba: lo que falla sin ella es la primera cuenta de cobro que haya que emitir.',
      to: '/configuracion/facturacion',
      required: true,
      ...resolve(sequences, (page) =>
        page.content.some((row) => row.prefix === DOCUMENT_SEQUENCE_PREFIX),
      ),
    },
    {
      id: 'questionnaire',
      order: 7,
      label: 'Cuestionario con al menos una pregunta',
      detail: 'No bloquea el alta. Sin preguntas, el configurador no puede proponer nada.',
      to: '/configurador/cuestionario',
      required: false,
      ...resolve(questions, (page) => page.totalElements > 0),
    },
  ]
}

/** Estado de un paso a partir de su sonda: si no se pudo preguntar, no se afirma nada. */
function resolve<T>(
  source: Probe<T>,
  done: (value: T) => boolean,
): Pick<PlatformSetupStep, 'state' | 'reason'> {
  if (!source.ok) return { state: 'unknown', reason: source.reason }
  return { state: done(source.value) ? 'done' : 'pending', reason: null }
}

function bridgeState(
  items: Probe<CatalogItemResponse[]>,
  bridges: StepInputs['bridges'],
): Pick<PlatformSetupStep, 'state' | 'reason'> {
  if (!items.ok) return { state: 'unknown', reason: items.reason }
  if (bridges === null || bridges.failed > 0) {
    return { state: 'unknown', reason: 'No se pudieron leer los submódulos de algún artículo.' }
  }
  if (bridges.probed === 0) return { state: 'pending', reason: null }
  return { state: bridges.withoutBridge === 0 ? 'done' : 'pending', reason: null }
}

function priceState(
  items: Probe<CatalogItemResponse[]>,
  prices: Probe<CatalogPriceResponse[]> | null,
  activeItems: CatalogItemResponse[],
  coreItem: CatalogItemResponse | null,
  targetListId: number | null,
): Pick<PlatformSetupStep, 'state' | 'reason'> {
  if (!items.ok) return { state: 'unknown', reason: items.reason }
  // Sin tarifa a la que mirar no hay nada que preguntar, y eso no es un fallo:
  // es el paso 3 sin hacer.
  if (targetListId === null || prices === null) return { state: 'pending', reason: null }
  if (!prices.ok) return { state: 'unknown', reason: prices.reason }

  const priced = new Set(prices.value.filter((p) => p.enabled).map((p) => p.catalogItemId))
  const allCovered = activeItems.length > 0 && activeItems.every((item) => priced.has(item.id))
  const coreHasInitialPrice =
    coreItem !== null &&
    prices.value.some(
      (p) =>
        p.enabled &&
        p.catalogItemId === coreItem.id &&
        p.billingCycle === 'MONTHLY' &&
        p.tierMin === 1,
    )

  return { state: allCovered && coreHasInitialPrice ? 'done' : 'pending', reason: null }
}

function billingConfigState(
  config: Probe<PlatformBillingConfigResponse>,
  priceLists: Probe<PriceListResponse[]>,
): Pick<PlatformSetupStep, 'state' | 'reason'> {
  if (!config.ok) {
    // Que la fila no exista ES este paso sin hacer, no un fallo de la sonda.
    if (config.code === BILLING_CONFIG_MISSING_CODE) return { state: 'pending', reason: null }
    return { state: 'unknown', reason: config.reason }
  }
  const configured = config.value.defaultPriceList
  if (configured === null) return { state: 'pending', reason: null }
  if (!priceLists.ok) return { state: 'done', reason: null }

  // El alta exige que la tarifa apuntada esté PUBLICADA: apuntar a un borrador
  // deja la configuración «hecha» y el alta rota, que es el peor de los estados.
  const target = priceLists.value.find((list) => list.id === configured.id)
  const usable = target !== undefined && target.enabled && target.status === 'PUBLISHED'
  return { state: usable ? 'done' : 'pending', reason: null }
}
