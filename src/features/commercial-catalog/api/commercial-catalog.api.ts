import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type { CatalogItemSubModuleResponse } from '@/features/platform-setup/types/platform-setup.types'
import type {
  BundleComponentResponse,
  CatalogItemLimitResponse,
  CreateCatalogItemLimitRequest,
  LimitPropagationResponse,
  PropagateCatalogLimitImprovementRequest,
  UpdateCatalogItemLimitRequest,
  CatalogItemDependencyResponse,
  CatalogItemResponse,
  CatalogPriceResponse,
  CreateBundleComponentRequest,
  CreateCatalogItemDependencyRequest,
  CreateCatalogItemRequest,
  CreateCatalogItemSubModuleRequest,
  CreateCatalogPriceRequest,
  CreatePriceListRequest,
  PriceListResponse,
  UpdateBundleComponentRequest,
  UpdateCatalogItemDependencyRequest,
  UpdateCatalogItemRequest,
  UpdateCatalogPriceRequest,
  UpdatePriceListRequest,
} from '../types/commercial-catalog.types'

export const catalogItemsApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<CatalogItemResponse>> {
    const { data } = await http.get<PageResponse<CatalogItemResponse>>('/catalog-items', {
      params: { page, pageSize },
      signal,
    })
    return data
  },
  async findById(id: number): Promise<CatalogItemResponse> {
    const { data } = await http.get<CatalogItemResponse>(`/catalog-items/${id}`)
    return data
  },
  async create(payload: CreateCatalogItemRequest): Promise<CatalogItemResponse> {
    const { data } = await http.post<CatalogItemResponse>('/catalog-items', payload)
    return data
  },
  async update(id: number, payload: UpdateCatalogItemRequest): Promise<CatalogItemResponse> {
    const { data } = await http.put<CatalogItemResponse>(`/catalog-items/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/catalog-items/${id}`)
  },
  async enable(id: number): Promise<CatalogItemResponse> {
    const { data } = await http.patch<CatalogItemResponse>(`/catalog-items/${id}/enable`)
    return data
  },
}

export const priceListsApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<PriceListResponse>> {
    const { data } = await http.get<PageResponse<PriceListResponse>>('/price-lists', {
      params: { page, pageSize },
      signal,
    })
    return data
  },
  async findById(id: number): Promise<PriceListResponse> {
    const { data } = await http.get<PriceListResponse>(`/price-lists/${id}`)
    return data
  },
  async create(payload: CreatePriceListRequest): Promise<PriceListResponse> {
    const { data } = await http.post<PriceListResponse>('/price-lists', payload)
    return data
  },
  async update(id: number, payload: UpdatePriceListRequest): Promise<PriceListResponse> {
    const { data } = await http.put<PriceListResponse>(`/price-lists/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/price-lists/${id}`)
  },
  async publish(id: number): Promise<PriceListResponse> {
    const { data } = await http.patch<PriceListResponse>(`/price-lists/${id}/publish`)
    return data
  },
  async archive(id: number): Promise<PriceListResponse> {
    const { data } = await http.patch<PriceListResponse>(`/price-lists/${id}/archive`)
    return data
  },
  async enable(id: number): Promise<PriceListResponse> {
    const { data } = await http.patch<PriceListResponse>(`/price-lists/${id}/enable`)
    return data
  },
}

export const catalogPricesApi = {
  async listByPriceList(
    priceListId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<CatalogPriceResponse>> {
    const { data } = await http.get<PageResponse<CatalogPriceResponse>>('/catalog-prices', {
      params: { priceListId, page, pageSize },
      signal,
    })
    return data
  },
  async findById(id: number): Promise<CatalogPriceResponse> {
    const { data } = await http.get<CatalogPriceResponse>(`/catalog-prices/${id}`)
    return data
  },
  async create(payload: CreateCatalogPriceRequest): Promise<CatalogPriceResponse> {
    const { data } = await http.post<CatalogPriceResponse>('/catalog-prices', payload)
    return data
  },
  async update(id: number, payload: UpdateCatalogPriceRequest): Promise<CatalogPriceResponse> {
    const { data } = await http.put<CatalogPriceResponse>(`/catalog-prices/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/catalog-prices/${id}`)
  },
}

// ───────────────────────────────────────────────────────────────────────────
// Los tres puentes del artículo (§4.1, tarea W3-A)
//
// Los tres devuelven **arrays planos, no páginas**: son las líneas de UN
// artículo, no un listado maestro. El backend no expone `page`/`pageSize` en
// ninguna de las tres rutas.
//
// Ninguno lleva `?enabled=`: el `@SQLRestriction` del backend ya esconde los
// vínculos dados de baja. Eso tiene una consecuencia que la interfaz debe
// contar y no redescubrir: un vínculo dado de baja **ocupa su clave única
// siendo invisible**, así que el alta del mismo par no inserta otro, sino que
// **reactiva** el que había (issue #432 del backend, cerrado). Ver
// `useCatalogItemBridges.ts`.
// ───────────────────────────────────────────────────────────────────────────

export const catalogItemSubModulesApi = {
  /** Devuelve un array plano, no una página: es la lista completa del artículo. */
  async listByCatalogItem(
    catalogItemId: number,
    signal?: AbortSignal,
  ): Promise<CatalogItemSubModuleResponse[]> {
    const { data } = await http.get<CatalogItemSubModuleResponse[]>(
      `/catalog-items/${catalogItemId}/sub-modules`,
      { signal },
    )
    return data
  },
  async create(
    catalogItemId: number,
    payload: CreateCatalogItemSubModuleRequest,
  ): Promise<CatalogItemSubModuleResponse> {
    const { data } = await http.post<CatalogItemSubModuleResponse>(
      `/catalog-items/${catalogItemId}/sub-modules`,
      payload,
    )
    return data
  },
  async remove(catalogItemId: number, id: number): Promise<void> {
    await http.delete(`/catalog-items/${catalogItemId}/sub-modules/${id}`)
  },
}

export const catalogItemDependenciesApi = {
  async listByCatalogItem(
    catalogItemId: number,
    signal?: AbortSignal,
  ): Promise<CatalogItemDependencyResponse[]> {
    const { data } = await http.get<CatalogItemDependencyResponse[]>(
      `/catalog-items/${catalogItemId}/dependencies`,
      { signal },
    )
    return data
  },
  async create(
    catalogItemId: number,
    payload: CreateCatalogItemDependencyRequest,
  ): Promise<CatalogItemDependencyResponse> {
    const { data } = await http.post<CatalogItemDependencyResponse>(
      `/catalog-items/${catalogItemId}/dependencies`,
      payload,
    )
    return data
  },
  async update(
    catalogItemId: number,
    id: number,
    payload: UpdateCatalogItemDependencyRequest,
  ): Promise<CatalogItemDependencyResponse> {
    const { data } = await http.put<CatalogItemDependencyResponse>(
      `/catalog-items/${catalogItemId}/dependencies/${id}`,
      payload,
    )
    return data
  },
  async remove(catalogItemId: number, id: number): Promise<void> {
    await http.delete(`/catalog-items/${catalogItemId}/dependencies/${id}`)
  },
}

export const bundleComponentsApi = {
  /** El path lo llama `bundleItemId`, no `catalogItemId`: solo un `BUNDLE` lo acepta. */
  async listByBundle(
    bundleItemId: number,
    signal?: AbortSignal,
  ): Promise<BundleComponentResponse[]> {
    const { data } = await http.get<BundleComponentResponse[]>(
      `/catalog-items/${bundleItemId}/components`,
      { signal },
    )
    return data
  },
  async create(
    bundleItemId: number,
    payload: CreateBundleComponentRequest,
  ): Promise<BundleComponentResponse> {
    const { data } = await http.post<BundleComponentResponse>(
      `/catalog-items/${bundleItemId}/components`,
      payload,
    )
    return data
  },
  async update(
    bundleItemId: number,
    id: number,
    payload: UpdateBundleComponentRequest,
  ): Promise<BundleComponentResponse> {
    const { data } = await http.put<BundleComponentResponse>(
      `/catalog-items/${bundleItemId}/components/${id}`,
      payload,
    )
    return data
  },
  async remove(bundleItemId: number, id: number): Promise<void> {
    await http.delete(`/catalog-items/${bundleItemId}/components/${id}`)
  },
}

// ───────────────────────────────────────────────────────────────────────────
// Los techos de fábrica y su propagación
//
// El listado devuelve un **array plano**, como los tres puentes: son las filas
// de UN artículo, no un listado maestro.
//
// La propagación vive en `/system/**` y no bajo el artículo, y eso dice de qué
// es: no es editar el catálogo, es tocar contratos ya firmados. Por eso está en
// su propio objeto y no dentro de `catalogItemLimitsApi`.
// ───────────────────────────────────────────────────────────────────────────

export const catalogItemLimitsApi = {
  /** Devuelve un array plano, no una página: son los ejes de un solo artículo. */
  async listByCatalogItem(
    catalogItemId: number,
    signal?: AbortSignal,
  ): Promise<CatalogItemLimitResponse[]> {
    const { data } = await http.get<CatalogItemLimitResponse[]>(
      `/catalog-items/${catalogItemId}/limits`,
      { signal },
    )
    return data
  },
  async create(
    catalogItemId: number,
    payload: CreateCatalogItemLimitRequest,
  ): Promise<CatalogItemLimitResponse> {
    const { data } = await http.post<CatalogItemLimitResponse>(
      `/catalog-items/${catalogItemId}/limits`,
      payload,
    )
    return data
  },
  async update(
    catalogItemId: number,
    id: number,
    payload: UpdateCatalogItemLimitRequest,
  ): Promise<CatalogItemLimitResponse> {
    const { data } = await http.put<CatalogItemLimitResponse>(
      `/catalog-items/${catalogItemId}/limits/${id}`,
      payload,
    )
    return data
  },
}

export const limitPropagationsApi = {
  /**
   * Lleva una **mejora** de techo a los contratos vivos.
   *
   * <p>El backend solo mejora: quien firmó con cien conserva sus cien aunque la
   * fábrica baje. Devuelve cuántos contratos se quedaron mejor, que es el único
   * número honesto — «actualizados» daría a entender que se tocaron todos.
   */
  async propagate(
    payload: PropagateCatalogLimitImprovementRequest,
  ): Promise<LimitPropagationResponse> {
    const { data } = await http.post<LimitPropagationResponse>(
      '/system/subscription-item-limits/propagations',
      payload,
    )
    return data
  },
}
