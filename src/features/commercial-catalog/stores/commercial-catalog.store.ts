import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CatalogItemResponse, PriceListResponse } from '../types/commercial-catalog.types'

export const useCommercialCatalogStore = defineStore('commercialCatalog', () => {
  const selectedPriceList = ref<PriceListResponse | null>(null)
  const catalogOptions = ref<CatalogItemResponse[]>([])
  const catalogOptionsLoaded = ref(false)
  const catalogOptionsLoading = ref(false)
  const catalogOptionsError = ref<string | null>(null)
  const catalogOptionsTraceId = ref<string | null>(null)

  let catalogOptionsPromise: Promise<CatalogItemResponse[]> | null = null

  function setSelectedPriceList(value: PriceListResponse | null) {
    selectedPriceList.value = value
  }

  async function loadCatalogOptions(
    loader: () => Promise<CatalogItemResponse[]>,
    force = false,
  ): Promise<CatalogItemResponse[]> {
    if (!force && catalogOptionsLoaded.value) return catalogOptions.value
    if (catalogOptionsPromise) return catalogOptionsPromise

    catalogOptionsLoading.value = true
    catalogOptionsError.value = null
    catalogOptionsTraceId.value = null
    catalogOptionsPromise = loader()
      .then((items) => {
        catalogOptions.value = items
        catalogOptionsLoaded.value = true
        return items
      })
      .finally(() => {
        catalogOptionsLoading.value = false
        catalogOptionsPromise = null
      })
    return catalogOptionsPromise
  }

  function setCatalogOptionsError(message: string | null, traceId: string | null = null) {
    catalogOptionsError.value = message
    catalogOptionsTraceId.value = traceId
  }

  return {
    selectedPriceList,
    catalogOptions,
    catalogOptionsLoaded,
    catalogOptionsLoading,
    catalogOptionsError,
    catalogOptionsTraceId,
    setSelectedPriceList,
    loadCatalogOptions,
    setCatalogOptionsError,
  }
})
