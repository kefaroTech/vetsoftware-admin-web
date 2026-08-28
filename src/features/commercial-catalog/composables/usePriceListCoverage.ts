import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { usePriceListCoverageStore } from '../stores/price-list-coverage.store'
import { catalogPricesApi } from '../api/commercial-catalog.api'
import { priceListCoverage } from './priceListCoverage'
import type { CatalogItemResponse, CatalogPriceResponse } from '../types/commercial-catalog.types'

/** El mismo techo por página que usa el resto de la consola para traer listas enteras. */
const COVERAGE_PAGE_SIZE = 200

/**
 * La cobertura de una tarifa, lista para pintar.
 *
 * <p>El estado compartido —los precios completos de la lista— vive en el store;
 * aquí se concentran la lógica de red y el cruce con el catálogo, que es el
 * patrón de composable envoltorio del repositorio.
 *
 * <p><b>El catálogo entra por parámetro y no se pide otra vez.</b>
 * `useCommercialCatalog` ya lo trae completo y cacheado para los desplegables;
 * volver a pedirlo aquí duplicaría la llamada y, peor, podría cruzar dos fotos
 * distintas del catálogo — una cobertura calculada contra un catálogo que no es
 * el que la pantalla enseña es exactamente el aviso que nadie se cree.
 */
export function usePriceListCoverage(catalogItems: () => CatalogItemResponse[]) {
  const store = usePriceListCoverageStore()
  const { prices, priceListId, loading, error, errorTraceId } = storeToRefs(store)

  const coverage = computed(() => priceListCoverage(catalogItems(), prices.value))

  /** `true` cuando lo cacheado corresponde de verdad a la lista que se pregunta. */
  function isLoadedFor(id: number): boolean {
    return priceListId.value === id
  }

  async function load(id: number, force = false) {
    try {
      await store.load(
        id,
        async () => {
          const items: CatalogPriceResponse[] = []
          let page = 0
          let totalPages = 1
          while (page < totalPages) {
            const result = await catalogPricesApi.listByPriceList(id, page, COVERAGE_PAGE_SIZE)
            items.push(...result.content)
            totalPages = result.totalPages
            page += 1
          }
          return items
        },
        force,
      )
      store.setError(null)
    } catch (e) {
      store.setError(
        getProblemDetailMessage(e, 'No se pudo comprobar la cobertura de la tarifa'),
        getTraceId(e) ?? null,
      )
      throw e
    }
  }

  return {
    coverage,
    prices,
    loading,
    error,
    errorTraceId,
    isLoadedFor,
    load,
    clear: store.clear,
  }
}
