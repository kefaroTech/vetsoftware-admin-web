import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DunningEventResponse } from '@/features/subscriptions-admin/types/dunning-record.types'

/**
 * <b>La cartera de la empresa que se está mirando</b>: sus hitos de cobranza.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del composable
 * —el patrón híbrido está prohibido (CLAUDE.md · «SIEMPRE Pinia»)—.
 *
 * <p><b>`companyId` se guarda para poder invalidar.</b> Al pasar de la empresa 41
 * a la 42 no puede quedar un solo hito de la anterior pintado mientras carga la
 * siguiente: en esta pantalla concreta eso sería atribuirle una mora a quien no
 * la tiene, y de aquí salen decisiones sobre restringir una cuenta.
 *
 * <p><b>La página viaja con las filas.</b> `truncated` no es cosmético: la lectura
 * de la evidencia —«¿se avisó antes de restringir?»— es exacta solo porque el
 * servidor manda la historia desde el principio, y decir cuántos hitos quedaron
 * fuera es lo que impide leer «lleva 2 avisos» cuando lleva veinte.
 */
export const useCompanyReceivablesStore = defineStore('companyReceivables', () => {
  const companyId = ref<number | null>(null)
  const events = ref<DunningEventResponse[]>([])
  const totalElements = ref(0)

  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  function setTarget(value: number | null) {
    companyId.value = value
  }

  function setEvents(items: DunningEventResponse[], nextTotalElements: number) {
    events.value = items
    totalElements.value = nextTotalElements
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  function reset() {
    companyId.value = null
    events.value = []
    totalElements.value = 0
    loading.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    companyId,
    events,
    totalElements,
    loading,
    error,
    errorTraceId,
    setTarget,
    setEvents,
    setLoading,
    setError,
    reset,
  }
})
