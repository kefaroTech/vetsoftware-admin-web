import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LimitDimensionResponse } from '@/features/limits/types/limits.types'
import type { CatalogItemLimitResponse } from '../types/commercial-catalog.types'

/**
 * Los techos de fábrica de un artículo, y el catálogo de ejes que los nombra.
 *
 * <p><b>Los ejes se cachean como un catálogo</b> —lista + promesa en vuelo— porque
 * son globales de plataforma, cambian poquísimo y los pide cada formulario de
 * techo que se abre. Es el mismo patrón de `commercial-catalog.store.ts` para los
 * artículos.
 *
 * <p>Los techos, en cambio, <b>no se cachean entre artículos</b>: son la pantalla
 * de un artículo concreto y se recargan al abrirla, que es la regla de recargar
 * al abrir. Guardarlos por id invitaría a pintar los del artículo anterior
 * mientras llegan los nuevos, y un techo equivocado es un cupo equivocado.
 */
export const useCatalogItemLimitsStore = defineStore('catalogItemLimits', () => {
  const catalogItemId = ref<number | null>(null)
  const limits = ref<CatalogItemLimitResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  const dimensions = ref<LimitDimensionResponse[]>([])
  const dimensionsLoaded = ref(false)
  const dimensionsLoading = ref(false)
  const dimensionsError = ref<string | null>(null)
  let dimensionsPromise: Promise<LimitDimensionResponse[]> | null = null

  const dimensionById = computed(
    () => new Map(dimensions.value.map((dimension) => [dimension.id, dimension])),
  )

  function setLimits(id: number, value: CatalogItemLimitResponse[]) {
    catalogItemId.value = id
    limits.value = value
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  async function loadDimensions(
    loader: () => Promise<LimitDimensionResponse[]>,
    force = false,
  ): Promise<LimitDimensionResponse[]> {
    if (!force && dimensionsLoaded.value) return dimensions.value
    if (dimensionsPromise) return dimensionsPromise

    dimensionsLoading.value = true
    dimensionsError.value = null
    dimensionsPromise = loader()
      .then((result) => {
        dimensions.value = result
        dimensionsLoaded.value = true
        return result
      })
      .finally(() => {
        dimensionsLoading.value = false
        dimensionsPromise = null
      })
    return dimensionsPromise
  }

  function setDimensionsError(message: string | null) {
    dimensionsError.value = message
  }

  return {
    catalogItemId,
    limits,
    loading,
    error,
    errorTraceId,
    dimensions,
    dimensionById,
    dimensionsLoading,
    dimensionsError,
    setLimits,
    setLoading,
    setError,
    loadDimensions,
    setDimensionsError,
  }
})
