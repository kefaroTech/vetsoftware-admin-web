import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  SubscriptionAmendmentResponse,
  SubscriptionStatusChangeResponse,
} from '../types/subscription-history.types'

/**
 * Las dos rutas de lectura de `/historia` (§4.4.2, tarea W2-C).
 *
 * <p><b>Las dos exigen `X-Company-Id`</b>, como las tres del expediente: el
 * controller resuelve la empresa con `Authz.currentCompanyId()` y para el
 * operador de esta consola eso es la cabecera. Por eso `companyId` es un
 * parámetro obligatorio y explícito, no algo que un interceptor adivine de un
 * store — el mismo criterio que dejó escrito `subscription-record.api.ts` y por
 * el mismo motivo: una cabecera invisible que decide sobre qué empresa se
 * consulta es la que un día devuelve el expediente de otra.
 *
 * <p><b>Solo hay lectura.</b> No existe `POST`, `PUT` ni `DELETE` sobre ninguna
 * de las dos: un otrosí lo emite el backend como efecto de una operación sobre el
 * contrato, y la bitácora solo se inserta. Esta ausencia no es un hueco pendiente
 * de rellenar; es el modelo.
 *
 * <p><b>Fichero propio y no un método más en `subscription-record.api.ts`.</b>
 * Aquel es el cliente del armazón (W2-A) y las cinco sub-vistas de la onda 2 se
 * escriben a la vez: cada una trae el suyo y ninguna edita el de otra.
 */
export const subscriptionHistoryApi = {
  /**
   * Los otrosíes del contrato.
   *
   * <p>⚠️ <b>Vienen del más antiguo al más reciente</b>
   * (`JpaSubscriptionAmendmentRepository.order()`: `effectiveDate ASC, id ASC`) y
   * el endpoint <b>no acepta parámetro de orden</b>. Es el orden contrario al de
   * `listStatusHistory`, y esa asimetría es la razón de que el composable cargue
   * el expediente completo antes de ordenarlo en vez de fusionar la primera
   * página de cada uno: la primera página de aquí es lo más viejo y la de allí lo
   * más nuevo, así que mezclarlas produciría una película con el principio y el
   * final pegados y nada en medio.
   */
  async listAmendments(
    subscriptionId: number,
    companyId: number,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<SubscriptionAmendmentResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionAmendmentResponse>>(
      `/subscriptions/${subscriptionId}/amendments`,
      { companyId, signal, params: { page, pageSize } },
    )
    return data
  },

  /**
   * La bitácora de estados.
   *
   * <p>⚠️ Viene del más reciente al más antiguo (`occurredAt DESC, id DESC`), al
   * revés que los otrosíes. Tampoco acepta parámetro de orden.
   */
  async listStatusHistory(
    subscriptionId: number,
    companyId: number,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<SubscriptionStatusChangeResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionStatusChangeResponse>>(
      `/subscriptions/${subscriptionId}/status-history`,
      { companyId, signal, params: { page, pageSize } },
    )
    return data
  },
}
