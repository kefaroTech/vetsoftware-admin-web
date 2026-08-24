import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  BillingDocumentResponse,
  DunningEventResponse,
  RegisterExternalInvoiceRequest,
  SubscriptionPaymentResponse,
} from '../types/billing-operations.types'

/**
 * Las cinco rutas de `/system/**` que mueven la cobranza de la plataforma.
 *
 * <p><b>Ninguna necesita la cabecera `X-Company-Id`</b> (§1.1 de la
 * especificación): las tres de lectura son cross-tenant por diseño —el operador
 * de la consola es un `SystemUserContext` y ve el feed completo— y la única
 * escritura lleva `companyId` **en la URL**. Esa es la razón de que esta pantalla
 * se pudiera construir sin esperar a W1-A: la empresa nunca es implícita.
 *
 * <p>Lo que NO está aquí, y no por olvido: `POST /subscription-payments`,
 * `PATCH /subscription-payments/{id}/reconciliation` y `PATCH .../status`
 * resuelven la empresa con `Authz.currentCompanyId()` y por tanto sí exigen la
 * cabecera. Su sitio es el expediente del contrato (onda 2), donde la empresa
 * está a la vista. Ponerlas aquí obligaría a adivinar sobre qué empresa se está
 * actuando, que es exactamente el mecanismo con el que se cancela el contrato
 * equivocado.
 */
const SYSTEM_DOCUMENTS = '/system/subscription-billing/documents'
const SYSTEM_PAYMENTS = '/system/subscription-payments'
const SYSTEM_DUNNING = '/system/dunning-events'

export const billingOperationsApi = {
  /**
   * La lista de trabajo del cierre de mes: documentos calculados aquí que
   * esperan la referencia de la factura fiscal emitida fuera.
   *
   * <p>⚠️ El endpoint solo admite `page` y `pageSize`: **no hay orden ni filtro**.
   * Por eso la pantalla no ordena en cliente — ordenar 20 filas de 300 mentiría
   * sobre cuál es el documento más viejo. Está abierto como issue (B-3).
   */
  async listByAwaitingExternal(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<BillingDocumentResponse>> {
    const { data } = await http.get<PageResponse<BillingDocumentResponse>>(
      `${SYSTEM_DOCUMENTS}/awaiting-external`,
      { params: { page, pageSize }, signal },
    )
    return data
  },

  /** La cartera: documentos con saldo cuya fecha de vencimiento ya pasó. Mismo límite (B-3). */
  async listByOverdue(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<BillingDocumentResponse>> {
    const { data } = await http.get<PageResponse<BillingDocumentResponse>>(
      `${SYSTEM_DOCUMENTS}/overdue`,
      { params: { page, pageSize }, signal },
    )
    return data
  },

  /**
   * Feed global de pagos. A diferencia de los dos de arriba, **sí** admite
   * `companyId`, así que el filtro de esta pestaña lo resuelve el servidor y no
   * el cliente: cuando no hay resultados, «ninguno» es verdad sobre el total y
   * no sobre una página.
   */
  async listByPayments(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    companyId: number | null = null,
    signal?: AbortSignal,
  ): Promise<PageResponse<SubscriptionPaymentResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionPaymentResponse>>(SYSTEM_PAYMENTS, {
      params: { page, pageSize, ...(companyId === null ? {} : { companyId }) },
      signal,
    })
    return data
  },

  /** Feed global de avisos de mora. También admite `companyId` en el servidor. */
  async listByDunningEvents(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    companyId: number | null = null,
    signal?: AbortSignal,
  ): Promise<PageResponse<DunningEventResponse>> {
    const { data } = await http.get<PageResponse<DunningEventResponse>>(SYSTEM_DUNNING, {
      params: { page, pageSize, ...(companyId === null ? {} : { companyId }) },
      signal,
    })
    return data
  },

  /**
   * Registra la referencia de la factura fiscal externa. Es la acción que saca
   * el documento de la lista de pendientes.
   *
   * <p>`companyId` viaja en la URL: es lo que hace que esta escritura funcione
   * desde la consola sin cabecera de empresa, y lo que garantiza que la empresa
   * sobre la que se actúa sea siempre la del propio documento.
   */
  async registerExternalInvoice(
    companyId: number,
    documentId: number,
    payload: RegisterExternalInvoiceRequest,
  ): Promise<BillingDocumentResponse> {
    const { data } = await http.post<BillingDocumentResponse>(
      `/system/subscription-billing/companies/${companyId}/documents/${documentId}/external-invoice`,
      payload,
    )
    return data
  },
}
