import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  SubscriptionAmendmentResponse,
  SubscriptionStatusChangeResponse,
} from '../types/subscription-history.types'

/**
 * Estado de la película del contrato: los otrosíes y la bitácora de estados
 * cargados para el expediente que está abierto (§4.4.2, tarea W2-C).
 *
 * <p><b>Store de Pinia, no un `ref()` a nivel de módulo dentro del composable.</b>
 * El patrón híbrido está prohibido sin excepciones (CLAUDE.md), y aquí además
 * sería activamente peligroso: un singleton de módulo sobrevive al cambio de
 * ruta, así que abrir el expediente de otra empresa dejaría un instante con los
 * otrosíes del contrato anterior pintados bajo la cabecera del nuevo. `reset()`
 * corta eso, y solo un store tiene un `reset()` al que el ciclo de vida de la
 * vista pueda llamar.
 *
 * <p><b>`loadedFor` no es un detalle.</b> Guarda el par (empresa, contrato) de lo
 * que hay cargado, y no se deriva de la URL: es lo que respondió el servidor para
 * la petición que ganó. Sin él, una carga lenta de un contrato que se acaba de
 * abandonar podría escribir sus otrosíes sobre los del siguiente.
 *
 * <p><b>`truncated` existe porque el techo de páginas es real.</b> La pantalla
 * carga el expediente completo para poder ordenarlo con honestidad, pero con un
 * tope; si se topa, el conjunto que se muestra ya no es la película entera y eso
 * hay que decirlo, no esconderlo tras un paginador que no puede paginar dos
 * fuentes a la vez.
 */
export const useSubscriptionHistoryStore = defineStore('subscriptionHistory', () => {
  const amendments = ref<SubscriptionAmendmentResponse[]>([])
  const statusChanges = ref<SubscriptionStatusChangeResponse[]>([])

  /** El par (empresa, contrato) al que pertenece lo que hay cargado. */
  const loadedFor = ref<{ companyId: number; subscriptionId: number } | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  /** Se topó el techo de páginas: lo cargado NO es el expediente completo. */
  const truncated = ref(false)
  /** Cuántas entradas dice el servidor que hay en total, para poder decir cuántas faltan. */
  const totalAmendments = ref(0)
  const totalStatusChanges = ref(0)

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  function setHistory(payload: {
    companyId: number
    subscriptionId: number
    amendments: SubscriptionAmendmentResponse[]
    statusChanges: SubscriptionStatusChangeResponse[]
    totalAmendments: number
    totalStatusChanges: number
    truncated: boolean
  }) {
    loadedFor.value = { companyId: payload.companyId, subscriptionId: payload.subscriptionId }
    amendments.value = payload.amendments
    statusChanges.value = payload.statusChanges
    totalAmendments.value = payload.totalAmendments
    totalStatusChanges.value = payload.totalStatusChanges
    truncated.value = payload.truncated
  }

  /**
   * Deja la película vacía. Se llama antes de cada carga y al salir: nada de
   * mostrar el expediente de un contrato mientras se carga el de otro, que es la
   * misma regla de recarga que aplica el armazón.
   */
  function reset() {
    amendments.value = []
    statusChanges.value = []
    loadedFor.value = null
    loading.value = false
    error.value = null
    errorTraceId.value = null
    truncated.value = false
    totalAmendments.value = 0
    totalStatusChanges.value = 0
  }

  return {
    amendments,
    statusChanges,
    loadedFor,
    loading,
    error,
    errorTraceId,
    truncated,
    totalAmendments,
    totalStatusChanges,
    setLoading,
    setError,
    setHistory,
    reset,
  }
})
