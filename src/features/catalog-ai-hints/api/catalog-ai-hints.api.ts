import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  CatalogItemAiHintResponse,
  PublishCatalogItemAiHintRequest,
  ReviseCatalogItemAiHintRequest,
} from '../types/catalog-ai-hints.types'

/**
 * Los seis puertos de `/catalog-item-ai-hints`, todos `hasRole('SYSTEM')`.
 *
 * <p>⚠️ <b>El identificador de este recurso es el `catalogItemId`, no el `id` de
 * la fila.</b> El recurso es «la pista vigente de un artículo», así que
 * `findById`, `update` y `remove` reciben el artículo y nunca la revisión. Pasar
 * el `id` de una revisión compila y carga otra cosa.
 *
 * <p><b>`findById` responde 404 cuando el artículo no tiene pista vigente</b>, y
 * ese 404 es el estado normal de todo artículo sin pista. La ficha del artículo
 * NO lo usa: se apoya en `listByCatalogItem`, que responde 200 con página vacía
 * (verificado en `ListCatalogItemAiHintRevisionsService`, que resuelve el
 * artículo con `.orElse(null)` y no tiene ninguna rama de excepción).
 */
export const catalogAiHintsApi = {
  /** Las pistas vigentes, paginadas. Sin término de búsqueda: el puerto no lo acepta. */
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<CatalogItemAiHintResponse>> {
    const { data } = await http.get<PageResponse<CatalogItemAiHintResponse>>(
      '/catalog-item-ai-hints',
      { params: { page, pageSize }, signal },
    )
    return data
  },

  /** La vigente de un artículo. 404 si no tiene. */
  async findById(catalogItemId: number): Promise<CatalogItemAiHintResponse> {
    const { data } = await http.get<CatalogItemAiHintResponse>(
      `/catalog-item-ai-hints/${catalogItemId}`,
    )
    return data
  },

  /** El historial completo de un artículo, de la más nueva a la más vieja. */
  async listByCatalogItem(
    catalogItemId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<CatalogItemAiHintResponse>> {
    const { data } = await http.get<PageResponse<CatalogItemAiHintResponse>>(
      `/catalog-item-ai-hints/${catalogItemId}/revisions`,
      { params: { page, pageSize }, signal },
    )
    return data
  },

  /** Publica la primera pista. 409 si el artículo ya tiene una vigente. */
  async create(payload: PublishCatalogItemAiHintRequest): Promise<CatalogItemAiHintResponse> {
    const { data } = await http.post<CatalogItemAiHintResponse>('/catalog-item-ai-hints', payload)
    return data
  },

  /** Corrige: sucede la vigente y publica la revisión siguiente. */
  async update(
    catalogItemId: number,
    payload: ReviseCatalogItemAiHintRequest,
  ): Promise<CatalogItemAiHintResponse> {
    const { data } = await http.put<CatalogItemAiHintResponse>(
      `/catalog-item-ai-hints/${catalogItemId}`,
      payload,
    )
    return data
  },

  /**
   * Retira: cierra la vigencia sin sucesora. No borra nada.
   *
   * <p>⚠️ <b>Sin cuerpo</b>, y por eso esta pantalla no pide un motivo: no habría
   * dónde escribirlo. El firmante lo pone el servidor desde el principal.
   */
  async remove(catalogItemId: number): Promise<void> {
    await http.delete(`/catalog-item-ai-hints/${catalogItemId}`)
  },
}
