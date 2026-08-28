import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  RecordPaymentAttemptRequest,
  ReschedulePaymentAttemptRequest,
  SystemPaymentAttemptResponse,
} from '../types/payment-attempts.types'

/**
 * Intentos de cobro, desde la consola de plataforma.
 *
 * <p><b>Todo pasa por `/system/**` y la empresa nunca es implícita</b>: los dos
 * listados la aceptan como filtro opcional del servidor y las dos escrituras la
 * exigen en la URL. Ninguna necesita la cabecera `X-Company-Id`, que es lo que
 * permite operar el feed global sin adivinar sobre qué empresa se está escribiendo.
 *
 * <p><b>Lo que NO está aquí.</b> No existe «reintentar el cobro» — el contrato no
 * publica ninguna ruta que dispare un cobro. Lo que existe es <b>reprogramar</b>
 * cuándo se volverá a intentar (`PATCH …/schedule`), que es otra cosa y se llama
 * por su nombre: quien lo cobra es el proceso de la pasarela, no esta pantalla.
 * Ofrecer un botón «Reintentar ahora» prometería una ejecución inmediata que nadie
 * puede cumplir.
 */
const SYSTEM_ATTEMPTS = '/system/payment-attempts'

export const paymentAttemptsApi = {
  /** El feed global de intentos. `companyId` lo filtra el servidor, así que «ninguno» vale sobre el total. */
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    companyId: number | null = null,
    signal?: AbortSignal,
  ): Promise<PageResponse<SystemPaymentAttemptResponse>> {
    const { data } = await http.get<PageResponse<SystemPaymentAttemptResponse>>(SYSTEM_ATTEMPTS, {
      params: { page, pageSize, ...(companyId === null ? {} : { companyId }) },
      signal,
    })
    return data
  },

  /**
   * Los intentos <b>con reintento vencido o por vencer</b>: la lista de trabajo.
   *
   * <p>`dueBefore` es opcional en el contrato; se manda siempre porque un listado
   * sin corte devolvería también los reintentos de dentro de un mes, y entonces la
   * lista deja de decir qué hacer hoy.
   */
  async listDue(
    dueBefore: string,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<SystemPaymentAttemptResponse>> {
    const { data } = await http.get<PageResponse<SystemPaymentAttemptResponse>>(
      `${SYSTEM_ATTEMPTS}/due`,
      { params: { dueBefore, page, pageSize }, signal },
    )
    return data
  },

  /** Anota un intento y su rechazo. La empresa va como parámetro de consulta obligatorio. */
  async record(
    companyId: number,
    payload: RecordPaymentAttemptRequest,
  ): Promise<SystemPaymentAttemptResponse> {
    const { data } = await http.post<SystemPaymentAttemptResponse>(SYSTEM_ATTEMPTS, payload, {
      params: { companyId },
    })
    return data
  },

  /**
   * Mueve el próximo reintento.
   *
   * <p>No dispara ningún cobro: solo cambia la fecha en la que el proceso lo
   * intentará. Y no se ofrece sobre un rechazo duro — las redes penalizan el
   * reintento excesivo, así que programarlo es programar una multa.
   */
  async reschedule(
    companyId: number,
    attemptId: number,
    payload: ReschedulePaymentAttemptRequest,
  ): Promise<SystemPaymentAttemptResponse> {
    const { data } = await http.patch<SystemPaymentAttemptResponse>(
      `${SYSTEM_ATTEMPTS}/${attemptId}/schedule`,
      payload,
      { params: { companyId } },
    )
    return data
  },
}
