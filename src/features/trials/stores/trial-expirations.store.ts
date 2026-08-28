import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyTrialGrantResponse } from '../types/trials.types'

/**
 * <b>El barrido de vencimientos</b>: qué concesiones de prueba terminan un día
 * dado, en toda la plataforma.
 *
 * <p>Es estado compartido y por eso es un store de Pinia y no un `ref()` a nivel
 * de módulo dentro del composable (CLAUDE.md · «SIEMPRE Pinia»). Lo comparten
 * hoy dos anfitriones —la pestaña «Prueba» del expediente de empresa y la del
 * expediente del contrato— y el día en el que estén mirando tiene que ser el
 * mismo en los dos: dos listas de vencimientos de días distintos con el mismo
 * rótulo es cómo se llama al cliente equivocado.
 *
 * <p><b>El día es parte del estado, no un argumento suelto.</b> Lo que se está
 * mirando es «los vencimientos DEL día X»; si el día no se guarda junto a la
 * lista, una respuesta lenta de ayer puede pintarse bajo el rótulo de hoy.
 */
export const useTrialExpirationsStore = defineStore('trialExpirations', () => {
  /** `yyyy-MM-dd` en la zona del negocio. Nulo antes de la primera carga. */
  const day = ref<string | null>(null)
  const grants = ref<CompanyTrialGrantResponse[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  function setDay(value: string | null) {
    day.value = value
  }

  function setGrants(value: CompanyTrialGrantResponse[]) {
    grants.value = value
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  function reset() {
    day.value = null
    grants.value = []
    loading.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    day,
    grants,
    loading,
    error,
    errorTraceId,
    setDay,
    setGrants,
    setLoading,
    setError,
    reset,
  }
})
