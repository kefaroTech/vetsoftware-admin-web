import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emptyPage, type PageResponse } from '@/types/pagination'
import type {
  BillingDocumentResponse,
  BillingOperationList,
  DunningEventResponse,
  SubscriptionPaymentResponse,
} from '../types/billing-operations.types'

/**
 * El estado de las cuatro pestañas de `/cobranza`.
 *
 * <p><b>Por qué un store y no `ref()` dentro del composable.</b> Las cuatro
 * pestañas son cuatro RUTAS (§2.2), así que cada una monta y desmonta su propia
 * vista. Con estado por instancia, volver de «Pagos» a «Pendiente de facturar»
 * repintaría el esqueleto y perdería la página en la que estaba el operador a
 * mitad del cierre de mes. El estado es compartido entre pantallas: por la regla
 * obligatoria del proyecto, vive en Pinia. Aquí no hay ningún `ref()` a nivel de
 * módulo — el patrón híbrido está prohibido.
 *
 * <p>Las páginas se declaran una por lista y con su tipo concreto en vez de un
 * `Record<BillingOperationList, PageResponse<unknown>>`: el contenido de las
 * cuatro es distinto (documento, documento, pago, evento de mora) y un mapa
 * genérico obligaría a castear en cada consumidor, que es donde se cuelan los
 * campos que el backend renombró.
 */
function initialFlags(): Record<BillingOperationList, boolean> {
  return { awaitingExternal: false, overdue: false, payments: false, dunning: false }
}

function initialMessages(): Record<BillingOperationList, string | null> {
  return { awaitingExternal: null, overdue: null, payments: null, dunning: null }
}

export const useBillingOperationsStore = defineStore('billing-operations', () => {
  const awaitingExternal =
    ref<PageResponse<BillingDocumentResponse>>(emptyPage<BillingDocumentResponse>())
  const overdue = ref<PageResponse<BillingDocumentResponse>>(emptyPage<BillingDocumentResponse>())
  const payments =
    ref<PageResponse<SubscriptionPaymentResponse>>(emptyPage<SubscriptionPaymentResponse>())
  const dunning = ref<PageResponse<DunningEventResponse>>(emptyPage<DunningEventResponse>())

  const loading = ref(initialFlags())
  const errors = ref(initialMessages())
  const errorTraceIds = ref(initialMessages())

  /**
   * Filtro por empresa de las dos listas que el servidor sí sabe filtrar
   * (`/system/subscription-payments` y `/system/dunning-events`).
   *
   * <p>`null` = sin filtro. Es lo que separa el vacío «no hay nada y está bien»
   * del vacío «este filtro no casó»: sin guardar si hay filtro aplicado, los dos
   * estados se pintarían igual y un logro parecería una avería (§3.7).
   *
   * <p>Las otras dos listas NO tienen filtro y por eso no aparecen aquí: el
   * endpoint no lo admite (issue B-3) y filtrar en cliente sobre una página de
   * 20 de 300 filas mentiría sobre el total.
   */
  const companyFilter = ref<Record<'payments' | 'dunning', number | null>>({
    payments: null,
    dunning: null,
  })

  function setAwaitingExternal(page: PageResponse<BillingDocumentResponse>) {
    awaitingExternal.value = page
  }

  function setOverdue(page: PageResponse<BillingDocumentResponse>) {
    overdue.value = page
  }

  function setPayments(page: PageResponse<SubscriptionPaymentResponse>) {
    payments.value = page
  }

  function setDunning(page: PageResponse<DunningEventResponse>) {
    dunning.value = page
  }

  function setLoading(list: BillingOperationList, value: boolean) {
    loading.value[list] = value
  }

  function setError(list: BillingOperationList, message: string | null, traceId: string | null) {
    errors.value[list] = message
    errorTraceIds.value[list] = traceId
  }

  function setCompanyFilter(list: 'payments' | 'dunning', companyId: number | null) {
    companyFilter.value[list] = companyId
  }

  return {
    awaitingExternal,
    overdue,
    payments,
    dunning,
    loading,
    errors,
    errorTraceIds,
    companyFilter,
    setAwaitingExternal,
    setOverdue,
    setPayments,
    setDunning,
    setLoading,
    setError,
    setCompanyFilter,
  }
})
