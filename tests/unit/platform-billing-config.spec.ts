import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import type { PageResponse } from '@/types/pagination'
import type { PriceListResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Facturación de plataforma (§4.6 de
 * `docs/ux/suscripciones-consola-especificacion.md`, tarea W1-F).
 *
 * <p>Lo que se afirma aquí no es «la pantalla pinta seis campos». Es la propiedad
 * de la que depende que esta pantalla sirva de algo el día que de verdad hace
 * falta: <b>que el mensaje del servidor llegue entero al operador</b>.
 *
 * <p>Cuando la fila única de `platform_billing_config` no existe, el backend
 * responde 503 con un `ProblemDetail` cuyo `detail` trae el remedio literal — el
 * `INSERT` que hay que sembrar—. Ese caso no es un caso de negocio, es un
 * despliegue incompleto, y ningún reintento lo arregla. Si el front lo resume, lo
 * recorta o lo cambia por un «Servicio no disponible», el operador se queda sin
 * lo único que resuelve el problema y abre un ticket describiendo un problema
 * distinto del que tiene (§3.7, GOV.UK *Validation pattern*).
 */

const platformBillingConfigApi = { find: vi.fn(), update: vi.fn() }
const billingDocumentSequencesApi = { listAll: vi.fn(), create: vi.fn() }
const priceListsApi = { listAll: vi.fn() }

vi.mock('@/features/platform-billing/api/platform-billing.api', () => ({
  platformBillingConfigApi,
  billingDocumentSequencesApi,
}))

vi.mock('@/features/commercial-catalog/api/commercial-catalog.api', () => ({
  priceListsApi,
  catalogItemsApi: { listAll: vi.fn() },
  catalogPricesApi: { listByPriceList: vi.fn() },
}))

const { usePlatformBillingConfig } =
  await import('@/features/platform-billing/composables/usePlatformBillingConfig')
const { PLATFORM_BILLING_CONFIG_NOT_CONFIGURED } =
  await import('@/features/platform-billing/types/platform-billing.types')
const { validateDayCount, validateInvoiceDay, validateSequencePrefix } =
  await import('@/features/platform-billing/composables/platformBillingValidators')
const PlatformBillingNotConfigured = (
  await import('@/features/platform-billing/components/PlatformBillingNotConfigured.vue')
).default

/**
 * El mensaje real del backend, copiado de
 * `PlatformBillingConfigNotConfiguredException.java:25-32`. Se usa entero a
 * propósito: si alguien lo recorta «para que quepa», este test lo dice.
 */
const MENSAJE_DEL_SERVIDOR =
  'No existe la fila de configuración de facturación de la plataforma' +
  ' (platform_billing_config). Sin ella el sistema no puede decidir los días de' +
  ' gracia, el día de emisión de los cobros ni el plazo de pago. Es una tabla de' +
  ' una sola fila y debe sembrarse en el mismo changeset que la crea:' +
  ' INSERT INTO platform_billing_config (singleton, default_price_list_id,' +
  ' default_grace_days, default_trial_days, invoice_day_of_month,' +
  ' default_payment_term_days, external_billing_provider, created_date, version)' +
  ' VALUES (1, NULL, 5, 14, 1, 5, NULL, NOW(), 0);'

function problemDetail(status: number, code: string, detail: string): AxiosError {
  const error = new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE')
  error.response = {
    status,
    statusText: 'Service Unavailable',
    data: { code, detail, title: 'Service Unavailable', status },
    headers: { 'x-trace-id': 'abc123' },
    config: { headers: {} },
  } as unknown as AxiosResponse
  return error
}

function priceList(overrides: Partial<PriceListResponse> = {}): PriceListResponse {
  return {
    id: 1,
    code: 'TARIFA-2026',
    name: 'Tarifa 2026',
    currency: 'COP',
    validFrom: '2026-01-01',
    validTo: null,
    status: 'PUBLISHED',
    publishedAt: '2026-01-01T00:00:00',
    publishedBySystemUserId: 1,
    createdDate: '2026-01-01T00:00:00',
    enabled: true,
    ...overrides,
  }
}

function page<T>(content: T[]): PageResponse<T> {
  return { content, page: 0, pageSize: 200, totalElements: content.length, totalPages: 1 }
}

beforeEach(() => {
  vi.clearAllMocks()
  priceListsApi.listAll.mockResolvedValue(page([]))
})

describe('la fila que falta es un despliegue incompleto, no un caso de negocio', () => {
  it('propaga el mensaje del servidor ÍNTEGRO, con su remedio dentro', async () => {
    platformBillingConfigApi.find.mockRejectedValue(
      problemDetail(503, PLATFORM_BILLING_CONFIG_NOT_CONFIGURED, MENSAJE_DEL_SERVIDOR),
    )

    const billing = usePlatformBillingConfig()
    await billing.load()

    expect(billing.notConfigured.value).toBe(true)
    // Idéntico, no «contiene» ni «empieza por»: la sentencia SQL va al final del
    // mensaje y es justo la parte que se pierde al recortar.
    expect(billing.failure.value?.message).toBe(MENSAJE_DEL_SERVIDOR)
    expect(billing.failure.value?.message).toContain('INSERT INTO platform_billing_config')
  })

  it('no se confunde con cualquier otro fallo del servidor', async () => {
    // El 500 no trae remedio y sí admite reintento: la pantalla debe pintar su
    // banner de error normal, no el panel de «falta configuración».
    platformBillingConfigApi.find.mockRejectedValue(
      problemDetail(500, 'INTERNAL_ERROR', 'Algo se rompió al leer la configuración.'),
    )

    const billing = usePlatformBillingConfig()
    await billing.load()

    expect(billing.notConfigured.value).toBe(false)
    expect(billing.failure.value?.message).toBe('Algo se rompió al leer la configuración.')
  })

  it('guardar sobre una base sin sembrar vuelve al mismo estado, no a «vuelve a intentarlo»', async () => {
    // El servicio de actualización no hace upsert: lanza la misma excepción que
    // la lectura. Tratarlo como un fallo de guardado corriente invitaría a
    // reintentar algo que no puede funcionar nunca.
    platformBillingConfigApi.update.mockRejectedValue(
      problemDetail(503, PLATFORM_BILLING_CONFIG_NOT_CONFIGURED, MENSAJE_DEL_SERVIDOR),
    )

    const billing = usePlatformBillingConfig()
    const guardado = await billing.save({
      defaultPriceListId: null,
      defaultGraceDays: 5,
      defaultTrialDays: 14,
      invoiceDayOfMonth: 1,
      defaultPaymentTermDays: 5,
      externalBillingProvider: null,
    })

    expect(guardado).toBe(false)
    expect(billing.notConfigured.value).toBe(true)
    expect(billing.failure.value?.message).toBe(MENSAJE_DEL_SERVIDOR)
    expect(billing.config.value).toBeNull()
  })
})

describe('la tarifa por defecto solo puede ser una publicada', () => {
  it('descarta borradores, archivadas y deshabilitadas', async () => {
    // Apuntar la configuración a un borrador deja el paso 5 de la puesta en
    // marcha por hecho y el alta de empresas rota a la vez: el peor estado
    // posible, porque nada lo delata hasta que alguien intenta dar de alta.
    priceListsApi.listAll.mockResolvedValue(
      page([
        priceList({ id: 1, code: 'PUB', status: 'PUBLISHED' }),
        priceList({ id: 2, code: 'BOR', status: 'DRAFT' }),
        priceList({ id: 3, code: 'ARC', status: 'ARCHIVED' }),
        priceList({ id: 4, code: 'OFF', status: 'PUBLISHED', enabled: false }),
      ]),
    )

    const billing = usePlatformBillingConfig()
    await billing.loadPriceLists()

    expect(billing.priceListOptions.value.map((o) => o.value)).toEqual([1])
  })
})

describe('los mensajes de error dicen qué hacer, no que algo es inválido', () => {
  it('el día de emisión nombra el rango que el DTO declara', () => {
    // §5.6.5 (WCAG §3.3.3 Error Suggestion) y el literal que fija la
    // especificación: «Introduce un día entre 1 y 28», no «Valor inválido».
    expect(validateInvoiceDay('31')).toBe('Introduce un día entre 1 y 28.')
    expect(validateInvoiceDay('0')).toBe('Introduce un día entre 1 y 28.')
    expect(validateInvoiceDay('28')).toBe('')
  })

  it('un contador de días no acepta notación científica por descuido', () => {
    // `Number('5e2')` vale 500. En un campo que decide cuántos días de cortesía
    // se conceden, colarlo sería regalar año y medio de mora sin que nadie lo
    // hubiera escrito.
    expect(validateDayCount('5e2', 'los días de cortesía')).not.toBe('')
    expect(validateDayCount('-3', 'los días de cortesía')).not.toBe('')
    expect(validateDayCount('0', 'los días de cortesía')).toBe('')
  })

  it('el prefijo de una serie enseña el formato con un ejemplo', () => {
    // Sin ejemplo, quien teclea «dc-2026» no sabe si el problema son las
    // minúsculas, el guion o los números — son las tres cosas a la vez.
    expect(validateSequencePrefix('dc-2026')).toContain('Ejemplo: DC')
    expect(validateSequencePrefix('DC')).toBe('')
  })
})

describe('el panel de «falta configuración» enseña el mensaje, no lo resume', () => {
  it('pinta el detalle del servidor tal cual, con el INSERT dentro', () => {
    // El composable puede guardar el mensaje entero y la plantilla tirarlo igual
    // —recortándolo, metiéndolo en un `title` o sustituyéndolo por un genérico—.
    // Esto comprueba el otro extremo de la cadena: lo que acaba en el DOM.
    const wrapper = mount(PlatformBillingNotConfigured, {
      props: { detail: MENSAJE_DEL_SERVIDOR, traceId: 'abc123' },
    })

    expect(wrapper.text()).toContain(MENSAJE_DEL_SERVIDOR)
    expect(wrapper.attributes('role')).toBe('alert')
    // Ni una palabra del vocabulario prohibido de §4 en la pantalla que edita
    // las políticas de mora.
    for (const prohibida of ['bloquear', 'bloquead', 'suspender el acceso', 'inhabilit']) {
      expect(wrapper.text().toLowerCase()).not.toContain(prohibida)
    }
  })
})
