import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  AttachProviderInvoiceRequest,
  BankReceiptResponse,
  ExternalInvoiceReconciliationResponse,
  GatewaySettlementReconciliationResponse,
  GatewaySettlementResponse,
  LinkBankReceiptRequest,
  MatchExternalInvoiceRequest,
  OpenExternalInvoiceReconciliationRequest,
  RegisterBankReceiptRequest,
  RegisterGatewaySettlementRequest,
  ResolveExternalInvoiceReconciliationRequest,
} from '../types/reconciliation.types'

/**
 * Las quince rutas de conciliación. Las tres agrupaciones son deliberadamente
 * independientes: cada una responde a una pregunta distinta del cierre.
 *
 * <p>⚠️ <b>Lo que este cliente NO expone, y no es un olvido.</b> No hay ningún
 * método que devuelva los pagos de una liquidación, ni que busque una
 * liquidación a partir de un pago, ni que acepte `settlementReference` como
 * criterio de búsqueda. Un lote agrupa los cobros de muchas clínicas, así que un
 * método así convertiría el detalle del pago de un cliente en la puerta de
 * entrada al agregado de todos los demás. La cuenta del lote se contrasta con
 * `gatewaySettlementsApi.reconciliation`, que devuelve <b>números</b> —cuántos
 * declara, cuántos hay— y jamás la lista.
 */

const EXTERNAL_INVOICES = '/system/external-invoice-reconciliations'
const SETTLEMENTS = '/system/gateway-settlements'
const BANK_RECEIPTS = '/system/bank-receipts'

export const externalInvoiceReconciliationsApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<ExternalInvoiceReconciliationResponse>> {
    const { data } = await http.get<PageResponse<ExternalInvoiceReconciliationResponse>>(
      EXTERNAL_INVOICES,
      { params: { page, pageSize }, signal },
    )
    return data
  },

  /** El mismo listado acotado a una empresa. `companyId` es un filtro, no una ruta aparte. */
  async listByCompany(
    companyId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<ExternalInvoiceReconciliationResponse>> {
    const { data } = await http.get<PageResponse<ExternalInvoiceReconciliationResponse>>(
      EXTERNAL_INVOICES,
      { params: { companyId, page, pageSize }, signal },
    )
    return data
  },

  /**
   * Los documentos devengados que **nunca recibieron factura externa**.
   *
   * <p>Tiene ruta propia en el backend y no es un filtro del listado general: es
   * la bandeja de trabajo del cierre. Un `MISSING_EXTERNAL` no chirría por
   * ninguna cifra —no hay cifra— así que si hay que ir a buscarlo entre los
   * cuadrados, no se busca.
   */
  async listMissingExternal(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<ExternalInvoiceReconciliationResponse>> {
    const { data } = await http.get<PageResponse<ExternalInvoiceReconciliationResponse>>(
      `${EXTERNAL_INVOICES}/missing-external`,
      { params: { page, pageSize }, signal },
    )
    return data
  },

  async findById(id: number, signal?: AbortSignal): Promise<ExternalInvoiceReconciliationResponse> {
    const { data } = await http.get<ExternalInvoiceReconciliationResponse>(
      `${EXTERNAL_INVOICES}/${id}`,
      { signal },
    )
    return data
  },

  async create(
    companyId: number,
    payload: OpenExternalInvoiceReconciliationRequest,
  ): Promise<ExternalInvoiceReconciliationResponse> {
    const { data } = await http.post<ExternalInvoiceReconciliationResponse>(
      EXTERNAL_INVOICES,
      payload,
      { params: { companyId } },
    )
    return data
  },

  /** Casa la factura del emisor con el documento. Es lo que produce el veredicto. */
  async match(
    id: number,
    payload: MatchExternalInvoiceRequest,
  ): Promise<ExternalInvoiceReconciliationResponse> {
    const { data } = await http.post<ExternalInvoiceReconciliationResponse>(
      `${EXTERNAL_INVOICES}/${id}/external-invoice`,
      payload,
    )
    return data
  },

  /** Cierra el cuadre a mano, con quién, por qué y a qué periodo contable. */
  async resolve(
    id: number,
    payload: ResolveExternalInvoiceReconciliationRequest,
  ): Promise<ExternalInvoiceReconciliationResponse> {
    const { data } = await http.post<ExternalInvoiceReconciliationResponse>(
      `${EXTERNAL_INVOICES}/${id}/resolution`,
      payload,
    )
    return data
  },
}

export const gatewaySettlementsApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<GatewaySettlementResponse>> {
    const { data } = await http.get<PageResponse<GatewaySettlementResponse>>(SETTLEMENTS, {
      params: { page, pageSize },
      signal,
    })
    return data
  },

  async findById(id: number, signal?: AbortSignal): Promise<GatewaySettlementResponse> {
    const { data } = await http.get<GatewaySettlementResponse>(`${SETTLEMENTS}/${id}`, { signal })
    return data
  },

  async create(payload: RegisterGatewaySettlementRequest): Promise<GatewaySettlementResponse> {
    const { data } = await http.post<GatewaySettlementResponse>(SETTLEMENTS, payload)
    return data
  },

  async attachProviderInvoice(
    id: number,
    payload: AttachProviderInvoiceRequest,
  ): Promise<GatewaySettlementResponse> {
    const { data } = await http.patch<GatewaySettlementResponse>(
      `${SETTLEMENTS}/${id}/provider-invoice`,
      payload,
    )
    return data
  },

  async linkBankReceipt(
    id: number,
    payload: LinkBankReceiptRequest,
  ): Promise<GatewaySettlementResponse> {
    const { data } = await http.patch<GatewaySettlementResponse>(
      `${SETTLEMENTS}/${id}/bank-receipt`,
      payload,
    )
    return data
  },

  /**
   * La cuenta del lote contrastada: declarados contra atados.
   *
   * <p>Devuelve <b>solo números</b>. Es a propósito, y es la razón por la que
   * esta pantalla puede decir «falta un pago» sin abrir ninguna vía del cliente
   * al lote.
   */
  async reconciliation(
    id: number,
    signal?: AbortSignal,
  ): Promise<GatewaySettlementReconciliationResponse> {
    const { data } = await http.get<GatewaySettlementReconciliationResponse>(
      `${SETTLEMENTS}/${id}/reconciliation`,
      { signal },
    )
    return data
  },
}

export const bankReceiptsApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<BankReceiptResponse>> {
    const { data } = await http.get<PageResponse<BankReceiptResponse>>(BANK_RECEIPTS, {
      params: { page, pageSize },
      signal,
    })
    return data
  },

  /** La bandeja: dinero que entró y todavía no se sabe de qué es. */
  async listUnidentified(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<BankReceiptResponse>> {
    const { data } = await http.get<PageResponse<BankReceiptResponse>>(
      `${BANK_RECEIPTS}/unidentified`,
      { params: { page, pageSize }, signal },
    )
    return data
  },

  async findById(id: number, signal?: AbortSignal): Promise<BankReceiptResponse> {
    const { data } = await http.get<BankReceiptResponse>(`${BANK_RECEIPTS}/${id}`, { signal })
    return data
  },

  async create(payload: RegisterBankReceiptRequest): Promise<BankReceiptResponse> {
    const { data } = await http.post<BankReceiptResponse>(BANK_RECEIPTS, payload)
    return data
  },

  async identify(id: number): Promise<BankReceiptResponse> {
    const { data } = await http.patch<BankReceiptResponse>(`${BANK_RECEIPTS}/${id}/identify`)
    return data
  },

  async discard(id: number): Promise<BankReceiptResponse> {
    const { data } = await http.patch<BankReceiptResponse>(`${BANK_RECEIPTS}/${id}/discard`)
    return data
  },
}
