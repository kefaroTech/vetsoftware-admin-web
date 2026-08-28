import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { companyRecordApi } from '../api/company-record.api'
import { useCompanySummaryStore } from '../stores/company-summary.store'

/**
 * <b>La API estable de la pestaña «Resumen» del expediente de empresa (§I2).</b>
 *
 * <p>Carga las dos cosas que el resumen sí puede saber —el contrato vigente y la
 * consulta caliente de permisos y cupos— y expone los contadores ya derivados,
 * para que las seis tarjetas no tengan lógica y quepan holgadamente bajo el techo
 * de 500 líneas por SFC.
 *
 * <p><b>Las dos peticiones van en paralelo y cada una lleva su propio error.</b>
 * Encadenarlas duplicaría la espera de una pantalla cuyo valor entero es que se
 * lee en cinco segundos, y un error compartido convertiría el fallo de una
 * tarjeta en una pantalla vacía. Si `/entitlements/access` falla, las tarjetas de
 * cupos y acceso lo dicen y las cuatro restantes siguen sirviendo.
 *
 * <p><b>Sin toast.</b> Los dos fallos se pintan dentro de la tarjeta que se queda
 * sin datos, que es donde se entienden. Un toast que dice «no se pudo cargar» sin
 * decir qué, sobre una pantalla con seis tarjetas, no informa de nada — y se va,
 * mientras el hueco sigue ahí.
 */
export function useCompanySummary() {
  const store = useCompanySummaryStore()
  const {
    subscription,
    contractLoaded,
    loadingContract,
    contractError,
    access,
    loadingAccess,
    accessError,
  } = storeToRefs(store)

  // Por instancia del composable, no singletons de módulo.
  let contractRequest: AbortController | null = null
  let accessRequest: AbortController | null = null

  /** `true` solo cuando el servidor ya dijo que no hay contrato. Ver el store. */
  const hasNoContract = computed(() => contractLoaded.value && subscription.value === null)

  /**
   * Solo los cupos con techo declarado. Uno sin límite no es un cupo agotado ni
   * uno vacío: es un eje sin techo, y contarlo entre los que se pueden desbordar
   * daría un total que no significa nada.
   */
  const capacities = computed(() =>
    (access.value?.capacities ?? []).filter((c) => c.limitQuantity != null && c.limitQuantity > 0),
  )

  /** Lo dice el servidor con `exhausted`, no se recalcula aquí a ojo. */
  const exhaustedCapacities = computed(() => capacities.value.filter((c) => c.exhausted))

  const entitlementCount = computed(() => access.value?.entitlements.length ?? 0)

  /**
   * Lo único de la tabla de permisos que una persona puso a mano. Se cuenta
   * aparte porque es lo que responde «¿por qué esta clínica ve facturación si no
   * la paga?» sin abrir el contrato.
   */
  const manualGrantCount = computed(
    () => access.value?.entitlements.filter((e) => e.source === 'MANUAL_GRANT').length ?? 0,
  )

  /** <b>Recarga siempre al abrir la pestaña.</b> Regla dura del proyecto. */
  async function load(companyId: number) {
    store.reset()
    await Promise.all([loadContract(companyId), loadAccess(companyId)])
  }

  async function loadContract(companyId: number) {
    contractRequest?.abort()
    const controller = new AbortController()
    contractRequest = controller
    store.setLoadingContract(true)
    store.setContractError(null)
    try {
      const result = await companyRecordApi.findCurrentSubscription(companyId, controller.signal)
      if (!controller.signal.aborted) store.setContract(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setContractError(getProblemDetailMessage(err, 'No se pudo leer el contrato'))
    } finally {
      if (contractRequest === controller) {
        store.setLoadingContract(false)
        contractRequest = null
      }
    }
  }

  async function loadAccess(companyId: number) {
    accessRequest?.abort()
    const controller = new AbortController()
    accessRequest = controller
    store.setLoadingAccess(true)
    store.setAccessError(null)
    try {
      const result = await companyRecordApi.findAccess(companyId, controller.signal)
      if (!controller.signal.aborted) store.setAccess(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setAccessError(getProblemDetailMessage(err, 'No se pudieron leer los cupos y permisos'))
    } finally {
      if (accessRequest === controller) {
        store.setLoadingAccess(false)
        accessRequest = null
      }
    }
  }

  onUnmounted(() => {
    contractRequest?.abort()
    accessRequest?.abort()
  })

  return {
    subscription,
    hasNoContract,
    loadingContract,
    contractError,
    access,
    loadingAccess,
    accessError,
    capacities,
    exhaustedCapacities,
    entitlementCount,
    manualGrantCount,
    load,
  }
}
