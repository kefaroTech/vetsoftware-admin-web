import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import {
  DUNNING_PAGE_SIZE,
  channelTally,
  dunningEvidence,
  reactivationSignal,
  writtenOffAt,
} from '@/features/subscriptions-admin/composables/dunningRecordText'
import { companyReceivablesApi } from '../api/company-receivables.api'
import { useCompanyReceivablesStore } from '../stores/company-receivables.store'

/**
 * <b>La API estable de la cartera de una empresa</b> (§I6).
 *
 * <p><b>Reusa la lectura de la evidencia de `subscriptions-admin` en vez de
 * copiarla.</b> `dunningEvidence`, `channelTally`, `reactivationSignal` y
 * `writtenOffAt` son funciones puras sobre una lista de hitos, y la lista es la
 * misma cosa aquí y en el expediente del contrato — solo cambia por qué se
 * filtró. Duplicar ese cálculo es exactamente cómo se acaba con dos pantallas
 * que responden distinto a «¿se avisó antes de restringir?» sobre los mismos
 * hechos, y el trinquete del repositorio prohíbe los cuerpos duplicados desde el
 * primer commit.
 *
 * <p><b>Lo que cambia respecto del expediente del contrato es el alcance, y es
 * deliberado.</b> Allí se miran los hitos de <i>un</i> contrato; aquí, los de
 * <b>todos</b> los que ha tenido la empresa. Una clínica que renovó contrato el
 * año pasado arrastra su mora anterior, y es justo la que explica por qué llegó a
 * solo lectura.
 *
 * <p><b>Recarga siempre al abrir la pantalla</b> (regla del expediente): una
 * cartera en caché es el dato que peor envejece, porque cambia solo con el paso
 * de los días.
 */
export function useCompanyReceivables() {
  const store = useCompanyReceivablesStore()
  const { events, totalElements, loading, error, errorTraceId } = storeToRefs(store)

  // Por instancia del composable, no singleton de módulo.
  let request: AbortController | null = null

  /**
   * <b>«¿Se le avisó antes de restringirle la cuenta?»</b> La pregunta con
   * consecuencias, calculada y no insinuada por una tabla.
   */
  const evidence = computed(() => dunningEvidence(events.value))

  /** Qué canal se usó y cuántas veces. Vacío si no hay ningún recordatorio. */
  const channels = computed(() => channelTally(events.value))

  /** Si la cuenta se reactivó tras la restricción. */
  const reactivation = computed(() => reactivationSignal(events.value))

  /** Cuándo se dio de baja contable, si se hizo. */
  const writeOff = computed(() => writtenOffAt(events.value))

  /**
   * Cuántos hitos quedaron fuera de la página. <b>Se dice</b>: la evidencia de
   * arriba es exacta porque el servidor manda la historia desde el principio,
   * pero un recuento presentado como total cuando es parcial es un número
   * inventado.
   */
  const truncated = computed(() => Math.max(0, totalElements.value - events.value.length))

  async function openReceivables(nextCompanyId: number) {
    request?.abort()
    const controller = new AbortController()
    request = controller

    store.setTarget(nextCompanyId)
    store.setEvents([], 0)
    store.setError(null)
    store.setLoading(true)

    try {
      const result = await companyReceivablesApi.listByCompany(
        nextCompanyId,
        0,
        DUNNING_PAGE_SIZE,
        controller.signal,
      )
      if (controller.signal.aborted) return
      store.setEvents(result.content, result.totalElements)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // El mensaje sale del `ProblemDetail` y nunca se escribe a mano: hacerlo
      // tira la traza con la que se encuentra la petición en Grafana.
      store.setError(
        getProblemDetailMessage(err, 'No se pudo cargar la cartera de esta empresa'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (request === controller) {
        store.setLoading(false)
        request = null
      }
    }
  }

  onUnmounted(() => request?.abort())

  return {
    events,
    totalElements,
    evidence,
    channels,
    reactivation,
    writeOff,
    truncated,
    loading,
    error,
    errorTraceId,
    openReceivables,
    closeReceivables: store.reset,
  }
}
