import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyLimitEventResponse } from '../types/limits.types'

/**
 * Las dos lecturas del mismo feed.
 *
 * <p>`GET /system/company-limit-events/companies/{companyId}?from&to` alimenta
 * dos pantallas que preguntan cosas distintas: **«cuentas desbordadas»** quiere
 * el último estado conocido de cada eje, y **«bitácora»** quiere los hechos, uno
 * a uno, en orden. Son la misma petición con ventanas de fecha distintas, así
 * que se guardan en dos rodajas separadas: compartir una sola haría que abrir la
 * bitácora de marzo cambiara, sin avisar, el diagnóstico de la otra pantalla.
 *
 * <p>El estado vive en Pinia y no en las vistas porque las dos son rutas
 * hermanas: ir a mirar la bitácora y volver no puede perder la empresa ni la
 * ventana que alguien acababa de elegir.
 */
export type LimitEventScope = 'overLimit' | 'ledger'

/** La ventana de fechas de una consulta. Las dos son ISO `aaaa-mm-dd`. */
export interface LimitEventRange {
  from: string
  to: string
}

function porRodaja<T>(valor: () => T): Record<LimitEventScope, T> {
  return { overLimit: valor(), ledger: valor() }
}

export const useLimitEventsStore = defineStore('limit-events', () => {
  /** `null` = todavía no se ha elegido empresa. No es «no pasó nada». */
  const companyId = ref<Record<LimitEventScope, number | null>>(porRodaja(() => null))
  const range = ref<Record<LimitEventScope, LimitEventRange | null>>(porRodaja(() => null))
  const items = ref<Record<LimitEventScope, CompanyLimitEventResponse[]>>(
    porRodaja<CompanyLimitEventResponse[]>(() => []),
  )
  const loading = ref<Record<LimitEventScope, boolean>>(porRodaja(() => false))
  const errors = ref<Record<LimitEventScope, string | null>>(porRodaja(() => null))
  const errorTraceIds = ref<Record<LimitEventScope, string | null>>(porRodaja(() => null))
  /** `true` en cuanto una consulta terminó bien con los criterios actuales. */
  const loaded = ref<Record<LimitEventScope, boolean>>(porRodaja(() => false))

  function setCompanyId(scope: LimitEventScope, value: number | null) {
    if (companyId.value[scope] === value) return
    companyId.value = { ...companyId.value, [scope]: value }
    // Los hechos cargados eran de otra empresa: se descartan enteros.
    items.value = { ...items.value, [scope]: [] }
    loaded.value = { ...loaded.value, [scope]: false }
  }

  function setRange(scope: LimitEventScope, value: LimitEventRange) {
    range.value = { ...range.value, [scope]: value }
  }

  function setItems(scope: LimitEventScope, data: CompanyLimitEventResponse[]) {
    items.value = { ...items.value, [scope]: data }
    loaded.value = { ...loaded.value, [scope]: true }
  }

  function setLoading(scope: LimitEventScope, value: boolean) {
    loading.value = { ...loading.value, [scope]: value }
  }

  function setError(scope: LimitEventScope, message: string | null, traceId: string | null = null) {
    errors.value = { ...errors.value, [scope]: message }
    errorTraceIds.value = { ...errorTraceIds.value, [scope]: traceId }
  }

  return {
    companyId,
    range,
    items,
    loading,
    errors,
    errorTraceIds,
    loaded,
    setCompanyId,
    setRange,
    setItems,
    setLoading,
    setError,
  }
})
