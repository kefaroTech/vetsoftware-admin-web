import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LimitDimensionResponse } from '../types/limits.types'

/**
 * Los ejes de cupo. Es el **catálogo** de esta feature: lo consumen la pantalla
 * de ejes, el desplegable de «Negociar excepción», la tabla de excepciones (que
 * traduce `limitDimensionId` a un nombre) y las dos pantallas de bitácora.
 *
 * <p><b>Por qué un store y no `ref()` en el composable.</b> Cinco pantallas de la
 * sección piden la misma lista, y tres de ellas la piden a la vez dentro de la
 * misma vista. Con estado por instancia habría tres peticiones idénticas en
 * vuelo y tres copias que se desincronizan en cuanto una se edita. La regla del
 * proyecto no admite excepciones para estado nuevo: aquí no hay ni un `ref()` a
 * nivel de módulo — el `inflight` de abajo vive **dentro** del setup del store,
 * que es estado de la instancia, no un singleton de módulo.
 *
 * <p><b>La caché es de petición, no de datos.</b> Guarda la promesa en vuelo para
 * que dos componentes que montan a la vez compartan una sola llamada, y expone
 * `clearInflight()` para que un `refresh()` explícito —el de abrir la pantalla de
 * ejes— vuelva a preguntar de verdad. No hay TTL: un catálogo servido de caché
 * durante cinco minutos contradice la regla de recargar al abrir pantalla, y
 * justo después de crear un eje la lista mostraría la anterior.
 */
export const useLimitDimensionsStore = defineStore('limit-dimensions', () => {
  const items = ref<LimitDimensionResponse[]>([])
  const selected = ref<LimitDimensionResponse | null>(null)
  const loading = ref(false)

  /** Mensaje del último fallo, para que la tabla distinga «no hay» de «no se pudo». */
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  /** `true` en cuanto una carga terminó bien. Separa «vacío» de «todavía no se pidió». */
  const loaded = ref(false)

  /**
   * La petición en vuelo, compartida por todos los que la pidan mientras dure.
   * Es una promesa, no datos: no necesita ser reactiva y no debe serlo.
   */
  let inflight: Promise<LimitDimensionResponse[]> | null = null

  function getInflight() {
    return inflight
  }

  function setInflight(promise: Promise<LimitDimensionResponse[]> | null) {
    inflight = promise
  }

  function clearInflight() {
    inflight = null
  }

  function setItems(data: LimitDimensionResponse[]) {
    items.value = data
    loaded.value = true
  }

  function setSelected(value: LimitDimensionResponse | null) {
    selected.value = value
  }

  /** Sustituye un eje editado en la lista y en el seleccionado, sin recargar todo. */
  function replaceItem(dimension: LimitDimensionResponse) {
    items.value = items.value.map((d) => (d.id === dimension.id ? dimension : d))
    if (selected.value?.id === dimension.id) selected.value = dimension
  }

  function addItem(dimension: LimitDimensionResponse) {
    items.value = [...items.value, dimension]
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  return {
    items,
    selected,
    loading,
    error,
    errorTraceId,
    loaded,
    getInflight,
    setInflight,
    clearInflight,
    setItems,
    setSelected,
    replaceItem,
    addItem,
    setLoading,
    setError,
  }
})
