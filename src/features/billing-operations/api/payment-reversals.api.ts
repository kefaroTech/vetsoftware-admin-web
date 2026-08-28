import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  AcknowledgeReversalRequest,
  OpenReversalRequest,
  OpposeReversalRequest,
  PaymentReversalRequestResponse,
  ResolveReversalRequest,
} from '../types/payment-reversals.types'

/**
 * Solicitudes de reversión de pago, desde la consola de plataforma.
 *
 * <p><b>Cinco rutas y ningún borrado</b>: una solicitud se abre, se acusa, se
 * opone y se resuelve. Nunca desaparece — es un expediente, y el día que llegue al
 * regulador lo que importa es la secuencia entera, no el estado final.
 *
 * <p>Los tres `PATCH` son <b>fases distintas del mismo expediente</b> y por eso son
 * tres rutas y no un `status` que se sobreescribe: acusar recibo, oponerse y
 * resolver dejan cada uno su fecha y su prueba, y colapsarlos en un campo perdería
 * exactamente el rastro que la figura legal exige conservar.
 */
const SYSTEM_REVERSALS = '/system/payment-reversal-requests'

export const paymentReversalsApi = {
  /** El feed global de solicitudes, con filtro de empresa resuelto por el servidor. */
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    companyId: number | null = null,
    signal?: AbortSignal,
  ): Promise<PageResponse<PaymentReversalRequestResponse>> {
    const { data } = await http.get<PageResponse<PaymentReversalRequestResponse>>(
      SYSTEM_REVERSALS,
      {
        params: { page, pageSize, ...(companyId === null ? {} : { companyId }) },
        signal,
      },
    )
    return data
  },

  /**
   * Las que vencen antes de una fecha: la lista de trabajo de verdad.
   *
   * <p>Una reversión no contestada a tiempo se pierde por silencio, así que esta
   * lista no es una comodidad — es la única que impide que el plazo corra sin que
   * nadie mire.
   */
  async listExpiring(
    before: string,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<PaymentReversalRequestResponse>> {
    const { data } = await http.get<PageResponse<PaymentReversalRequestResponse>>(
      `${SYSTEM_REVERSALS}/expiring`,
      { params: { before, page, pageSize }, signal },
    )
    return data
  },

  /** Abre la solicitud con su causal tasada y sus tres fechas. */
  async open(
    companyId: number,
    payload: OpenReversalRequest,
  ): Promise<PaymentReversalRequestResponse> {
    const { data } = await http.post<PaymentReversalRequestResponse>(SYSTEM_REVERSALS, payload, {
      params: { companyId },
    })
    return data
  },

  /** Deja constancia de que se acusó recibo, con su referencia. */
  async acknowledge(
    companyId: number,
    id: number,
    payload: AcknowledgeReversalRequest,
  ): Promise<PaymentReversalRequestResponse> {
    const { data } = await http.patch<PaymentReversalRequestResponse>(
      `${SYSTEM_REVERSALS}/${id}/acknowledgement`,
      payload,
      { params: { companyId } },
    )
    return data
  },

  /** Se opone, con uno de los tres motivos tasados y la referencia de su prueba. */
  async oppose(
    companyId: number,
    id: number,
    payload: OpposeReversalRequest,
  ): Promise<PaymentReversalRequestResponse> {
    const { data } = await http.patch<PaymentReversalRequestResponse>(
      `${SYSTEM_REVERSALS}/${id}/opposition`,
      payload,
      { params: { companyId } },
    )
    return data
  },

  /** Cierra el expediente con una de las cuatro salidas. */
  async resolve(
    companyId: number,
    id: number,
    payload: ResolveReversalRequest,
  ): Promise<PaymentReversalRequestResponse> {
    const { data } = await http.patch<PaymentReversalRequestResponse>(
      `${SYSTEM_REVERSALS}/${id}/outcome`,
      payload,
      { params: { companyId } },
    )
    return data
  },
}
