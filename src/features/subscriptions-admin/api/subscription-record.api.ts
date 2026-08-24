import { http } from '@/services/http/http.client'
import type { SubscriptionResponse } from '../types/subscriptions-admin.types'
import type {
  CancelSubscriptionRequest,
  ChangeSubscriptionStatusRequest,
} from '../types/subscription-record.types'

/**
 * Las tres rutas del expediente del contrato (§4.4.2, tarea W2-A).
 *
 * <p><b>Las tres exigen la cabecera `X-Company-Id`</b> y por eso los tres
 * métodos piden `companyId` como parámetro <b>obligatorio y explícito</b>, junto
 * al id del contrato. `SubscriptionController` no recibe la empresa en ningún
 * cuerpo: la resuelve con `Authz.currentCompanyId()`, que para el operador de
 * esta consola —un `SystemUserContext`— lee la cabecera y lanza
 * `IllegalArgumentException("X-Company-Id is required for tenant operations")`
 * si falta (§1.1).
 *
 * <p><b>Por qué el parámetro y no un interceptor.</b> W1-A dejó `http.client.ts`
 * aceptando `{ companyId }` por petición y deliberadamente NO añadió ningún
 * interceptor que lo adivine de un store: una cabecera invisible que cambia el
 * destinatario de una cancelación es el mecanismo exacto con el que se cancela
 * el contrato equivocado. Aquí se paga ese diseño: quien llama tiene que decir
 * sobre qué empresa actúa, y la pantalla que llama —el expediente— la tiene
 * escrita en la URL y pintada en la cabecera todo el rato.
 *
 * <p><b>El backend cruza las dos.</b> `repository.findByIdAndCompanyId(id,
 * companyId)` es lo que resuelve las tres rutas, así que un par
 * (empresa, contrato) que no case responde 404 y no toca nada. Un `companyId`
 * equivocado en la URL no puede operar sobre el contrato de otro: falla.
 *
 * <p>No hay `update` ni `create`: el contrato nace con la empresa o con la
 * aceptación de la cotización (§2.1), y sus líneas se cambian con otrosíes desde
 * `/contratado` (W2-B), nunca editando el registro.
 */
export const subscriptionRecordApi = {
  async findById(
    id: number,
    companyId: number,
    signal?: AbortSignal,
  ): Promise<SubscriptionResponse> {
    const { data } = await http.get<SubscriptionResponse>(`/subscriptions/${id}`, {
      companyId,
      signal,
    })
    return data
  },

  /**
   * Cambia el estado de la cuenta. Devuelve el contrato ya con el estado nuevo,
   * que es lo que hace que la cabecera y el banner se repinten solos.
   */
  async changeStatus(
    id: number,
    companyId: number,
    payload: ChangeSubscriptionStatusRequest,
  ): Promise<SubscriptionResponse> {
    const { data } = await http.patch<SubscriptionResponse>(
      `/subscriptions/${id}/status`,
      payload,
      { companyId },
    )
    return data
  },

  /**
   * Pide la baja. <b>No cambia el estado</b>: el contrato sigue vigente hasta la
   * fecha efectiva, que es el periodo ya pagado. Lo que vuelve trae
   * `cancelRequestedAt`, `cancelEffectiveDate` y `cancelReason` rellenos.
   */
  async cancel(
    id: number,
    companyId: number,
    payload: CancelSubscriptionRequest,
  ): Promise<SubscriptionResponse> {
    const { data } = await http.patch<SubscriptionResponse>(
      `/subscriptions/${id}/cancel`,
      payload,
      { companyId },
    )
    return data
  },
}
