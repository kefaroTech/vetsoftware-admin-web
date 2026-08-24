import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  AddSubscriptionItemRequest,
  ChangeSubscriptionItemQuantityRequest,
  RemoveSubscriptionItemRequest,
  SubscriptionItemResponse,
} from '../types/subscription-items.types'

/**
 * Las cuatro rutas de «Lo contratado» (§3.3 · §4.4.2, tarea W2-B).
 *
 * <p><b>Las cuatro exigen la cabecera `X-Company-Id`</b>, igual que las tres de
 * `subscription-record.api.ts`, y por el mismo motivo: `SubscriptionController`
 * resuelve la empresa con `Authz.currentCompanyId()` y no la recibe en ningún
 * cuerpo. Por eso `companyId` es un parámetro <b>obligatorio y explícito</b> de
 * cada método y no algo que un interceptor adivine de un store: una cabecera
 * invisible que cambia el destinatario de una baja es el mecanismo exacto con el
 * que se da de baja el módulo de la clínica equivocada.
 *
 * <p><b>Ninguno de estos métodos edita una línea.</b> No existe `update` y no lo
 * habrá: `POST /items/quantity` responde <b>201</b> porque cierra una línea y abre
 * otra, y `PATCH /items/remove` escribe `effectiveTo` en vez de borrar. La única
 * escritura que modifica una fila existente es esa fecha de fin, y el propio
 * backend la firma con un otrosí.
 */
export const subscriptionItemsApi = {
  /**
   * El expediente de líneas.
   *
   * <p><b>`onDate` es el parámetro que da sentido a la pantalla</b> y existe en el
   * contrato desde el principio sin que nadie lo usara: con él, el servidor
   * responde qué tenía la clínica ese día aplicando `EffectivePeriod`; sin él,
   * devuelve el expediente completo, <b>con las líneas ya cerradas incluidas</b>.
   * Se omite de los `params` cuando no se pide —no se manda vacío—, porque una
   * cadena vacía no es «sin filtro» para Spring: es una fecha que no parsea.
   *
   * <p>`pageSize` sube a 200 (el techo del backend) porque un contrato tiene
   * decenas de líneas y paginar un expediente que se lee en orden cronológico
   * partiría la respuesta a «qué tenía el 3 de marzo». Si aun así llegara
   * truncado, quien consume compara `totalElements` con lo recibido y lo dice: el
   * silencio sería peor que el aviso.
   */
  async listBySubscription(
    subscriptionId: number,
    companyId: number,
    options: {
      onDate?: string | null
      page?: number
      pageSize?: number
      signal?: AbortSignal
    } = {},
  ): Promise<PageResponse<SubscriptionItemResponse>> {
    const { onDate, page = 0, pageSize = 200, signal } = options
    const { data } = await http.get<PageResponse<SubscriptionItemResponse>>(
      `/subscriptions/${subscriptionId}/items`,
      {
        params: { page, pageSize, ...(onDate ? { onDate } : {}) },
        companyId,
        signal,
      },
    )
    return data
  },

  /** Añade un artículo. Responde 201 con la línea recién abierta. */
  async create(
    subscriptionId: number,
    companyId: number,
    payload: AddSubscriptionItemRequest,
  ): Promise<SubscriptionItemResponse> {
    const { data } = await http.post<SubscriptionItemResponse>(
      `/subscriptions/${subscriptionId}/items`,
      payload,
      { companyId },
    )
    return data
  },

  /**
   * Cambia la cantidad. <b>Lo que devuelve es la línea sucesora</b>, no la que se
   * pidió cambiar: el 201 no es un descuido del backend, es el modelo diciendo que
   * aquí no se edita nada. La anterior queda cerrada en el expediente con su
   * precio congelado.
   */
  async changeQuantity(
    subscriptionId: number,
    companyId: number,
    payload: ChangeSubscriptionItemQuantityRequest,
  ): Promise<SubscriptionItemResponse> {
    const { data } = await http.post<SubscriptionItemResponse>(
      `/subscriptions/${subscriptionId}/items/quantity`,
      payload,
      { companyId },
    )
    return data
  },

  /**
   * Da de baja. <b>No borra</b>: escribe `effectiveTo` y devuelve la misma línea ya
   * cerrada. El nombre es el del contrato (`removeItem`) y se conserva para que
   * quien siga la llamada lo encuentre; lo que se le enseña al operador dice «dar
   * de baja» en todos los textos de esta feature.
   */
  async remove(
    subscriptionId: number,
    companyId: number,
    payload: RemoveSubscriptionItemRequest,
  ): Promise<SubscriptionItemResponse> {
    const { data } = await http.patch<SubscriptionItemResponse>(
      `/subscriptions/${subscriptionId}/items/remove`,
      payload,
      { companyId },
    )
    return data
  },
}
