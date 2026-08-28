import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  RegisterPaymentRefundRequest,
  SystemPaymentRefundResponse,
} from '../types/payment-refunds.types'

/**
 * Devoluciones de dinero, desde la consola de plataforma.
 *
 * <p><b>Solo dos rutas, y ninguna deshace nada.</b> El contrato publica el listado
 * y el alta; no hay `PUT` ni `DELETE` sobre una devolución. Es coherente con lo que
 * es: la plata ya salió de la cuenta, y un registro que se pudiera borrar dejaría
 * la caja sin explicación. Corregir una devolución equivocada es registrar el
 * movimiento contrario, no borrar este.
 *
 * <p>La empresa va como parámetro de consulta en las dos: <b>nunca es implícita</b>.
 */
const SYSTEM_REFUNDS = '/system/payment-refunds'

export const paymentRefundsApi = {
  /** El feed global de devoluciones, con filtro de empresa resuelto por el servidor. */
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    companyId: number | null = null,
    signal?: AbortSignal,
  ): Promise<PageResponse<SystemPaymentRefundResponse>> {
    const { data } = await http.get<PageResponse<SystemPaymentRefundResponse>>(SYSTEM_REFUNDS, {
      params: { page, pageSize, ...(companyId === null ? {} : { companyId }) },
      signal,
    })
    return data
  },

  /**
   * Registra una devolución. Es una <b>salida de caja</b>: el cuerpo exige importe,
   * medio, fecha de giro, fecha valor, motivo de lista cerrada, motivo escrito y
   * autorizante, y `clientRequestId` impide que un doble clic la gire dos veces.
   */
  async register(
    companyId: number,
    payload: RegisterPaymentRefundRequest,
  ): Promise<SystemPaymentRefundResponse> {
    const { data } = await http.post<SystemPaymentRefundResponse>(SYSTEM_REFUNDS, payload, {
      params: { companyId },
    })
    return data
  },
}
