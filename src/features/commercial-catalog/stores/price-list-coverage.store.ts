import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CatalogPriceResponse } from '../types/commercial-catalog.types'

/**
 * La cobertura de precios de una tarifa: los precios completos de la lista que
 * se está mirando, no la página visible.
 *
 * <p><b>Por qué un store y no un `ref` en el composable.</b> Aparte de la regla
 * obligatoria del repositorio, la lista completa la piden dos consumidores a la
 * vez —el panel de cobertura que vive bajo la tabla y el modal de publicación que
 * se abre encima—, y sin caché compartida cada uno recorrería todas las páginas
 * de `/catalog-prices` por su cuenta. El par «datos + promesa en vuelo» es el
 * mismo patrón de catálogo que ya usa `commercial-catalog.store.ts`.
 *
 * <p>La caché es de <b>una sola lista</b>, la última consultada: la cobertura se
 * mira de una tarifa cada vez, y guardar todas obligaría a invalidarlas cada vez
 * que se toca un precio cualquiera.
 */
export const usePriceListCoverageStore = defineStore('priceListCoverage', () => {
  /** De qué lista son los precios cacheados. `null` = no hay nada cacheado. */
  const priceListId = ref<number | null>(null)
  const prices = ref<CatalogPriceResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  let inflight: Promise<CatalogPriceResponse[]> | null = null
  let inflightFor: number | null = null

  /**
   * Trae todos los precios de una lista, una sola vez por lista.
   *
   * <p>`force` la vuelve a pedir: se usa tras alta, edición o borrado de un
   * precio, cuando la cobertura cacheada ya describe otra tarifa.
   */
  async function load(
    id: number,
    loader: () => Promise<CatalogPriceResponse[]>,
    force = false,
  ): Promise<CatalogPriceResponse[]> {
    if (!force && priceListId.value === id) return prices.value
    if (inflight && inflightFor === id && !force) return inflight

    loading.value = true
    error.value = null
    errorTraceId.value = null
    inflightFor = id
    inflight = loader()
      .then((result) => {
        prices.value = result
        priceListId.value = id
        return result
      })
      .finally(() => {
        loading.value = false
        inflight = null
        inflightFor = null
      })
    return inflight
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  /** Al cambiar de tarifa o al salir de la pantalla: una cobertura vieja miente. */
  function clear() {
    priceListId.value = null
    prices.value = []
    error.value = null
    errorTraceId.value = null
  }

  return { priceListId, prices, loading, error, errorTraceId, load, setError, clear }
})
