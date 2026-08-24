import { storeToRefs } from 'pinia'
import { emptyPage } from '@/types/pagination'
import { useServerPaged } from '@/composables/useServerPaged'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useCommercialCatalogStore } from '../stores/commercial-catalog.store'
import { catalogItemsApi, catalogPricesApi, priceListsApi } from '../api/commercial-catalog.api'
import type {
  CatalogItemResponse,
  CatalogPriceResponse,
  CreateCatalogItemRequest,
  CreateCatalogPriceRequest,
  CreatePriceListRequest,
  PriceListResponse,
  UpdateCatalogItemRequest,
  UpdateCatalogPriceRequest,
  UpdatePriceListRequest,
} from '../types/commercial-catalog.types'

const OPTIONS_PAGE_SIZE = 200

export function useCommercialCatalog() {
  const store = useCommercialCatalogStore()
  const {
    selectedPriceList,
    catalogOptions,
    catalogOptionsLoading,
    catalogOptionsError,
    catalogOptionsTraceId,
  } = storeToRefs(store)
  const { success, info, errorFrom } = useToast()

  const catalogItems = useServerPaged<CatalogItemResponse>(
    (page, pageSize, _query, signal) => catalogItemsApi.listAll(page, pageSize, signal),
    { debounceMs: 0 },
  )
  const priceLists = useServerPaged<PriceListResponse>(
    (page, pageSize, _query, signal) => priceListsApi.listAll(page, pageSize, signal),
    { debounceMs: 0 },
  )
  const catalogPrices = useServerPaged<CatalogPriceResponse>(
    (page, pageSize, _query, signal) => {
      const priceListId = selectedPriceList.value?.id
      return priceListId
        ? catalogPricesApi.listByPriceList(priceListId, page, pageSize, signal)
        : Promise.resolve(emptyPage<CatalogPriceResponse>(pageSize))
    },
    { debounceMs: 0 },
  )

  async function fetchAllCatalogOptions(): Promise<CatalogItemResponse[]> {
    const items: CatalogItemResponse[] = []
    let page = 0
    let totalPages = 1
    while (page < totalPages) {
      const result = await catalogItemsApi.listAll(page, OPTIONS_PAGE_SIZE)
      items.push(...result.content)
      totalPages = result.totalPages
      page += 1
    }
    return items
  }

  async function loadCatalogOptions(force = false) {
    try {
      await store.loadCatalogOptions(fetchAllCatalogOptions, force)
      store.setCatalogOptionsError(null)
    } catch (error) {
      store.setCatalogOptionsError(
        getProblemDetailMessage(error, 'No se pudieron cargar los artículos del catálogo'),
        getTraceId(error) ?? null,
      )
      errorFrom('Error al cargar los artículos del catálogo', error)
      throw error
    }
  }

  async function refreshCatalogItems() {
    await Promise.all([catalogItems.reload(), loadCatalogOptions(true)])
  }

  async function createCatalogItem(payload: CreateCatalogItemRequest) {
    try {
      const created = await catalogItemsApi.create(payload)
      success('Artículo creado')
      await refreshCatalogItems()
      return created
    } catch (error) {
      errorFrom('Error al crear el artículo', error)
      throw error
    }
  }

  async function updateCatalogItem(id: number, payload: UpdateCatalogItemRequest) {
    try {
      const updated = await catalogItemsApi.update(id, payload)
      success('Artículo actualizado')
      await refreshCatalogItems()
      return updated
    } catch (error) {
      errorFrom('Error al actualizar el artículo', error)
      throw error
    }
  }

  async function disableCatalogItem(id: number) {
    try {
      await catalogItemsApi.remove(id)
      info('Artículo deshabilitado')
      await refreshCatalogItems()
    } catch (error) {
      errorFrom('Error al deshabilitar el artículo', error)
      throw error
    }
  }

  async function enableCatalogItem(id: number) {
    try {
      await catalogItemsApi.enable(id)
      success('Artículo activado')
      await refreshCatalogItems()
    } catch (error) {
      errorFrom('Error al activar el artículo', error)
      throw error
    }
  }

  async function createPriceList(payload: CreatePriceListRequest) {
    try {
      const created = await priceListsApi.create(payload)
      success('Lista de precios creada')
      await priceLists.reload()
      return created
    } catch (error) {
      errorFrom('Error al crear la lista de precios', error)
      throw error
    }
  }

  async function updatePriceList(id: number, payload: UpdatePriceListRequest) {
    try {
      const updated = await priceListsApi.update(id, payload)
      if (selectedPriceList.value?.id === id) store.setSelectedPriceList(updated)
      success('Lista de precios actualizada')
      await priceLists.reload()
      return updated
    } catch (error) {
      errorFrom('Error al actualizar la lista de precios', error)
      throw error
    }
  }

  async function publishPriceList(id: number) {
    try {
      const updated = await priceListsApi.publish(id)
      if (selectedPriceList.value?.id === id) store.setSelectedPriceList(updated)
      success('Lista de precios publicada')
      await priceLists.reload()
    } catch (error) {
      errorFrom('Error al publicar la lista de precios', error)
      throw error
    }
  }

  async function archivePriceList(id: number) {
    try {
      const updated = await priceListsApi.archive(id)
      if (selectedPriceList.value?.id === id) store.setSelectedPriceList(updated)
      info('Lista de precios archivada')
      await priceLists.reload()
    } catch (error) {
      errorFrom('Error al archivar la lista de precios', error)
      throw error
    }
  }

  async function enablePriceList(id: number) {
    try {
      const updated = await priceListsApi.enable(id)
      if (selectedPriceList.value?.id === id) store.setSelectedPriceList(updated)
      success('Lista de precios activada')
      await priceLists.reload()
    } catch (error) {
      errorFrom('Error al activar la lista de precios', error)
      throw error
    }
  }

  async function selectPriceList(priceList: PriceListResponse | null) {
    store.setSelectedPriceList(priceList)
    if (!priceList) {
      catalogPrices.reset()
      return
    }
    await Promise.all([catalogPrices.reload(), loadCatalogOptions()])
  }

  async function createCatalogPrice(payload: CreateCatalogPriceRequest) {
    try {
      const created = await catalogPricesApi.create(payload)
      success('Precio agregado')
      await catalogPrices.reload()
      return created
    } catch (error) {
      errorFrom('Error al agregar el precio', error)
      throw error
    }
  }

  async function updateCatalogPrice(id: number, payload: UpdateCatalogPriceRequest) {
    try {
      const updated = await catalogPricesApi.update(id, payload)
      success('Precio actualizado')
      await catalogPrices.reload()
      return updated
    } catch (error) {
      errorFrom('Error al actualizar el precio', error)
      throw error
    }
  }

  async function removeCatalogPrice(id: number) {
    try {
      await catalogPricesApi.remove(id)
      info('Precio eliminado')
      const previousPage = catalogPrices.items.value.length === 1 && catalogPrices.page.value > 1
      await catalogPrices.goTo(
        previousPage ? catalogPrices.page.value - 1 : catalogPrices.page.value,
      )
    } catch (error) {
      errorFrom('Error al eliminar el precio', error)
      throw error
    }
  }

  return {
    catalogItems,
    priceLists,
    catalogPrices,
    selectedPriceList,
    catalogOptions,
    catalogOptionsLoading,
    catalogOptionsError,
    catalogOptionsTraceId,
    loadCatalogOptions,
    createCatalogItem,
    updateCatalogItem,
    disableCatalogItem,
    enableCatalogItem,
    createPriceList,
    updatePriceList,
    publishPriceList,
    archivePriceList,
    enablePriceList,
    selectPriceList,
    createCatalogPrice,
    updateCatalogPrice,
    removeCatalogPrice,
  }
}
