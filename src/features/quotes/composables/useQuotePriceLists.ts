import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuoteCatalogStore } from '../stores/quote-catalog.store'
import type { PriceListResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * <b>La divisa de una cotización, resuelta desde el contrato y no supuesta.</b>
 *
 * <p>`QuoteResponse` y `QuoteSummaryResponse` traen `priceListId` pero no `currency`. La divisa
 * existe en el contrato —`PriceListResponse.currency`—, solo que a un salto de distancia. Esto es
 * ese salto, y es lo que permite que las pantallas de cotizaciones usen `formatMoney` con la
 * divisa <b>declarada</b> en vez de la nota de plataforma: sobre estas cifras, «COP» sería una
 * suposición que el dato de al lado puede desmentir, porque una tarifa en dólares es un caso que
 * el modelo admite y el catálogo ya pinta con su símbolo real.
 *
 * <p><b>Cuando no se puede resolver, no se inventa.</b> `currencyOf` devuelve `null` mientras la
 * cache carga, si la petición falla, o si la tarifa de esa cotización no está entre las que
 * devuelve el servidor. `formatMoney(v, null)` cae a la cifra desnuda por diseño, y la pantalla
 * que llama a esto tiene que decir en texto por qué el símbolo no está — nunca rellenar el hueco
 * con la divisa de la plataforma.
 *
 * <p>Recarga siempre al montar, como el resto de catálogos de la consola. El store comparte la
 * cache con `useQuoteCatalog`, así que abrir el alta de una cotización después de esto no vuelve
 * a pedir las tarifas.
 */
export function useQuotePriceLists() {
  const store = useQuoteCatalogStore()
  const { priceLists, loading, error } = storeToRefs(store)

  function findById(id: number | null | undefined): PriceListResponse | undefined {
    if (id === null || id === undefined) return undefined
    return priceLists.value.find((list) => list.id === id)
  }

  /**
   * La divisa declarada por la tarifa, o `null` si todavía no se sabe.
   *
   * <p>`null` y no `'COP'`: los dos estados que se confundirían con un valor por defecto —«aún no
   * ha cargado» y «esta tarifa no existe»— son justo los que no autorizan a afirmar nada.
   */
  function currencyOf(id: number | null | undefined): string | null {
    return findById(id)?.currency ?? null
  }

  onMounted(() => {
    void store.ensurePriceListsLoaded().catch(() => {
      /* `error` ya queda puesto en el store; la pantalla decide si lo pinta */
    })
  })

  return { priceLists, loading, error, findById, currencyOf }
}
