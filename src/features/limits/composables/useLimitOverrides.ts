import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { limitOverridesApi } from '../api/limits.api'
import { useLimitOverridesStore } from '../stores/limit-overrides.store'
import type {
  GrantCompanyLimitOverrideRequest,
  RevokeCompanyLimitOverrideRequest,
} from '../types/limits.types'

/**
 * **Las excepciones de techo negociadas con un cliente**, y el techo efectivo que
 * resultan.
 *
 * <p>Todo lo de aquí es de **una** empresa: el contrato no expone un barrido de
 * todas. `companyId` es por tanto el primer paso de la pantalla y no un filtro
 * opcional — ver `LimitOverridesView.vue`.
 */
export function useLimitOverrides() {
  const store = useLimitOverridesStore()
  const {
    companyId,
    items,
    loading,
    error,
    errorTraceId,
    loaded,
    effectiveLimits,
    effectiveLoading,
    effectiveErrors,
  } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  const saving = ref(false)

  /**
   * La excepción **viva** de cada eje. Solo puede haber una por eje, y es la que
   * manda sobre el techo.
   */
  const alive = computed(() => items.value.filter((o) => o.alive))

  /**
   * Las revocadas. **No se ocultan**: son la prueba de que se concedió algo y de
   * que se retiró, con quién y por qué. Esconderlas dejaría el expediente
   * diciendo que nunca hubo excepción.
   */
  const revoked = computed(() => items.value.filter((o) => !o.alive))

  /** Los identificadores de eje que ya tienen excepción viva: no se puede negociar otra. */
  const dimensionsWithAliveOverride = computed(
    () => new Set(alive.value.map((o) => o.limitDimensionId)),
  )

  function selectCompany(value: number | null) {
    store.setCompanyId(value)
  }

  async function reload() {
    const id = companyId.value
    if (id === null) return
    store.setLoading(true)
    store.setError(null)
    try {
      store.setItems(await limitOverridesApi.listByCompany(id))
    } catch (e) {
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar las excepciones de techo'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar las excepciones de techo', e)
    } finally {
      store.setLoading(false)
    }
  }

  /** Elige empresa y carga de una vez. Es lo que dispara el selector. */
  async function loadFor(value: number | null) {
    selectCompany(value)
    if (value !== null) await reload()
  }

  /**
   * El techo efectivo de un eje, **preguntado al servidor**.
   *
   * <p>La precedencia `COMPANY_OVERRIDE > SUBSCRIPTION > CATALOG_DEFAULT > NONE`
   * la resuelve el backend. Aquí no se cruza la excepción con el contrato ni con
   * el catálogo: se pide y se pinta con su procedencia.
   */
  async function loadEffectiveLimit(limitDimensionId: number) {
    const id = companyId.value
    if (id === null) return null
    store.setEffectiveLoading(limitDimensionId, true)
    store.setEffectiveError(limitDimensionId, null)
    try {
      const data = await limitOverridesApi.findEffectiveLimit(id, limitDimensionId)
      store.setEffectiveLimit(limitDimensionId, data)
      return data
    } catch (e) {
      store.setEffectiveError(
        limitDimensionId,
        getProblemDetailMessage(e, 'No se pudo consultar el techo efectivo'),
      )
      errorFrom('Error al consultar el techo efectivo', e)
      return null
    } finally {
      store.setEffectiveLoading(limitDimensionId, false)
    }
  }

  /**
   * Negocia una excepción. La firma —motivo de lista cerrada y nota— la recoge
   * `SignedActionModal` y llega ya validada: sin motivo no se emite.
   */
  async function grant(payload: GrantCompanyLimitOverrideRequest) {
    const id = companyId.value
    if (id === null || saving.value) return null
    saving.value = true
    try {
      const data = await limitOverridesApi.grant(id, payload)
      success(
        'Excepción negociada',
        `La empresa #${id} pasa a un techo de ${payload.limitQuantity} en este eje.`,
      )
      // El techo cacheado acaba de dejar de ser cierto.
      store.forgetEffectiveLimit(payload.limitDimensionId)
      await reload()
      return data
    } catch (e) {
      errorFrom('Error al negociar la excepción', e, 'No se pudo conceder la excepción.')
      throw e
    } finally {
      saving.value = false
    }
  }

  /**
   * Revoca la excepción viva de un eje.
   *
   * <p>La consecuencia se dice antes, en el modal: el techo vuelve al del
   * contrato o al del plan, y **si el consumo ya lo supera la cuenta queda
   * desbordada** — conserva lo suyo y deja de poder crear.
   */
  async function revoke(limitDimensionId: number, payload: RevokeCompanyLimitOverrideRequest) {
    const id = companyId.value
    if (id === null || saving.value) return null
    saving.value = true
    try {
      const data = await limitOverridesApi.revoke(id, limitDimensionId, payload)
      success('Excepción revocada', 'El techo vuelve al que fijan el contrato o el plan.')
      store.forgetEffectiveLimit(limitDimensionId)
      await reload()
      return data
    } catch (e) {
      errorFrom('Error al revocar la excepción', e, 'No se pudo revocar la excepción.')
      throw e
    } finally {
      saving.value = false
    }
  }

  return {
    companyId,
    overrides: items,
    alive,
    revoked,
    dimensionsWithAliveOverride,
    effectiveLimits,
    effectiveLoading,
    effectiveErrors,
    loading,
    error,
    errorTraceId,
    loaded,
    saving,
    selectCompany,
    loadFor,
    reload,
    loadEffectiveLimit,
    grant,
    revoke,
  }
}
