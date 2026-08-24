import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type { ConfiguratorQuestionResponse } from '@/features/configurator/types/configurator.types'
import type {
  BillingDocumentSequenceResponse,
  PlatformBillingConfigResponse,
} from '@/features/platform-billing/types/platform-billing.types'

/**
 * Las cuatro rutas que la lista de comprobación necesita y que hoy no tiene
 * ningún cliente en esta consola.
 *
 * Las otras tres —`/catalog-items`, `/price-lists`, `/catalog-prices`— sí lo
 * tienen (`features/commercial-catalog/api/commercial-catalog.api.ts`) y se
 * **reutilizan**: duplicar aquí un `listAll` de artículos sería la primera copia
 * de un cliente que ya existe.
 *
 * Los siete `GET` son **globales de plataforma** (§1.1): ninguno resuelve la
 * empresa con `Authz.currentCompanyId()`, así que ninguno necesita la cabecera
 * `X-Company-Id` y todos funcionan hoy desde esta consola.
 *
 * ⚠️ **Frontera de tareas.** Los DTO de §4.6 (W1-F) y §4.2 (W1-C) ya viven en
 * sus features dueñas y este módulo los importa. Con W3-A, el cliente del puente
 * de submódulos (§4.1) hizo lo mismo: vive en `commercial-catalog` y aquí solo
 * se re-exporta. Lo que se queda aquí son las **sondas**: la lista de
 * comprobación pregunta por siete cosas a la vez, con aborto y tolerancia a
 * fallos, y ninguna de ellas escribe. Es el mismo reparto que hay con el
 * configurador, cuyo cliente completo vive en su feature.
 */

export const platformBillingConfigApi = {
  /**
   * `find` y no `findById`: el recurso es singular —una fila garantizada por el
   * esquema— y la ruta no tiene `/{id}`.
   */
  async find(signal?: AbortSignal): Promise<PlatformBillingConfigResponse> {
    const { data } = await http.get<PlatformBillingConfigResponse>('/platform-billing-config', {
      signal,
    })
    return data
  },
}

export const billingDocumentSequencesApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<BillingDocumentSequenceResponse>> {
    const { data } = await http.get<PageResponse<BillingDocumentSequenceResponse>>(
      '/system/billing-document-sequences',
      { params: { page, pageSize }, signal },
    )
    return data
  },
}

export const configuratorQuestionsApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<ConfiguratorQuestionResponse>> {
    const { data } = await http.get<PageResponse<ConfiguratorQuestionResponse>>(
      '/configurator/questions',
      { params: { page, pageSize }, signal },
    )
    return data
  },
}

/**
 * El puente de submódulos ya tiene dueño: su editor (§4.1, tarea W3-A) vive en
 * `features/commercial-catalog`, y el cliente completo —con el `POST` y el
 * `DELETE` que esta sonda no necesita— está allí.
 *
 * <p>Se **re-exporta** en vez de mudarse el import a los llamadores por lo que
 * dice la cabecera de este módulo: aquí se queda la sonda, y la sonda sigue
 * llamando a `catalogItemSubModulesApi.listByCatalogItem`. Duplicar el `GET`
 * habría sido la primera copia de un cliente que ya existe, que es exactamente
 * lo que este fichero se prohíbe.
 */
export { catalogItemSubModulesApi } from '@/features/commercial-catalog/api/commercial-catalog.api'
