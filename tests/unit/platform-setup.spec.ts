import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { AxiosError, type AxiosResponse } from 'axios'
import type { PageResponse } from '@/types/pagination'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * La puesta en marcha de la plataforma (§3.7 de
 * `docs/ux/suscripciones-consola-especificacion.md`).
 *
 * Lo que se afirma aquí no es «el componente pinta seis filas»: es la propiedad
 * de la que depende que la lista sirva de algo — **que no mienta**. Un paso en
 * «Listo» donde el alta va a fallar, o en «Pendiente» donde en realidad no se
 * pudo preguntar, manda al operador a arreglar lo que no está roto y le esconde
 * lo que sí. Es el mismo defecto que EST-12 (`sidebar-sin-cifras-inventadas`):
 * la interfaz afirmando un hecho falso sobre el estado del sistema.
 */

const catalogItemsApi = { listAll: vi.fn() }
const priceListsApi = { listAll: vi.fn() }
const catalogPricesApi = { listByPriceList: vi.fn() }
const platformBillingConfigApi = { find: vi.fn() }
const billingDocumentSequencesApi = { listAll: vi.fn() }
const catalogItemSubModulesApi = { listByCatalogItem: vi.fn() }

vi.mock('@/features/commercial-catalog/api/commercial-catalog.api', () => ({
  catalogItemsApi,
  priceListsApi,
  catalogPricesApi,
}))

vi.mock('@/features/platform-setup/api/platform-setup.api', () => ({
  platformBillingConfigApi,
  billingDocumentSequencesApi,
  catalogItemSubModulesApi,
}))

const { usePlatformSetup, stepsFlaggedByServer, isPlatformSetupProblem } =
  await import('@/features/platform-setup/composables/usePlatformSetup')
const PlatformSetupChecklist = (await import('@/components/feedback/PlatformSetupChecklist.vue'))
  .default

function page<T>(content: T[]): PageResponse<T> {
  return { content, page: 0, pageSize: 200, totalElements: content.length, totalPages: 1 }
}

/** Un artículo del catálogo, con los campos que el contrato obliga a declarar. */
function item(overrides: Partial<CatalogItemResponse> = {}): CatalogItemResponse {
  return {
    id: 1,
    code: 'CORE',
    name: 'Núcleo',
    shortDescription: null,
    longDescription: null,
    itemType: 'MODULE',
    capacityUnit: null,
    core: true,
    minQuantity: 1,
    maxQuantity: null,
    sortOrder: 1,
    status: 'ACTIVE',
    createdDate: '2026-08-01',
    enabled: true,
    defaultTrialDays: null,
    ...overrides,
  }
}

/** La plataforma recién desplegada: nada sembrado, todo responde vacío. */
function plataformaSinSembrar() {
  catalogItemsApi.listAll.mockResolvedValue(page<CatalogItemResponse>([]))
  priceListsApi.listAll.mockResolvedValue(page([]))
  catalogPricesApi.listByPriceList.mockResolvedValue(page([]))
  platformBillingConfigApi.find.mockResolvedValue({
    id: 1,
    defaultPriceList: null,
    defaultGraceDays: 5,
    defaultTrialDays: 15,
    invoiceDayOfMonth: 1,
    defaultPaymentTermDays: 0,
    externalBillingProvider: null,
    createdDate: '2026-08-01',
  })
  billingDocumentSequencesApi.listAll.mockResolvedValue(page([]))
  catalogItemSubModulesApi.listByCatalogItem.mockResolvedValue([])
}

/**
 * Un error de axios con el `ProblemDetail` que emite el backend.
 *
 * Tiene que ser un `AxiosError` **de verdad**: los lectores de `http.client`
 * discriminan con `error instanceof AxiosError`, no con `axios.isAxiosError`, así
 * que un objeto plano con `isAxiosError: true` pasaría de largo y la prueba
 * mediría el camino del fallback en vez del que se quiere afirmar.
 */
function problemDetail(code: string, detail: string): AxiosError {
  const error = new AxiosError('Request failed with status code 409', 'ERR_BAD_REQUEST')
  error.response = {
    status: 409,
    statusText: 'Conflict',
    data: { code, detail, title: 'Conflict', status: 409 },
    headers: {},
    config: { headers: {} },
  } as unknown as AxiosResponse
  return error
}

beforeEach(() => {
  vi.clearAllMocks()
  plataformaSinSembrar()
})

describe('la lista de comprobación de la puesta en marcha', () => {
  it('con la plataforma sin sembrar declara seis pasos obligatorios y ninguno hecho', async () => {
    const setup = usePlatformSetup()
    await setup.load()

    expect(setup.steps.value.map((s) => s.id)).toEqual([
      'catalog-item',
      'sub-modules',
      'price-list',
      'catalog-prices',
      'billing-config',
      'document-sequence',
    ])
    // El recuento que se pinta —«{n} de 6 pasos obligatorios completados»— sale
    // de aquí. Los seis pasos son obligatorios: desde que el configurador se
    // retiró del producto no queda ningún paso «recomendado» fuera del
    // denominador, así que el total sondeado y el denominador coinciden.
    expect(setup.requiredTotal.value).toBe(6)
    expect(setup.requiredDone.value).toBe(0)
    expect(setup.blocked.value).toBe(true)
  })

  it('un artículo activo que no es el núcleo NO da por hecho el paso 1', async () => {
    // El rótulo dice «al menos un artículo ACTIVE», pero lo que el alta exige es
    // el artículo CORE: `PlatformCatalogTemplateJpaRepository` une por
    // `code='CORE' AND is_core=TRUE AND status='ACTIVE'`. Dar el paso por hecho
    // aquí dejaría al operador con una lista completa y un alta que sigue
    // fallando, sin nada que le dijera dónde mirar.
    catalogItemsApi.listAll.mockResolvedValue(
      page([item({ id: 7, code: 'HISTORIA', name: 'Historia clínica', core: false })]),
    )

    const setup = usePlatformSetup()
    await setup.load()

    expect(setup.steps.value.find((s) => s.id === 'catalog-item')?.state).toBe('pending')
  })

  it('una sonda que falla deja el paso «sin comprobar», nunca en «pendiente»', async () => {
    billingDocumentSequencesApi.listAll.mockRejectedValue(new Error('boom'))

    const setup = usePlatformSetup()
    await setup.load()

    const paso = setup.steps.value.find((s) => s.id === 'document-sequence')
    expect(paso?.state).toBe('unknown')
    expect(paso?.reason).toBeTruthy()
    expect(setup.unknownSteps.value).toHaveLength(1)
  })

  it('que falte la fila de configuración ES el paso 5 sin hacer, no un fallo', async () => {
    // El backend responde 503 `PLATFORM_BILLING_CONFIG_NOT_CONFIGURED` cuando la
    // fila única no existe. Pintarlo como «sin comprobar» escondería un paso que
    // se sabe perfectamente que está pendiente.
    platformBillingConfigApi.find.mockRejectedValue(
      problemDetail('PLATFORM_BILLING_CONFIG_NOT_CONFIGURED', 'Missing row'),
    )

    const setup = usePlatformSetup()
    await setup.load()

    expect(setup.steps.value.find((s) => s.id === 'billing-config')?.state).toBe('pending')
  })
})

describe('el fallo del alta de empresa habla de los MISMOS pasos', () => {
  it('reconoce el rechazo por catálogo sin sembrar por su código, no por su texto', () => {
    // El backend lanza dos excepciones distintas con este mismo código y mensajes
    // muy distintos (409 en inglés desde el alta de la consola, 503 enumerado
    // desde el autoservicio). Atarse a la prosa sería atarse a un texto que el
    // backend puede reescribir mañana.
    expect(isPlatformSetupProblem(problemDetail('PLATFORM_CATALOG_NOT_CONFIGURED', 'x'))).toBe(true)
    expect(isPlatformSetupProblem(problemDetail('COMPANY_ALREADY_EXISTS', 'x'))).toBe(false)
    expect(isPlatformSetupProblem(new Error('boom'))).toBe(false)
  })

  it('traduce las cinco piezas que enumera el servidor a los cinco primeros pasos', () => {
    const detail =
      'La plataforma no tiene catalogo comercial configurado ... Falta el minimo estructural, en este orden: ' +
      "(1) un catalog_items con code='CORE' ...; (2) al menos un catalog_item_sub_modules ...; " +
      "(3) una price_lists en status='PUBLISHED' ...; (4) un catalog_prices de esa lista ...; " +
      '(5) la fila unica de platform_billing_config ...'

    expect(stepsFlaggedByServer(problemDetail('PLATFORM_CATALOG_NOT_CONFIGURED', detail))).toEqual([
      'catalog-item',
      'sub-modules',
      'price-list',
      'catalog-prices',
      'billing-config',
    ])
  })

  it('no inventa pasos cuando el mensaje del servidor no enumera nada', () => {
    // Es el caso real de ESTA consola: `POST /companies` devuelve 409 con
    // «No platform catalog available to create the initial contract for company 42».
    // Sin enumeración, la lista se pinta con el estado sondeado, que es más
    // preciso que cualquier prosa.
    const sinEnumerar = problemDetail(
      'PLATFORM_CATALOG_NOT_CONFIGURED',
      'No platform catalog available to create the initial contract for company 42',
    )
    expect(stepsFlaggedByServer(sinEnumerar)).toEqual([])
  })
})

describe('ningún estado se comunica solo por color (§5.2)', () => {
  it('cada paso lleva su rótulo textual y el encabezado es enfocable', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
    })
    await router.push('/catalogo-comercial')
    await router.isReady()

    const wrapper = mount(PlatformSetupChecklist, { global: { plugins: [router] } })
    await vi.waitFor(() => expect(wrapper.findAll('li')).toHaveLength(6))

    const texto = wrapper.text()
    expect(texto).toContain('Puesta en marcha de la plataforma')
    expect(texto).toContain('0 de 6 pasos obligatorios completados')
    expect(texto).toContain('Pendiente')

    // §5.1 · el foco puede ir al encabezado de lo que hay que hacer ahora.
    expect(wrapper.get('h2').attributes('tabindex')).toBe('-1')
  })
})
