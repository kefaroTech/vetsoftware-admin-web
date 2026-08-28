import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyLimitOverrideResponse, EffectiveLimitResponse } from '../types/limits.types'

/**
 * Las excepciones de techo de **una** empresa, y los techos efectivos que se han
 * consultado sobre ella.
 *
 * <p><b>`companyId` vive aquí y no en la URL de la vista</b> por la misma razón
 * que el filtro de cobranza: la excepción se negocia en un modal, y volver de él
 * no puede perder sobre quién se estaba trabajando. `null` significa «todavía no
 * se ha elegido empresa», que es un estado distinto de «esta empresa no tiene
 * ninguna excepción» — pintarlos igual convertiría una pantalla sin usar en un
 * informe falso.
 *
 * <p><b>Los techos efectivos se guardan por eje, no en una lista.</b> Se piden de
 * uno en uno (el endpoint es
 * `/effective-limits/{limitDimensionId}`), y lo que la pantalla necesita es
 * responder «¿cuál es el techo de ESTE eje?» sin recorrer nada. Se vacían al
 * cambiar de empresa: un techo es de una empresa concreta y arrastrarlo sería el
 * error más caro que esta pantalla puede cometer.
 */
export const useLimitOverridesStore = defineStore('limit-overrides', () => {
  /** `null` = nadie ha elegido empresa todavía. No es «ninguna excepción». */
  const companyId = ref<number | null>(null)

  const items = ref<CompanyLimitOverrideResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)
  /** `true` en cuanto una carga terminó bien para la empresa actual. */
  const loaded = ref(false)

  /** Techo efectivo por eje, para la empresa de `companyId`. */
  const effectiveLimits = ref<Record<number, EffectiveLimitResponse>>({})
  const effectiveLoading = ref<Record<number, boolean>>({})
  const effectiveErrors = ref<Record<number, string | null>>({})

  function setCompanyId(value: number | null) {
    if (companyId.value === value) return
    companyId.value = value
    // Todo lo de abajo era de la empresa anterior. Conservarlo mostraría el
    // techo de un cliente sobre el nombre de otro.
    items.value = []
    loaded.value = false
    error.value = null
    errorTraceId.value = null
    effectiveLimits.value = {}
    effectiveLoading.value = {}
    effectiveErrors.value = {}
  }

  function setItems(data: CompanyLimitOverrideResponse[]) {
    items.value = data
    loaded.value = true
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  function setEffectiveLimit(limitDimensionId: number, value: EffectiveLimitResponse) {
    effectiveLimits.value = { ...effectiveLimits.value, [limitDimensionId]: value }
  }

  function setEffectiveLoading(limitDimensionId: number, value: boolean) {
    effectiveLoading.value = { ...effectiveLoading.value, [limitDimensionId]: value }
  }

  function setEffectiveError(limitDimensionId: number, message: string | null) {
    effectiveErrors.value = { ...effectiveErrors.value, [limitDimensionId]: message }
  }

  /**
   * Olvida el techo cacheado de un eje.
   *
   * <p>Se llama tras negociar o revocar: el techo que la pantalla tenía a la
   * vista acaba de dejar de ser cierto, y enseñarlo un segundo más es enseñar un
   * dato que ya sabemos falso.
   */
  function forgetEffectiveLimit(limitDimensionId: number) {
    const { [limitDimensionId]: _descartado, ...resto } = effectiveLimits.value
    void _descartado
    effectiveLimits.value = resto
  }

  return {
    companyId,
    items,
    loading,
    error,
    errorTraceId,
    loaded,
    effectiveLimits,
    effectiveLoading,
    effectiveErrors,
    setCompanyId,
    setItems,
    setLoading,
    setError,
    setEffectiveLimit,
    setEffectiveLoading,
    setEffectiveError,
    forgetEffectiveLimit,
  }
})
