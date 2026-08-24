import { defineStore } from 'pinia'
import { ref } from 'vue'
import { todayISODate } from '../composables/subscriptionDateTime'
import type { SubscriptionItemResponse } from '../types/subscription-items.types'

/**
 * <b>Qué alcance se está mirando.</b> No es un booleano y no es una casilla: los
 * dos estados tienen nombre y ninguno es «lo normal» (§3.3), así que se modela
 * como una unión y se pinta como `radiogroup`.
 *
 * <ul>
 *   <li>`all` — expediente completo. El servidor devuelve <b>todas</b> las líneas,
 *       incluidas las cerradas. Es el valor por defecto porque las cerradas son la
 *       historia de lo que se contrató y ocultarlas reintroduce por la puerta de
 *       atrás el modelo viejo que este contrato vino a sustituir.</li>
 *   <li>`on-date` — solo lo vigente a la fecha. El servidor filtra con
 *       `EffectivePeriod`, que es el mismo criterio que esta pantalla aplica al
 *       clasificar.</li>
 * </ul>
 */
export type SubscriptionItemsScope = 'all' | 'on-date'

/**
 * Estado de «Lo contratado»: las líneas del contrato abierto y <b>la consulta que
 * las produjo</b>.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del composable
 * —el patrón híbrido está prohibido (CLAUDE.md)—. Y hace falta que sea un store, no
 * solo estado local del componente: la fecha de referencia y el alcance son la
 * pregunta que el operador está haciendo, y sobreviven a que se abra un modal, se
 * escriba un otrosí y la tabla se recargue. Si vivieran en la vista, cada
 * escritura devolvería la pantalla a «hoy» y el operador perdería el 3 de marzo
 * que estaba mirando.
 *
 * <p><b>`referenceDate` no es un filtro, es el eje de la pantalla.</b> Gobierna
 * dos cosas a la vez: qué pide el servidor cuando el alcance es `on-date`, y —
 * siempre, en los dos alcances— respecto a qué día se clasifica cada línea en
 * Vigente / Programada / Cerrada. Por eso una sola variable y no dos.
 */
export const useSubscriptionItemsStore = defineStore('subscriptionItems', () => {
  const items = ref<SubscriptionItemResponse[]>([])

  /**
   * De qué contrato es lo que hay guardado.
   *
   * <p>Existe para que la pregunta sobreviva a un salto de pestaña y <b>no</b>
   * sobreviva a un cambio de contrato. Mirar «Lo contratado» el 3 de marzo, ir a
   * «Historia» a ver el otrosí y volver es el recorrido que describe §3.3, y
   * volver a «hoy» en ese viaje obliga a rehacer la pregunta cada vez. Heredar ese
   * 3 de marzo al abrir el expediente de OTRA empresa, en cambio, es responder con
   * confianza una pregunta que nadie hizo. Un id guardado distingue los dos casos;
   * un `reset()` en `onUnmounted` no.
   */
  const loadedFor = ref<number | null>(null)

  /** El día sobre el que se está preguntando. Arranca en hoy, que es la pregunta habitual. */
  const referenceDate = ref<string>(todayISODate())
  const scope = ref<SubscriptionItemsScope>('all')

  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  /**
   * Cuántas líneas dice el servidor que hay frente a cuántas llegaron. Solo se
   * usa para avisar de un expediente truncado: un contrato con más de 200 líneas
   * no debería existir, pero si existe, callarlo sería mentir sobre «lo
   * contratado».
   */
  const totalElements = ref(0)

  function setItems(value: SubscriptionItemResponse[], total: number) {
    items.value = value
    totalElements.value = total
  }

  function setReferenceDate(value: string) {
    referenceDate.value = value
  }

  function setScope(value: SubscriptionItemsScope) {
    scope.value = value
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setSaving(value: boolean) {
    saving.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  /**
   * Vuelve al estado de recién abierto: sin líneas, preguntando por hoy y sobre el
   * expediente completo. Lo llama el composable cuando el contrato que se está
   * mirando no es el que hay guardado (ver `loadedFor`).
   */
  function reset(nextLoadedFor: number | null = null) {
    loadedFor.value = nextLoadedFor
    items.value = []
    totalElements.value = 0
    referenceDate.value = todayISODate()
    scope.value = 'all'
    loading.value = false
    saving.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    items,
    loadedFor,
    referenceDate,
    scope,
    loading,
    saving,
    error,
    errorTraceId,
    totalElements,
    setItems,
    setReferenceDate,
    setScope,
    setLoading,
    setSaving,
    setError,
    reset,
  }
})
