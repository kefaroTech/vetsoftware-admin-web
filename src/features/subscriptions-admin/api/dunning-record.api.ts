import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type { DunningEventResponse, RecordDunningEventRequest } from '../types/dunning-record.types'

/**
 * Los dos endpoints de `/cobranza` (§4.4.2, tarea W2-F).
 *
 * <p><b>Ninguno de los dos recibe la empresa como argumento del servidor.</b>
 * `DunningEventController` la pone con `authz.currentCompanyId()`, que para el
 * operador de esta consola —un `SystemUserContext`— lee la cabecera
 * `X-Company-Id`. Por eso `companyId` es un parámetro <b>obligatorio y
 * explícito</b> de los dos métodos, igual que en `entitlements.api.ts` y en
 * `subscription-record.api.ts`: no hay interceptor que lo adivine de un store, y
 * una cabecera invisible que cambia de qué empresa se está anotando un aviso es
 * el mecanismo con el que se ensucia el expediente de la clínica equivocada.
 *
 * <p><b>Por qué esta escritura vive aquí y no en `/cobranza` global.</b> W1-E la
 * dejó fuera a propósito: su pantalla es cross-tenant y allí la empresa sería
 * implícita. Aquí es explícita, está en la URL y está pintada en la cabecera del
 * expediente.
 *
 * <p><b>No hay `update` ni `remove`, y no es un olvido.</b> El controller solo
 * expone `GET` y `POST`, y su javadoc dice por qué: «una bitácora que se puede
 * reescribir u ocultar no demuestra nada». Corregir un evento mal anotado es
 * anotar otro.
 */
export const dunningRecordApi = {
  /**
   * El expediente de este contrato, <b>en orden cronológico ascendente</b>.
   *
   * <p>El orden lo garantiza el servidor y es total —`occurredAt ASC` con el
   * `id` de desempate (`JpaDunningEventRepository:57-58`)—, así que esta pantalla
   * <b>no reordena en cliente</b>: la película que se lee es la que manda el
   * backend. Es justo lo contrario del feed global de W1-E, que ordena
   * `newestFirst()` porque es una bandeja de trabajo y ahí lo urgente es lo más
   * viejo sin atender.
   *
   * <p>`page` es el índice desde 0 del backend.
   */
  async listBySubscription(
    companyId: number,
    subscriptionId: number,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<DunningEventResponse>> {
    const { data } = await http.get<PageResponse<DunningEventResponse>>('/dunning-events', {
      companyId,
      params: { subscriptionId, page, pageSize },
      signal,
    })
    return data
  },

  /**
   * Anota un hito. Responde <b>201</b>: no modifica nada, añade una fila.
   *
   * <p>`subscriptionId` viaja en el cuerpo, pero el contrato al que se ata lo
   * resuelve el servidor acotado por empresa (`findByIdAndCompanyId`), así que un
   * par (empresa, contrato) que no case responde 400 y no ensucia el expediente
   * de nadie.
   */
  async create(
    companyId: number,
    payload: RecordDunningEventRequest,
  ): Promise<DunningEventResponse> {
    const { data } = await http.post<DunningEventResponse>('/dunning-events', payload, {
      companyId,
    })
    return data
  },
}
