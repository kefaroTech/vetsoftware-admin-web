import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { trialsApi } from '../api/trials.api'
import { useTrialExpirationsStore } from '../stores/trial-expirations.store'
import { addDays, businessToday, trialGrantState } from './trialWindowText'

/**
 * <b>El barrido: qué vence ese día en toda la plataforma.</b>
 *
 * <p>Responde a la pregunta que nadie puede contestar mirando una empresa: «¿a
 * quién hay que llamar hoy?». El endpoint (`GET /system/company-trial-grants/
 * expirations?day=`) devuelve concesiones de <b>todas</b> las empresas, así que
 * cada fila lleva su `CompanyRef` y se puede saltar de ahí al expediente.
 *
 * <p><b>El día por defecto es hoy en la zona del negocio.</b> Resolverlo con el
 * reloj del navegador haría que un operador conectado desde otro huso pidiera el
 * barrido del día siguiente durante las últimas horas de la tarde en Bogotá — y
 * viera una lista vacía justo el día que había que llamar.
 */
export function useTrialExpirations() {
  const store = useTrialExpirationsStore()
  const { day, grants, loading, error, errorTraceId } = storeToRefs(store)

  // Por instancia del composable, no singleton de módulo.
  let request: AbortController | null = null

  /** Las filas ordenadas por empresa, con su desenlace ya resuelto. */
  const rows = computed(() => {
    const today = day.value ?? businessToday()
    return [...grants.value]
      .sort((a, b) => a.companyId - b.companyId || a.catalogItemId - b.catalogItemId)
      .map((grant) => ({ grant, state: trialGrantState(grant, today) }))
  })

  /** Cuántas empresas distintas aparecen. Es el número que dimensiona el trabajo. */
  const companyCount = computed(() => new Set(grants.value.map((g) => g.companyId)).size)

  /**
   * Carga el barrido de un día. <b>Recarga siempre</b>: la lista de a quién hay
   * que llamar hoy no puede venir de una caché de ayer.
   */
  async function loadDay(nextDay: string) {
    request?.abort()
    const controller = new AbortController()
    request = controller

    store.setDay(nextDay)
    store.setGrants([])
    store.setError(null)
    store.setLoading(true)

    try {
      const result = await trialsApi.listExpiringOn(nextDay, controller.signal)
      if (controller.signal.aborted) return
      store.setGrants(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setError(
        getProblemDetailMessage(err, 'No se pudieron cargar los vencimientos de ese día'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (request === controller) {
        store.setLoading(false)
        request = null
      }
    }
  }

  /** El barrido de hoy, en la zona del negocio. */
  function loadToday() {
    return loadDay(businessToday())
  }

  /**
   * Mueve el día n jornadas. Si la fecha guardada no fuera legible —no puede
   * darse, la pone este composable— se vuelve a hoy en vez de quedarse quieto.
   */
  function shiftDay(offset: number) {
    const base = day.value ?? businessToday()
    return loadDay(addDays(base, offset) ?? businessToday())
  }

  onUnmounted(() => request?.abort())

  return {
    day,
    grants,
    rows,
    companyCount,
    loading,
    error,
    errorTraceId,
    loadDay,
    loadToday,
    shiftDay,
    reset: store.reset,
  }
}
