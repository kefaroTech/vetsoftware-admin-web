import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { limitDimensionsApi } from '../api/limits.api'
import { useLimitDimensionsStore } from '../stores/limit-dimensions.store'
import type { CreateLimitDimensionRequest, LimitDimensionResponse } from '../types/limits.types'

/**
 * **El catálogo de ejes de cupo.** Es la API estable que consumen la pantalla de
 * ejes, el desplegable de «Negociar excepción» y las tres tablas que tienen que
 * traducir un `limitDimensionId` a un nombre legible.
 *
 * <p>El estado sale del store con `storeToRefs`; aquí solo vive la lógica de API
 * y de avisos. Ni un `ref()` a nivel de módulo.
 */
export function useLimitDimensions() {
  const store = useLimitDimensionsStore()
  const { items, loading, error, errorTraceId, loaded } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  /**
   * Pide la lista y **comparte la petición en vuelo**.
   *
   * <p>Tres componentes de la misma vista piden el catálogo en su `onMounted`.
   * Sin esta deduplicación serían tres `GET /limit-dimensions` idénticos, tres
   * velos de carga encadenados y —lo peor— tres respuestas que pueden llegar
   * desordenadas y dejar en el store la más vieja.
   */
  async function fetchAll(): Promise<LimitDimensionResponse[]> {
    const enVuelo = store.getInflight()
    if (enVuelo) return enVuelo

    store.setLoading(true)
    store.setError(null)

    const promesa = limitDimensionsApi
      .listAll()
      .then((data) => {
        store.setItems(data)
        return data
      })
      .catch((e: unknown) => {
        // El mensaje sale del `ProblemDetail` y la traza del `X-Trace-Id`.
        // Escribir el texto a mano aquí dejaría a soporte sin forma de
        // correlacionar el fallo con el backend.
        store.setError(
          getProblemDetailMessage(e, 'No se pudieron cargar los ejes de cupo'),
          getTraceId(e) ?? null,
        )
        errorFrom('Error al cargar los ejes de cupo', e)
        throw e
      })
      .finally(() => {
        store.setLoading(false)
        store.clearInflight()
      })

    store.setInflight(promesa)
    return promesa
  }

  /**
   * Recarga de verdad. Es lo que llama la pantalla de ejes al abrirse: la regla
   * del proyecto es recargar al abrir pantalla, no servir de caché.
   */
  async function refresh() {
    store.clearInflight()
    return fetchAll().catch(() => [])
  }

  /** Carga solo si nadie la ha traído todavía. Para los desplegables. */
  async function ensureLoaded() {
    if (loaded.value) return items.value
    return fetchAll().catch(() => [])
  }

  /** Las opciones del desplegable, con el nombre y el código a la vista. */
  const options = computed(() =>
    items.value.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
  )

  function findById(id: number): LimitDimensionResponse | null {
    return items.value.find((d) => d.id === id) ?? null
  }

  /**
   * El nombre de un eje para una celda de tabla.
   *
   * <p>Si el catálogo todavía no ha llegado —o el eje ya no existe— devuelve
   * `Eje #12` y **no** una cadena vacía ni un guion: la fila sigue siendo
   * identificable y queda claro que lo que falta es el nombre, no el dato.
   */
  function nameOf(id: number): string {
    return findById(id)?.name ?? `Eje #${id}`
  }

  async function create(payload: CreateLimitDimensionRequest) {
    try {
      const data = await limitDimensionsApi.create(payload)
      store.addItem(data)
      success('Eje de cupo creado', `«${data.name}» ya se puede contratar.`)
      return data
    } catch (e) {
      errorFrom('Error al crear el eje de cupo', e, 'No se pudo crear el eje.')
      throw e
    }
  }

  return {
    dimensions: items,
    options,
    loading,
    error,
    errorTraceId,
    loaded,
    fetchAll,
    refresh,
    ensureLoaded,
    findById,
    nameOf,
    create,
  }
}
