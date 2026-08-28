import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyCapacityResponse } from '@/features/subscriptions-admin/types/entitlements.types'
import type {
  CompanyEntitlementSnapshotResponse,
  CompanyLimitEventResponse,
  EffectiveLimitResponse,
} from '../types/company-limits.types'

/**
 * <b>Los cupos de la empresa que se está mirando.</b>
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del composable
 * —el patrón híbrido está prohibido (CLAUDE.md · «SIEMPRE Pinia»)— y tiene que
 * ser compartido: la pestaña, su tabla de bitácora y el modal de corrección leen
 * los mismos contadores, y después de corregir uno los tres tienen que verlo
 * cambiado a la vez. Con estado local, el modal se cerraría enseñando una cifra y
 * la tarjeta de detrás seguiría con la anterior.
 *
 * <p><b>Los techos efectivos van en un mapa por eje y no en la lista.</b> Llegan
 * de N llamadas independientes —el contrato no publica ninguna en bloque— y
 * pueden llegar en cualquier orden; con un mapa, cada respuesta aterriza en su
 * sitio sin depender de que las demás hayan llegado, y la tarjeta de un eje sin
 * respuesta todavía dice «no lo sé» en vez de heredar el techo de otro.
 */
export const useCompanyLimitsStore = defineStore('companyLimits', () => {
  const companyId = ref<number | null>(null)

  /** Los contadores: consumo y techo por eje, tal y como los calcula el backend. */
  const capacities = ref<CompanyCapacityResponse[]>([])
  /** Cuándo se recalculó por última vez lo que la empresa puede usar. */
  const recalculatedAt = ref<string | null>(null)
  /** Techo efectivo por `limitDimensionId`. Lo que falta, falta: no se rellena. */
  const effectiveLimits = ref<Record<number, EffectiveLimitResponse>>({})
  const events = ref<CompanyLimitEventResponse[]>([])
  const snapshot = ref<CompanyEntitlementSnapshotResponse | null>(null)

  const loading = ref(false)
  const adjusting = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  function setTarget(value: number | null) {
    companyId.value = value
  }

  function setAccess(next: CompanyCapacityResponse[], at: string | null) {
    capacities.value = next
    recalculatedAt.value = at
  }

  function setEffectiveLimit(value: EffectiveLimitResponse) {
    effectiveLimits.value = { ...effectiveLimits.value, [value.limitDimensionId]: value }
  }

  function clearEffectiveLimits() {
    effectiveLimits.value = {}
  }

  function setEvents(value: CompanyLimitEventResponse[]) {
    events.value = value
  }

  function setSnapshot(value: CompanyEntitlementSnapshotResponse | null) {
    snapshot.value = value
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setAdjusting(value: boolean) {
    adjusting.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  /** Deja los cupos en blanco. Nada de contadores de una empresa ajena en pantalla. */
  function reset() {
    companyId.value = null
    capacities.value = []
    recalculatedAt.value = null
    effectiveLimits.value = {}
    events.value = []
    snapshot.value = null
    loading.value = false
    adjusting.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    companyId,
    capacities,
    recalculatedAt,
    effectiveLimits,
    events,
    snapshot,
    loading,
    adjusting,
    error,
    errorTraceId,
    setTarget,
    setAccess,
    setEffectiveLimit,
    clearEffectiveLimits,
    setEvents,
    setSnapshot,
    setLoading,
    setAdjusting,
    setError,
    reset,
  }
})
