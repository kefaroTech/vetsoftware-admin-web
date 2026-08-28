import { computed, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { PageResponse } from '@/types/pagination'
import { billingOperationsApi } from '../api/billing-operations.api'
import { useBillingOperationsStore } from '../stores/billing-operations.store'
import { usePagedFeed } from './usePagedFeed'
import type {
  BillingDocumentResponse,
  BillingOperationList,
  DunningEventResponse,
  SubscriptionPaymentResponse,
} from '../types/billing-operations.types'

/**
 * Las cuatro listas de `/cobranza`, cada una envuelta en su propio composable.
 *
 * <p>Todas comparten el mismo motor —`usePagedFeed`, que también mueve los ocho
 * listados del circuito del dinero— y todas leen y escriben en el store de Pinia
 * con `storeToRefs`: el estado sobrevive al cambio de pestaña, que aquí es un
 * cambio de ruta. En este módulo no hay ninguna `ref()` a nivel de módulo.
 *
 * <p>Esta función es el <b>adaptador</b> entre ese motor y el store de cobranza:
 * traduce la clave de la lista a los cuatro accesos que el motor necesita. La
 * lógica de aborto, de página y de error vive una sola vez, en `usePagedFeed`.
 */
function useBillingList<T>(
  list: BillingOperationList,
  page: Ref<PageResponse<T>>,
  apply: (result: PageResponse<T>) => void,
  load: (zeroBasedPage: number, pageSize: number, signal: AbortSignal) => Promise<PageResponse<T>>,
) {
  const store = useBillingOperationsStore()
  const { loading, errors, errorTraceIds } = storeToRefs(store)

  return usePagedFeed<T>({
    page,
    apply,
    setLoading: (value) => store.setLoading(list, value),
    setError: (message, traceId) => store.setError(list, message, traceId),
    isLoading: () => loading.value[list],
    getError: () => errors.value[list],
    getErrorTraceId: () => errorTraceIds.value[list],
    load,
  })
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
