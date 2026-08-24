import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emptyPage, type PageResponse } from '@/types/pagination'
import type {
  BillingDocumentResponse,
  SubscriptionPaymentResponse,
} from '@/features/billing-operations/types/billing-operations.types'
import type {
  SubscriptionChargeResponse,
  SubscriptionChargeStatus,
} from '../types/subscription-money.types'

/**
 * Estado de `/dinero`: <b>tres listas, una por verbo</b>, y las dos consultas que
 * el operador puede cambiar sin recargar la pantalla.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del composable:
 * el patrón híbrido está prohibido (CLAUDE.md) <b>sin excepciones para estado
 * nuevo</b>. Y aquí además tiene que ser compartido de verdad: registrar un pago
 * repinta la vista entera, y sin store el filtro de estado de los cargos y la
 * página de los documentos volverían a su valor inicial cada vez que se guarda un
 * pago — justo cuando el operador está comprobando el efecto de lo que acaba de
 * registrar.
 *
 * <p><b>Tres listas y no una.</b> Fundirlas en un solo `items` obligaría a
 * distinguirlas por un campo discriminante y haría posible pintar un cargo donde
 * va un pago. Son tres tablas del contrato con tres formas distintas, y la
 * separación de §3.5 empieza aquí: si el estado ya las mezcla, la pantalla no
 * puede desmezclarlas.
 *
 * <p><b>`loadedCompanyId` y `loadedSubscriptionId` no son decorativos.</b> Los
 * cuatro endpoints resuelven la empresa con la cabecera `X-Company-Id`, así que lo
 * que hay aquí dentro no lleva escrito de quién es. Guardar de qué par
 * (empresa, contrato) se cargó es lo que permite tirarlo al abrir otro expediente
 * en vez de enseñar el dinero de una clínica bajo la cabecera de otra — que en
 * esta pantalla concreta significaría registrarle un pago a quien no lo hizo.
 */
export const useSubscriptionMoneyStore = defineStore('subscriptionMoney', () => {
  const loadedCompanyId = ref<number | null>(null)
  const loadedSubscriptionId = ref<number | null>(null)

  /** Devengado: `GET /subscription-billing/charges`, filtrable por estado. */
  const charges = ref<PageResponse<SubscriptionChargeResponse>>(emptyPage())
  /** Facturado: `GET /subscription-billing/documents`, de la EMPRESA, sin filtro por contrato. */
  const documents = ref<PageResponse<BillingDocumentResponse>>(emptyPage())
  /** Cobrado: `GET /subscription-payments`, de la EMPRESA — un pago no es de un contrato. */
  const payments = ref<PageResponse<SubscriptionPaymentResponse>>(emptyPage())

  /** `null` = los tres estados. Es una consulta, no un dato. */
  const chargeStatus = ref<SubscriptionChargeStatus | null>(null)

  /**
   * Solo los documentos de este contrato, o todos los de la empresa.
   *
   * <p>El filtro se aplica <b>sobre la página cargada</b> porque el endpoint no
   * acepta `subscriptionId`; la pantalla dice sobre qué está filtrando en vez de
   * dejar creer que el recuento es el total.
   */
  const documentScope = ref<'contract' | 'company'>('contract')

  /**
   * El documento cuya composición se está mirando, o `null`.
   *
   * <p>Es la mitad de vuelta de la cadena de §3.3 —«¿por qué se le facturaron
   * 179.000?» → los cargos que lo componen— y vive en el store, no en la vista,
   * porque tiene que sobrevivir al repintado que provoca registrar un pago.
   */
  const focusedDocumentId = ref<number | null>(null)

  const loadingCharges = ref(false)
  const loadingDocuments = ref(false)
  const loadingPayments = ref(false)
  const savingPayment = ref(false)

  const chargesError = ref<string | null>(null)
  const chargesErrorTraceId = ref<string | null>(null)
  const documentsError = ref<string | null>(null)
  const documentsErrorTraceId = ref<string | null>(null)
  const paymentsError = ref<string | null>(null)
  const paymentsErrorTraceId = ref<string | null>(null)

  function setTarget(companyId: number | null, subscriptionId: number | null) {
    loadedCompanyId.value = companyId
    loadedSubscriptionId.value = subscriptionId
  }

  function setCharges(value: PageResponse<SubscriptionChargeResponse>) {
    charges.value = value
  }

  function setDocuments(value: PageResponse<BillingDocumentResponse>) {
    documents.value = value
  }

  function setPayments(value: PageResponse<SubscriptionPaymentResponse>) {
    payments.value = value
  }

  function setChargeStatus(value: SubscriptionChargeStatus | null) {
    chargeStatus.value = value
  }

  function setDocumentScope(value: 'contract' | 'company') {
    documentScope.value = value
  }

  function setFocusedDocumentId(value: number | null) {
    focusedDocumentId.value = value
  }

  function setLoadingCharges(value: boolean) {
    loadingCharges.value = value
  }

  function setLoadingDocuments(value: boolean) {
    loadingDocuments.value = value
  }

  function setLoadingPayments(value: boolean) {
    loadingPayments.value = value
  }

  function setSavingPayment(value: boolean) {
    savingPayment.value = value
  }

  function setChargesError(message: string | null, traceId: string | null = null) {
    chargesError.value = message
    chargesErrorTraceId.value = traceId
  }

  function setDocumentsError(message: string | null, traceId: string | null = null) {
    documentsError.value = message
    documentsErrorTraceId.value = traceId
  }

  function setPaymentsError(message: string | null, traceId: string | null = null) {
    paymentsError.value = message
    paymentsErrorTraceId.value = traceId
  }

  /**
   * Deja la sub-vista vacía.
   *
   * <p>`chargeStatus` y `documentScope` <b>no</b> se tocan: son preferencias de
   * lectura del operador, no datos de la empresa, y devolverlas a su valor inicial
   * cada vez que se abre otro expediente es pelearse con quien está revisando
   * varias cuentas seguidas. `focusedDocumentId` sí se limpia, y por lo contrario:
   * apunta a un documento concreto que no existe en el expediente siguiente.
   */
  function reset() {
    loadedCompanyId.value = null
    loadedSubscriptionId.value = null
    charges.value = emptyPage()
    documents.value = emptyPage()
    payments.value = emptyPage()
    focusedDocumentId.value = null
    loadingCharges.value = false
    loadingDocuments.value = false
    loadingPayments.value = false
    savingPayment.value = false
    chargesError.value = null
    chargesErrorTraceId.value = null
    documentsError.value = null
    documentsErrorTraceId.value = null
    paymentsError.value = null
    paymentsErrorTraceId.value = null
  }

  return {
    loadedCompanyId,
    loadedSubscriptionId,
    charges,
    documents,
    payments,
    chargeStatus,
    documentScope,
    focusedDocumentId,
    loadingCharges,
    loadingDocuments,
    loadingPayments,
    savingPayment,
    chargesError,
    chargesErrorTraceId,
    documentsError,
    documentsErrorTraceId,
    paymentsError,
    paymentsErrorTraceId,
    setTarget,
    setCharges,
    setDocuments,
    setPayments,
    setChargeStatus,
    setDocumentScope,
    setFocusedDocumentId,
    setLoadingCharges,
    setLoadingDocuments,
    setLoadingPayments,
    setSavingPayment,
    setChargesError,
    setDocumentsError,
    setPaymentsError,
    reset,
  }
})
