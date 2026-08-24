import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DunningEventResponse } from '../types/dunning-record.types'

/**
 * Estado de `/cobranza`: el expediente de mora del contrato abierto.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del
 * composable: el patrón híbrido está prohibido <b>sin excepciones para estado
 * nuevo</b> (CLAUDE.md). Y aquí además hace falta que sea compartido de verdad —
 * la vista, la línea de tiempo y los dos formularios leen y escriben la misma
 * lista, y tras anotar un hito la secuencia entera se vuelve a leer.
 *
 * <p><b>`loadedSubscriptionId` no es decorativo.</b> Los dos endpoints resuelven
 * la empresa con la cabecera `X-Company-Id`, así que lo que hay aquí dentro no
 * lleva escrito de quién es. Guardar de qué contrato se cargó es lo que permite
 * tirarlo al abrir otro expediente en vez de enseñar la mora de la clínica
 * anterior bajo la cabecera de la nueva — que en esta pantalla concreta sería
 * enseñarle a alguien la deuda de otro.
 *
 * <p><b>`total` se guarda aparte de `events.length` a propósito.</b> No son lo
 * mismo: el servidor tope la página en 200 filas, así que un expediente más largo
 * llegaría recortado, y sin la cifra real esta pantalla presentaría una película
 * incompleta como si fuera entera.
 */
export const useDunningRecordStore = defineStore('subscriptionDunningRecord', () => {
  const loadedSubscriptionId = ref<number | null>(null)

  /** En orden cronológico ascendente, tal como lo manda el servidor. */
  const events = ref<DunningEventResponse[]>([])

  /** Cuántos hay de verdad en el servidor, que puede ser más de los cargados. */
  const total = ref(0)

  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  function setLoadedSubscriptionId(value: number | null) {
    loadedSubscriptionId.value = value
  }

  function setEvents(value: DunningEventResponse[], totalElements: number) {
    events.value = value
    total.value = totalElements
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

  function reset() {
    loadedSubscriptionId.value = null
    events.value = []
    total.value = 0
    loading.value = false
    saving.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    loadedSubscriptionId,
    events,
    total,
    loading,
    saving,
    error,
    errorTraceId,
    setLoadedSubscriptionId,
    setEvents,
    setLoading,
    setSaving,
    setError,
    reset,
  }
})
