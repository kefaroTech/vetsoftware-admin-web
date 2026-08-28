import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { limitDimensionsApi } from '../api/limits.api'
import { useLimitDimensionsStore } from '../stores/limit-dimensions.store'
import type { UpdateLimitDimensionRequest } from '../types/limits.types'

/**
 * El expediente de **un** eje de cupo: cargarlo y editar lo poco que se puede
 * editar.
 *
 * <p>`saving` es un `ref()` local dentro de la función, y eso **no** es el patrón
 * híbrido prohibido: es estado por instancia de la pantalla que guarda, no
 * estado compartido. Lo compartido —el eje cargado, la lista— vive en el store.
 */
export function useLimitDimensionRecord() {
  const store = useLimitDimensionsStore()
  const { selected, loading, error, errorTraceId } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  const saving = ref(false)

  /**
   * Carga el eje. **Siempre pregunta al servidor**, aunque la lista ya lo tenga:
   * la regla del proyecto es recargar al abrir pantalla, y el expediente enseña
   * campos —`createdDate`, el submódulo— sobre los que se toman decisiones.
   */
  async function load(id: number) {
    store.setLoading(true)
    store.setError(null)
    try {
      const data = await limitDimensionsApi.findById(id)
      store.setSelected(data)
      // Que la lista no se quede con una versión vieja detrás.
      store.replaceItem(data)
      return data
    } catch (e) {
      store.setSelected(null)
      store.setError(
        getProblemDetailMessage(e, 'No se pudo cargar el eje de cupo'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar el eje de cupo', e)
      return null
    } finally {
      store.setLoading(false)
    }
  }

  /**
   * Guarda **nombre, submódulo y días de gracia**, que es todo lo que el
   * endpoint acepta.
   *
   * <p>El código, el tipo de medida y la fecha de disponibilidad no viajan
   * porque `UpdateLimitDimensionRequest` no los declara: están copiados en cada
   * cupo ya contratado y atados al consumo ya registrado. El formulario los
   * enseña bloqueados con el motivo escrito, en vez de dejar escribirlos y que
   * el servidor los descarte en silencio.
   */
  async function update(id: number, payload: UpdateLimitDimensionRequest) {
    if (saving.value) return null
    saving.value = true
    try {
      const data = await limitDimensionsApi.update(id, payload)
      store.setSelected(data)
      store.replaceItem(data)
      success('Eje de cupo actualizado')
      return data
    } catch (e) {
      errorFrom('Error al actualizar el eje de cupo', e, 'No se pudo guardar el cambio.')
      throw e
    } finally {
      // Fuera del `try`: si se pusiera tras el `await`, el camino de error nunca
      // lo ejecutaría y el botón quedaría deshabilitado para siempre (FORM-09).
      saving.value = false
    }
  }

  function clear() {
    store.setSelected(null)
  }

  return { dimension: selected, loading, error, errorTraceId, saving, load, update, clear }
}
