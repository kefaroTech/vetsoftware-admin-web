import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  AcceptQuoteRequest,
  CreateQuoteRequest,
  QuoteResponse,
  QuoteSummaryResponse,
} from '../types/quotes.types'

/**
 * Las 7 rutas de cotizaciones que consume la consola de plataforma.
 *
 * <p><b>`listAll` va a `/quotes/platform`, no a `/quotes`.</b> `GET /quotes` es `listMine` y
 * resuelve la empresa con `Authz.currentCompanyId()`, que para un usuario de sistema exige la
 * cabecera `X-Company-Id`; `/quotes/platform` es `listAll`, documentado en el propio backend como
 * «el embudo completo de la consola de plataforma. Sin filtro de empresa: SYSTEM». Ninguna de
 * estas 7 rutas necesita, pues, ámbito de empresa por cabecera.
 *
 * <p><b>No existe `update`.</b> El contrato no expone `PUT`/`PATCH` sobre una cotización, y no es
 * un descuido: una cotización enviada es un documento y editarla no es una operación que exista.
 * Si el precio cambia, se emite otra. Por eso este objeto solo tiene verbos de crear, consultar y
 * avanzar el estado.
 */
export const quotesApi = {
  /** El embudo completo de la plataforma, paginado. */
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<QuoteSummaryResponse>> {
    const { data } = await http.get<PageResponse<QuoteSummaryResponse>>('/quotes/platform', {
      params: { page, pageSize },
      signal,
    })
    return data
  },

  async findById(id: number, signal?: AbortSignal): Promise<QuoteResponse> {
    const { data } = await http.get<QuoteResponse>(`/quotes/${id}`, { signal })
    return data
  },

  /** Crea el borrador. `clientRequestId` viaja en el cuerpo y es la llave antiduplicados. */
  async create(payload: CreateQuoteRequest): Promise<QuoteResponse> {
    const { data } = await http.post<QuoteResponse>('/quotes', payload)
    return data
  },

  /** Solo tiene sentido en `DRAFT`: borrar una oferta enviada es borrar el embudo comercial. */
  async remove(id: number): Promise<void> {
    await http.delete(`/quotes/${id}`)
  },

  /** La puerta de un solo sentido: a partir de aquí es documento. */
  async send(id: number): Promise<QuoteResponse> {
    const { data } = await http.post<QuoteResponse>(`/quotes/${id}/send`)
    return data
  },

  /** La IP y la marca de tiempo las pone el servidor desde la petición, no este cuerpo. */
  async accept(id: number, payload: AcceptQuoteRequest): Promise<QuoteResponse> {
    const { data } = await http.post<QuoteResponse>(`/quotes/${id}/accept`, payload)
    return data
  },

  async reject(id: number): Promise<QuoteResponse> {
    const { data } = await http.post<QuoteResponse>(`/quotes/${id}/reject`)
    return data
  },
}
