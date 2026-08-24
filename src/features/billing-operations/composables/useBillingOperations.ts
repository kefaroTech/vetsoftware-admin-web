import axios from 'axios'
import { computed, onUnmounted, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import { billingOperationsApi } from '../api/billing-operations.api'
import { useBillingOperationsStore } from '../stores/billing-operations.store'
import type {
  BillingDocumentResponse,
  BillingOperationList,
  DunningEventResponse,
  SubscriptionPaymentResponse,
} from '../types/billing-operations.types'

/**
 * Las cuatro listas de `/cobranza`, cada una envuelta en su propio composable.
 *
 * <p>Todas comparten el mismo motor (`useBillingList`) y todas leen y escriben en
 * el store de Pinia con `storeToRefs`: el estado sobrevive al cambio de pestaña,
 * que aquí es un cambio de ruta. La única `ref()` de este módulo está dentro de
 * las funciones —el `AbortController` por instancia—, nunca a nivel de módulo.
 *
 * <p><b>Una petición en vuelo por lista y se aborta la anterior.</b> Pasar de la
 * página 3 a la 4 y volver a la 3 con la red lenta dejaba antes que la respuesta
 * más lenta pisara a la más nueva; el operador veía la página que ya había
 * abandonado y creía que el paginador estaba roto.
 */
function useBillingList<T>(
  list: BillingOperationList,
  page: Ref<PageResponse<T>>,
  apply: (result: PageResponse<T>) => void,
  load: (zeroBasedPage: number, pageSize: number, signal: AbortSignal) => Promise<PageResponse<T>>,
) {
  const store = useBillingOperationsStore()
  const { loading, errors, errorTraceIds } = storeToRefs(store)
  let inflight: AbortController | null = null

  async function fetchPage(oneBasedPage: number) {
    inflight?.abort()
    const controller = new AbortController()
    inflight = controller
    store.setLoading(list, true)
    store.setError(list, null, null)

    try {
      const result = await load(
        Math.max(oneBasedPage - 1, 0),
        page.value.pageSize,
        controller.signal,
      )
      if (!controller.signal.aborted) apply(result)
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      // El mensaje sale del `ProblemDetail`; el literal es solo el suelo cuando
      // no hay cuerpo. Escribirlo a mano tiraría el `X-Trace-Id` y soporte se
      // quedaría sin forma de correlacionar el fallo con el backend.
      store.setError(
        list,
        getProblemDetailMessage(error, 'No se pudo cargar el listado'),
        getTraceId(error) ?? null,
      )
    } finally {
      if (!controller.signal.aborted) store.setLoading(list, false)
    }
  }

  onUnmounted(() => inflight?.abort())

  return {
    items: computed(() => page.value.content),
    /** 1-based: es lo que ve el usuario y lo que consume `AppPagination`. */
    page: computed(() => page.value.page + 1),
    pageSize: computed(() => page.value.pageSize),
    total: computed(() => page.value.totalElements),
    pageCount: computed(() => Math.max(page.value.totalPages, 1)),
    loading: computed(() => loading.value[list]),
    error: computed(() => errors.value[list]),
    errorTraceId: computed(() => errorTraceIds.value[list]),
    reload: () => fetchPage(1),
    goTo: (oneBasedPage: number) => fetchPage(oneBasedPage),
  }
}

/**
 * Los documentos que esperan su referencia de factura fiscal externa.
 *
 * <p>Es **la lista de trabajo de alguien cada mes**, y por eso `/cobranza` abre
 * aquí y no en un resumen: un panel de indicadores no dice qué hacer a
 * continuación.
 */
export function useAwaitingExternalDocuments() {
  const store = useBillingOperationsStore()
  const { awaitingExternal } = storeToRefs(store)
  return useBillingList<BillingDocumentResponse>(
    'awaitingExternal',
    awaitingExternal,
    store.setAwaitingExternal,
    (page, pageSize, signal) => billingOperationsApi.listByAwaitingExternal(page, pageSize, signal),
  )
}

/** La cartera: documentos vencidos con saldo. */
export function useOverdueDocuments() {
  const store = useBillingOperationsStore()
  const { overdue } = storeToRefs(store)
  return useBillingList<BillingDocumentResponse>(
    'overdue',
    overdue,
    store.setOverdue,
    (page, pageSize, signal) => billingOperationsApi.listByOverdue(page, pageSize, signal),
  )
}

/**
 * El feed global de pagos, de **solo consulta**.
 *
 * <p>`companyId` lo filtra el SERVIDOR, así que «ningún pago» es verdad sobre el
 * total y no sobre la página que se está mirando. Cambiar el filtro vuelve a la
 * primera página: quedarse en la 5 deja al operador mirando un hueco del
 * resultado nuevo.
 */
export function usePlatformPayments() {
  const store = useBillingOperationsStore()
  const { payments, companyFilter } = storeToRefs(store)
  const list = useBillingList<SubscriptionPaymentResponse>(
    'payments',
    payments,
    store.setPayments,
    (page, pageSize, signal) =>
      billingOperationsApi.listByPayments(page, pageSize, companyFilter.value.payments, signal),
  )
  return {
    ...list,
    companyId: computed(() => companyFilter.value.payments),
    applyCompanyFilter(companyId: number | null) {
      store.setCompanyFilter('payments', companyId)
      return list.reload()
    },
  }
}

/**
 * El feed global de avisos de mora. Sirve para lo que dice el modelo:
 * **demostrar que se avisó antes de restringir la cuenta**.
 */
export function useDunningEvents() {
  const store = useBillingOperationsStore()
  const { dunning, companyFilter } = storeToRefs(store)
  const list = useBillingList<DunningEventResponse>(
    'dunning',
    dunning,
    store.setDunning,
    (page, pageSize, signal) =>
      billingOperationsApi.listByDunningEvents(page, pageSize, companyFilter.value.dunning, signal),
  )
  return {
    ...list,
    companyId: computed(() => companyFilter.value.dunning),
    applyCompanyFilter(companyId: number | null) {
      store.setCompanyFilter('dunning', companyId)
      return list.reload()
    },
  }
}
