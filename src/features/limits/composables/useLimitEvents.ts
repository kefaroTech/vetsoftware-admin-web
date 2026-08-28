import { computed, onUnmounted } from 'vue'
import axios from 'axios'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { limitEventsApi } from '../api/limits.api'
import { useLimitEventsStore, type LimitEventScope } from '../stores/limit-events.store'
import { defaultEventRange } from './limitText'
import { overLimitHeadline, summarizeOverLimit } from './overLimitAccounts'

/**
 * **La bitácora de cupo**, en sus dos lecturas.
 *
 * <p>La misma petición sirve a dos pantallas que preguntan cosas distintas, así
 * que el composable se parametriza por rodaja y cada una guarda su empresa, su
 * ventana y sus resultados. Compartirlas haría que consultar marzo en la
 * bitácora cambiara en silencio el diagnóstico de «cuentas desbordadas».
 *
 * <p><b>Una petición en vuelo por rodaja, y se aborta la anterior.</b> Cambiar de
 * ventana dos veces seguidas con la red lenta dejaba antes que la respuesta más
 * vieja pisara a la más nueva: el operador veía el rango que ya había
 * abandonado y concluía que el filtro no funcionaba.
 */
export function useLimitEvents(scope: LimitEventScope) {
  const store = useLimitEventsStore()
  const { companyId, range, items, loading, errors, errorTraceIds, loaded } = storeToRefs(store)
  const { errorFrom } = useToast()

  // Por instancia, dentro de la función: no es un singleton de módulo.
  let inflight: AbortController | null = null

  if (range.value[scope] === null) store.setRange(scope, defaultEventRange())

  async function fetchEvents() {
    const id = companyId.value[scope]
    const ventana = range.value[scope]
    if (id === null || ventana === null) return

    inflight?.abort()
    const controller = new AbortController()
    inflight = controller

    store.setLoading(scope, true)
    store.setError(scope, null, null)
    try {
      const data = await limitEventsApi.listByCompany(
        id,
        ventana.from,
        ventana.to,
        controller.signal,
      )
      if (!controller.signal.aborted) store.setItems(scope, data)
    } catch (e) {
      if (axios.isCancel(e) || controller.signal.aborted) return
      store.setError(
        scope,
        getProblemDetailMessage(e, 'No se pudo cargar la bitácora de cupo'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar la bitácora de cupo', e)
    } finally {
      if (!controller.signal.aborted) store.setLoading(scope, false)
    }
  }

  /** Aplica empresa y ventana de una vez, y consulta. */
  async function applyQuery(nextCompanyId: number | null, from: string, to: string) {
    store.setCompanyId(scope, nextCompanyId)
    store.setRange(scope, { from, to })
    if (nextCompanyId !== null) await fetchEvents()
  }

  onUnmounted(() => inflight?.abort())

  /**
   * Los hechos, **del más reciente al más antiguo**.
   *
   * <p>El contrato no garantiza el orden de la respuesta y una bitácora que no
   * va en orden no es una bitácora. Se ordena aquí y no en la plantilla porque
   * el orden es parte de la respuesta a la pregunta, no de su pintado.
   */
  const events = computed(() =>
    [...items.value[scope]].sort((a, b) => {
      if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? 1 : -1
      return b.id - a.id
    }),
  )

  /** El último estado conocido de cada eje. Solo lo usa «cuentas desbordadas». */
  const overLimitRows = computed(() => summarizeOverLimit(items.value[scope]))

  const headline = computed(() => overLimitHeadline(overLimitRows.value))

  return {
    companyId: computed(() => companyId.value[scope]),
    range: computed(() => range.value[scope] ?? defaultEventRange()),
    events,
    overLimitRows,
    headline,
    loading: computed(() => loading.value[scope]),
    error: computed(() => errors.value[scope]),
    errorTraceId: computed(() => errorTraceIds.value[scope]),
    loaded: computed(() => loaded.value[scope]),
    applyQuery,
    reload: fetchEvents,
  }
}
