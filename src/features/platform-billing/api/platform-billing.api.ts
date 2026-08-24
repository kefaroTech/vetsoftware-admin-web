import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  BillingDocumentSequenceResponse,
  CreateBillingDocumentSequenceRequest,
  PlatformBillingConfigResponse,
  UpdatePlatformBillingConfigRequest,
} from '../types/platform-billing.types'

/**
 * Las cuatro rutas de la pantalla de facturación de plataforma (§4.6).
 *
 * <p><b>Ninguna necesita `X-Company-Id`.</b> Las dos de `/platform-billing-config`
 * son configuración global —la tabla no tiene `company_id` y el controller no
 * usa `Authz`— y las dos de `/system/billing-document-sequences` son de sistema.
 * Por eso esta pantalla es implementable hoy, sin esperar a W1-A (§1.1 y §7).
 *
 * <p><b>Por qué `find` y no `findById`.</b> El vocabulario fijo del repositorio
 * es `listAll`/`findById`/`create`/`update`/`remove`, pero aquí no hay ni lista
 * ni identificador que pasar: el recurso es singular por esquema y su ruta no
 * lleva `/{id}`. `findById` obligaría a inventarse un identificador y `listAll`
 * mentiría sobre que hay una colección detrás — que es exactamente el error de
 * diseño que §4.6 pide no cometer («no montes un CRUD ni un listado con un solo
 * elemento»).
 *
 * <p>Nota de frontera: `features/platform-setup/api/platform-setup.api.ts`
 * mantiene sus propias sondas de solo lectura sobre estas mismas dos rutas. No es
 * deriva: la lista de puesta en marcha pregunta por siete cosas a la vez y
 * necesita su propio `probe` con abortos y tolerancia a fallos, mientras que
 * estos métodos escriben. Es el mismo reparto que ya hay entre
 * `configuratorQuestionsApi` (sonda) y `configuratorApi` (la feature).
 */
export const platformBillingConfigApi = {
  async find(signal?: AbortSignal): Promise<PlatformBillingConfigResponse> {
    const { data } = await http.get<PlatformBillingConfigResponse>('/platform-billing-config', {
      signal,
    })
    return data
  },

  /**
   * Reemplaza la fila entera. El servidor **no** hace upsert: si la fila no
   * existe responde con el mismo 503 que la lectura, con el mismo mensaje y el
   * mismo remedio (`UpdatePlatformBillingConfigService.java:41-50`).
   */
  async update(
    payload: UpdatePlatformBillingConfigRequest,
  ): Promise<PlatformBillingConfigResponse> {
    const { data } = await http.put<PlatformBillingConfigResponse>(
      '/platform-billing-config',
      payload,
    )
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

  /** Alta y nada más: la familia no expone `PUT` ni `DELETE`. */
  async create(
    payload: CreateBillingDocumentSequenceRequest,
  ): Promise<BillingDocumentSequenceResponse> {
    const { data } = await http.post<BillingDocumentSequenceResponse>(
      '/system/billing-document-sequences',
      payload,
    )
    return data
  },
}
