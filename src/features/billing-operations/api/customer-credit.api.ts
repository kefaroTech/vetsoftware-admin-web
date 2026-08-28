import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  ConsumeCustomerCreditRequest,
  CustomerCreditBalanceResponse,
  CustomerCreditEntryResponse,
  GrantCustomerCreditRequest,
} from '../types/customer-credit.types'

/**
 * Saldo a favor, desde la consola de plataforma.
 *
 * <p><b>Tres de las escrituras devuelven una LISTA y no un movimiento</b>, y eso no
 * es un detalle de serialización: el saldo es una <b>pila de lotes</b> y consumir
 * salda empezando por el que antes caduca, así que un consumo de 100.000 puede
 * tocar tres lotes y producir tres movimientos. Quien llame a `consume` y espere un
 * objeto perderá dos de los tres.
 *
 * <p><b>Lo que NO está aquí.</b> No hay forma de elegir de qué lote se consume, y
 * es correcto: dejar elegir permitiría gastar el lote de diciembre y perder el de
 * septiembre. El orden lo impone el servidor.
 */
const SYSTEM_CREDIT = '/system/customer-credit'

export const customerCreditApi = {
  /** El saldo consolidado de cada empresa, con la fecha del primer lote que caduca. */
  async listAllBalances(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<CustomerCreditBalanceResponse>> {
    const { data } = await http.get<PageResponse<CustomerCreditBalanceResponse>>(
      `${SYSTEM_CREDIT}/balances`,
      { params: { page, pageSize }, signal },
    )
    return data
  },

  /** Los movimientos de la pila, con filtro de empresa resuelto por el servidor. */
  async listAllEntries(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    companyId: number | null = null,
    signal?: AbortSignal,
  ): Promise<PageResponse<CustomerCreditEntryResponse>> {
    const { data } = await http.get<PageResponse<CustomerCreditEntryResponse>>(
      `${SYSTEM_CREDIT}/entries`,
      {
        params: { page, pageSize, ...(companyId === null ? {} : { companyId }) },
        signal,
      },
    )
    return data
  },

  /**
   * Los lotes que caducan antes de una fecha.
   *
   * <p>Es la lista que evita el daño de esta pantalla: un lote que vence sin
   * consumirse se pierde, y el cliente se entera cuando ya no está.
   */
  async listExpiring(
    before: string,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<CustomerCreditEntryResponse>> {
    const { data } = await http.get<PageResponse<CustomerCreditEntryResponse>>(
      `${SYSTEM_CREDIT}/expiring`,
      { params: { before, page, pageSize }, signal },
    )
    return data
  },

  /** Abre un lote de saldo a favor. Devuelve el movimiento de concesión. */
  async grant(
    companyId: number,
    payload: GrantCustomerCreditRequest,
  ): Promise<CustomerCreditEntryResponse> {
    const { data } = await http.post<CustomerCreditEntryResponse>(
      `${SYSTEM_CREDIT}/grants`,
      payload,
      { params: { companyId } },
    )
    return data
  },

  /**
   * Consume saldo contra un documento.
   *
   * <p>Devuelve <b>un movimiento por lote tocado</b>, en el orden en que el servidor
   * los gastó: primero el que antes caduca. La pantalla los enseña todos, porque
   * enseñar solo el primero haría creer que el consumo fue menor de lo que fue.
   */
  async consume(
    companyId: number,
    payload: ConsumeCustomerCreditRequest,
  ): Promise<CustomerCreditEntryResponse[]> {
    const { data } = await http.post<CustomerCreditEntryResponse[]>(
      `${SYSTEM_CREDIT}/consumptions`,
      payload,
      { params: { companyId } },
    )
    return data
  },

  /**
   * Cierra los lotes ya vencidos de una empresa. <b>No lleva cuerpo</b>: el contrato
   * no declara ninguno, así que no hay dónde guardar un motivo — y por eso esta
   * acción se confirma, no se firma.
   *
   * <p>Devuelve un movimiento por lote caducado. Si la lista vuelve vacía, no había
   * ninguno vencido: eso es un hecho, no un fallo.
   */
  async expire(companyId: number): Promise<CustomerCreditEntryResponse[]> {
    const { data } = await http.post<CustomerCreditEntryResponse[]>(
      `${SYSTEM_CREDIT}/expirations`,
      undefined,
      { params: { companyId } },
    )
    return data
  },
}
