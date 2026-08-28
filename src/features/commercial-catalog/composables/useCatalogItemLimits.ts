import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { limitDimensionsApi } from '@/features/limits/api/limits.api'
import { useCatalogItemLimitsStore } from '../stores/catalog-item-limits.store'
import { catalogItemLimitsApi, limitPropagationsApi } from '../api/commercial-catalog.api'
import type {
  CatalogItemLimitResponse,
  CreateCatalogItemLimitRequest,
  PropagateCatalogLimitImprovementRequest,
  UpdateCatalogItemLimitRequest,
} from '../types/commercial-catalog.types'

/**
 * Los techos de fábrica de un artículo y la propagación de una mejora.
 *
 * <p><b>Los ejes se importan de `features/limits`, no se redeclaran.</b>
 * `/limit-dimensions` ya tiene su cliente, su tipo y su pantalla allí; copiar
 * aquí una segunda versión dejaría dos `LimitDimensionResponse` homónimos y
 * `api-contract.spec.ts` agrupa por nombre, así que solo uno quedaría atado al
 * contrato — es exactamente la razón por la que `SubModuleSummary` tampoco se
 * duplicó. La dependencia es de solo lectura y en un solo sentido.
 */
export function useCatalogItemLimits() {
  const store = useCatalogItemLimitsStore()
  const {
    limits,
    loading,
    error,
    errorTraceId,
    dimensions,
    dimensionById,
    dimensionsLoading,
    dimensionsError,
  } = storeToRefs(store)
  const { success, info, errorFrom } = useToast()

  /** Los ejes que este artículo todavía no cubre: no se puede atar dos veces el mismo. */
  function availableDimensions(excludeLimitId?: number) {
    const taken = new Set(
      limits.value
        .filter((limit) => limit.id !== excludeLimitId)
        .map((limit) => limit.limitDimensionId),
    )
    return dimensions.value.filter((dimension) => !taken.has(dimension.id))
  }

  const dimensionOptions = computed(() =>
    dimensions.value.map((dimension) => ({ value: dimension.id, label: dimension.name })),
  )

  async function loadDimensions(force = false) {
    try {
      await store.loadDimensions(() => limitDimensionsApi.listAll(), force)
      store.setDimensionsError(null)
    } catch (e) {
      store.setDimensionsError(getProblemDetailMessage(e, 'No se pudieron cargar los ejes de cupo'))
      errorFrom('Error al cargar los ejes de cupo', e)
    }
  }

  /** Recarga al abrir la pantalla, siempre. */
  async function load(catalogItemId: number) {
    store.setLoading(true)
    store.setError(null)
    try {
      const [rows] = await Promise.all([
        catalogItemLimitsApi.listByCatalogItem(catalogItemId),
        loadDimensions(),
      ])
      store.setLimits(catalogItemId, rows)
    } catch (e) {
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar los techos de fábrica'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar los techos de fábrica', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(catalogItemId: number, payload: CreateCatalogItemLimitRequest) {
    try {
      const created = await catalogItemLimitsApi.create(catalogItemId, payload)
      success('Techo de fábrica añadido')
      await load(catalogItemId)
      return created
    } catch (e) {
      errorFrom('Error al añadir el techo de fábrica', e)
      throw e
    }
  }

  async function update(catalogItemId: number, id: number, payload: UpdateCatalogItemLimitRequest) {
    try {
      const updated = await catalogItemLimitsApi.update(catalogItemId, id, payload)
      success('Techo de fábrica actualizado')
      await load(catalogItemId)
      return updated
    } catch (e) {
      errorFrom('Error al actualizar el techo de fábrica', e)
      throw e
    }
  }

  /**
   * Propaga una mejora a los contratos vivos y **cuenta cuántos mejoraron**.
   *
   * <p>El aviso dice el número tal cual, incluido el cero: «0 contratos
   * mejoraron» es información —significa que ninguno estaba por debajo— y
   * esconderlo dejaría al operador sin saber si la acción llegó a hacer algo.
   */
  async function propagate(payload: PropagateCatalogLimitImprovementRequest) {
    try {
      const result = await limitPropagationsApi.propagate(payload)
      if (result.improvedContracts === 0) {
        info('Ningún contrato vivo estaba por debajo: no había nada que mejorar')
      } else {
        success(
          result.improvedContracts === 1
            ? '1 contrato vivo se quedó con el techo mejorado'
            : `${result.improvedContracts} contratos vivos se quedaron con el techo mejorado`,
        )
      }
      return result
    } catch (e) {
      errorFrom('Error al propagar la mejora de cupo', e)
      throw e
    }
  }

  /** El eje de un techo, para nombrarlo sin códigos internos. */
  function dimensionName(limit: CatalogItemLimitResponse): string {
    return dimensionById.value.get(limit.limitDimensionId)?.name ?? `eje #${limit.limitDimensionId}`
  }

  return {
    limits,
    loading,
    error,
    errorTraceId,
    dimensions,
    dimensionById,
    dimensionOptions,
    dimensionsLoading,
    dimensionsError,
    availableDimensions,
    load,
    loadDimensions,
    create,
    update,
    propagate,
    dimensionName,
  }
}
