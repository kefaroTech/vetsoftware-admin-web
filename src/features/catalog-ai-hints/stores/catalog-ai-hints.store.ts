import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Lo único que las dos rutas de la feature comparten: la caché de «qué artículo
 * a la venta NO tiene pista».
 *
 * <p>Esa lista no la sirve ningún endpoint —el backend solo sabe listar las
 * vigentes— así que se deriva en el cliente cruzando `/catalog-items` con
 * `/catalog-item-ai-hints`, y eso obliga a recorrer TODAS las páginas de las dos
 * colecciones. Se hace una sola vez, al activar la pestaña, y se conserva aquí
 * para que volver a ella —o volver desde la ficha de un artículo— no repita el
 * barrido.
 *
 * <p>⚠️ <b>Cuándo deja de valer.</b> Es aceptable hoy porque `catalog_items` es
 * catálogo global de plataforma, del orden de decenas de filas. Si el `total` de
 * `/catalog-items` pasa de {@link MISSING_PAGE_SIZE}, hay que pedirle al backend
 * un endpoint que conteste la pregunta y retirar esta derivación.
 *
 * <p>El estado va en Pinia y no en un `ref` a nivel de módulo dentro del
 * composable: esa forma híbrida está prohibida en los dos fronts. La promesa en
 * vuelo sí es una variable del closure del setup store —una por instancia de
 * store, no un singleton de módulo— y es lo que evita el doble barrido cuando
 * dos componentes piden la lista a la vez.
 */
export const MISSING_PAGE_SIZE = 200

export const useCatalogAiHintsStore = defineStore('catalogAiHints', () => {
  /** Artículos a la venta sin pista vigente, ya cruzados. */
  const missingItems = ref<CatalogItemResponse[]>([])
  const missingLoaded = ref(false)
  const missingLoading = ref(false)
  const missingError = ref<string | null>(null)
  const missingTraceId = ref<string | null>(null)

  let missingPromise: Promise<CatalogItemResponse[]> | null = null

  async function loadMissing(
    loader: () => Promise<CatalogItemResponse[]>,
    force = false,
  ): Promise<CatalogItemResponse[]> {
    if (!force && missingLoaded.value) return missingItems.value
    if (missingPromise) return missingPromise

    missingLoading.value = true
    missingError.value = null
    missingTraceId.value = null
    missingPromise = loader()
      .then((items) => {
        missingItems.value = items
        missingLoaded.value = true
        return items
      })
      .finally(() => {
        missingLoading.value = false
        missingPromise = null
      })
    return missingPromise
  }

  function setMissingError(message: string | null, traceId: string | null = null) {
    missingError.value = message
    missingTraceId.value = traceId
  }

  /**
   * Invalida la caché tras publicar o retirar: las dos operaciones cambian
   * exactamente esta lista, y dejarla vieja enseñaría «Escribir la pista» sobre
   * un artículo que acaba de recibir la suya.
   */
  function invalidateMissing() {
    missingLoaded.value = false
  }

  return {
    missingItems,
    missingLoaded,
    missingLoading,
    missingError,
    missingTraceId,
    loadMissing,
    setMissingError,
    invalidateMissing,
  }
})
