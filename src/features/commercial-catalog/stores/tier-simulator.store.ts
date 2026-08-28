import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BillingCycle, CatalogPriceResponse } from '../types/commercial-catalog.types'

/**
 * Estado del simulador de tramos (D-66, épica E5).
 *
 * ── Por qué un store y no tres `ref` en el componente ─────────────────────
 *
 * La regla obligatoria del proyecto: todo estado compartido entre pantallas
 * vive en Pinia, y está prohibido el singleton de módulo dentro de un
 * composable. Aquí además hay motivo funcional: la escalera de una tarifa se
 * carga **entera** —todas las páginas de `/catalog-prices` de esa lista— y
 * volver a pedirla cada vez que se cambia de pestaña es tráfico regalado. La
 * caché guarda de qué lista son las filas que tiene, y `loadRows` no vuelve a
 * salir a la red mientras siga siendo la misma.
 *
 * <p>La selección (artículo, ciclo y cantidad) vive aquí por la misma razón
 * por la que vive aquí `selectedPriceList` en `commercial-catalog.store.ts`:
 * quien va a mirar los precios de la lista y vuelve al simulador espera
 * encontrarse lo que estaba probando, no un formulario en blanco.
 *
 * <p>La promesa en vuelo es un `let` **dentro** del `setup` de la tienda, no
 * un `let` de módulo: es estado de esta instancia de la tienda y muere con
 * ella. Mismo patrón que `catalogOptionsPromise` en la tienda hermana.
 */
export const useTierSimulatorStore = defineStore('tierSimulator', () => {
  /** De qué lista son las filas cargadas. `null` = la caché está vacía. */
  const priceListId = ref<number | null>(null)
  const rows = ref<CatalogPriceResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  const catalogItemId = ref<number | null>(null)
  const billingCycle = ref<BillingCycle>('MONTHLY')
  /** Cantidad tecleada. Cruda: la saneas en `simulateTiers`, no aquí. */
  const quantity = ref(1)

  let inFlight: Promise<CatalogPriceResponse[]> | null = null

  function setCatalogItemId(value: number | null) {
    catalogItemId.value = value
  }

  function setBillingCycle(value: BillingCycle) {
    billingCycle.value = value
  }

  function setQuantity(value: number) {
    quantity.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  /**
   * Carga la escalera completa de una lista. Reutiliza la caché si ya es la
   * misma lista y no se pide `force`; comparte la petición si ya hay una en
   * vuelo, para que dos montajes seguidos no disparen dos descargas.
   */
  async function loadRows(
    listId: number,
    loader: () => Promise<CatalogPriceResponse[]>,
    force = false,
  ): Promise<CatalogPriceResponse[]> {
    if (!force && priceListId.value === listId && error.value === null) return rows.value
    if (inFlight && priceListId.value === listId) return inFlight

    loading.value = true
    error.value = null
    errorTraceId.value = null
    priceListId.value = listId
    inFlight = loader()
      .then((loaded) => {
        rows.value = loaded
        return loaded
      })
      .finally(() => {
        loading.value = false
        inFlight = null
      })
    return inFlight
  }

  /** Vacía la caché sin tocar la selección: la usa el cambio de lista. */
  function reset() {
    priceListId.value = null
    rows.value = []
    error.value = null
    errorTraceId.value = null
  }

  return {
    priceListId,
    rows,
    loading,
    error,
    errorTraceId,
    catalogItemId,
    billingCycle,
    quantity,
    setCatalogItemId,
    setBillingCycle,
    setQuantity,
    setError,
    loadRows,
    reset,
  }
})
