import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { SubscriptionPaymentResponse } from '@/features/billing-operations/types/billing-operations.types'
import { subscriptionMoneyApi } from '../api/subscription-money.api'
import { useSubscriptionMoneyStore } from '../stores/subscription-money.store'
import type {
  RegisterSubscriptionPaymentRequest,
  SubscriptionChargeStatus,
} from '../types/subscription-money.types'
import {
  DUPLICATE_PAYMENT_MESSAGE,
  accruedSummary,
  accruedTotals,
  collectedSummary,
  collectedTotals,
} from './subscriptionMoneyText'

/**
 * La API estable de `/dinero` (§3.5 y §4.4.2, tarea W2-E).
 *
 * <p><b>No recarga el contrato.</b> El armazón ya lo cargó y garantiza que
 * `companyId` no es `null` mientras el expediente esté pintado; esta sub-vista lee
 * ese `companyId` y se lo pasa a su cliente de API para que la cabecera
 * `X-Company-Id` viaje también en sus cuatro llamadas.
 *
 * <p><b>Tres lecturas, tres `AbortController` distintos.</b> Los tres endpoints
 * responden a verbos distintos y dos de ellos paginan por su cuenta. Compartir un
 * solo controlador haría que pasar de página en los documentos cancelara la carga
 * de los cargos, y la pantalla se quedaría con el bloque «Devengado» vacío sin que
 * nada lo explicara.
 *
 * <p>Las `ref()` de este módulo están todas dentro de la función —los tres
 * controladores son por instancia—, nunca a nivel de módulo: el patrón híbrido
 * está prohibido y el estado compartido vive en el store.
 */
export function useSubscriptionMoney() {
  const store = useSubscriptionMoneyStore()
  const {
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
  } = storeToRefs(store)
  const { errorFrom, warnFrom, success } = useToast()

  let chargesRequest: AbortController | null = null
  let documentsRequest: AbortController | null = null
  let paymentsRequest: AbortController | null = null

  const chargeRows = computed(() => charges.value.content)

  /**
   * Los cargos que componen el documento que se está mirando.
   *
   * <p><b>El cruce se hace aquí y no en el servidor porque el contrato no
   * ofrece otra cosa</b>: `GET /subscription-billing/charges` acepta
   * `subscriptionId` y `status`, y nada más. Se cruza sobre la página cargada, y
   * `focusedDocumentNotice` dice exactamente eso — un filtro que aparenta ser
   * completo sobre una página de veinte es el modo de dar por cerrada una cuenta
   * que tiene cargos en la página siguiente.
   */
  const visibleCharges = computed(() => {
    const target = focusedDocumentId.value
    if (target == null) return chargeRows.value
    return chargeRows.value.filter((charge) => charge.billingDocumentId === target)
  })

  /**
   * Los documentos que se pintan. Con `documentScope === 'contract'` se cruza por
   * `subscriptionId` sobre la página cargada, por la misma carencia del contrato:
   * el endpoint devuelve los documentos de la <b>empresa</b> y no acepta filtro por
   * contrato.
   */
  const documentRows = computed(() => {
    if (documentScope.value === 'company') return documents.value.content
    const target = store.loadedSubscriptionId
    if (target == null) return documents.value.content
    return documents.value.content.filter((document) => document.subscriptionId === target)
  })

  const paymentRows = computed(() => payments.value.content)

  /** Los tres recuentos de lo devengado, sin fundirlos en un total único. */
  const accrued = computed(() => accruedTotals(visibleCharges.value))

  /** Lo efectivamente cobrado — solo confirmados — y cuánto queda fuera del recuento. */
  const collected = computed(() => collectedTotals(paymentRows.value))

  /**
   * La frase que impide que el filtro por documento se lea como completo. Se pinta
   * y se anuncia; no es una nota al pie.
   */
  const focusedDocumentNotice = computed(() => {
    if (focusedDocumentId.value == null) return ''
    return `Filtrado sobre los ${chargeRows.value.length} cargos de esta página: el contrato no permite pedirle al servidor los cargos de un documento concreto.`
  })

  /**
   * Lo mismo para los documentos: el recuento del contrato sale de una página de
   * la empresa, y decirlo es lo que evita cerrar una cuenta creyendo que se han
   * visto todos sus documentos.
   */
  const documentScopeNotice = computed(() => {
    const total = documents.value.totalElements
    const enPagina = documents.value.content.length
    const delContrato = documentRows.value.length
    if (documentScope.value === 'company') {
      return `${enPagina} de los ${total} documentos de la empresa, en esta página.`
    }
    return `${delContrato} de los ${enPagina} documentos de esta página son de este contrato. El servidor no filtra por contrato: los ${total} de la empresa se recorren por páginas.`
  })

  /**
   * Qué se anuncia en la región `role="status"` del bloque «Devengado» (§5.3).
   * Es un cambio de <b>consulta</b>, no de datos, y sin anuncio quien no ve la
   * tabla no se entera de que cambió lo que hay debajo.
   */
  const accruedAnnouncement = computed(() => {
    if (loadingCharges.value) return 'Cargando los cargos…'
    return accruedSummary(accrued.value, focusedDocumentNotice.value)
  })

  const collectedAnnouncement = computed(() => {
    if (loadingPayments.value) return 'Cargando los pagos…'
    return collectedSummary(collected.value)
  })

  async function loadCharges(companyId: number, subscriptionId: number, oneBasedPage = 1) {
    chargesRequest?.abort()
    const controller = new AbortController()
    chargesRequest = controller
    store.setLoadingCharges(true)
    store.setChargesError(null)
    try {
      const result = await subscriptionMoneyApi.listCharges(
        companyId,
        subscriptionId,
        chargeStatus.value,
        Math.max(oneBasedPage - 1, 0),
        charges.value.pageSize,
        controller.signal,
      )
      if (!controller.signal.aborted) store.setCharges(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // El mensaje sale del `ProblemDetail` y la traza del `X-Trace-Id`.
      // Escribirlo a mano dejaría a soporte sin forma de correlacionarlo.
      store.setChargesError(
        getProblemDetailMessage(err, 'No se pudieron cargar los cargos devengados'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (chargesRequest === controller) {
        store.setLoadingCharges(false)
        chargesRequest = null
      }
    }
  }

  async function loadDocuments(companyId: number, oneBasedPage = 1) {
    documentsRequest?.abort()
    const controller = new AbortController()
    documentsRequest = controller
    store.setLoadingDocuments(true)
    store.setDocumentsError(null)
    try {
      const result = await subscriptionMoneyApi.listDocumentsByCompany(
        companyId,
        Math.max(oneBasedPage - 1, 0),
        documents.value.pageSize,
        controller.signal,
      )
      if (!controller.signal.aborted) store.setDocuments(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setDocumentsError(
        getProblemDetailMessage(err, 'No se pudieron cargar las cuentas de cobro'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (documentsRequest === controller) {
        store.setLoadingDocuments(false)
        documentsRequest = null
      }
    }
  }

  async function loadPayments(companyId: number, oneBasedPage = 1) {
    paymentsRequest?.abort()
    const controller = new AbortController()
    paymentsRequest = controller
    store.setLoadingPayments(true)
    store.setPaymentsError(null)
    try {
      const result = await subscriptionMoneyApi.listPaymentsByCompany(
        companyId,
        Math.max(oneBasedPage - 1, 0),
        payments.value.pageSize,
        controller.signal,
      )
      if (!controller.signal.aborted) store.setPayments(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setPaymentsError(
        getProblemDetailMessage(err, 'No se pudieron cargar los pagos'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (paymentsRequest === controller) {
        store.setLoadingPayments(false)
        paymentsRequest = null
      }
    }
  }

  /**
   * Abre la sub-vista. <b>Recarga siempre</b> y tira lo de la empresa anterior
   * antes de pedir lo nuevo: en una pantalla desde la que se registra un pago,
   * dejar pintado el dinero de otra clínica bajo esta cabecera es el peor error
   * posible.
   *
   * <p>`focusedDocument` se limpia también cuando se reabre el mismo expediente:
   * la cadena que se estaba recorriendo es una consulta puntual, y volver a entrar
   * y encontrarse la tabla filtrada por un documento que ya no se recuerda haber
   * pulsado es peor que empezar de cero.
   */
  async function openMoney(companyId: number, subscriptionId: number) {
    const mismoExpediente =
      store.loadedCompanyId === companyId && store.loadedSubscriptionId === subscriptionId
    if (!mismoExpediente) store.reset()
    store.setFocusedDocumentId(null)
    store.setTarget(companyId, subscriptionId)
    await Promise.all([
      loadCharges(companyId, subscriptionId, 1),
      loadDocuments(companyId, 1),
      loadPayments(companyId, 1),
    ])
  }

  /** Cambiar el estado de los cargos SÍ vuelve al servidor: el filtro es suyo. */
  async function changeChargeStatus(
    companyId: number,
    subscriptionId: number,
    next: SubscriptionChargeStatus | null,
  ) {
    store.setChargeStatus(next)
    await loadCharges(companyId, subscriptionId, 1)
  }

  /** Cambiar el alcance de los documentos NO vuelve al servidor: el filtro es del cliente. */
  function changeDocumentScope(next: 'contract' | 'company') {
    store.setDocumentScope(next)
  }

  /** Recorre la cadena hacia abajo: de una cuenta de cobro a los cargos que la componen. */
  function focusDocument(documentId: number | null) {
    store.setFocusedDocumentId(documentId)
  }

  async function goToChargesPage(companyId: number, subscriptionId: number, oneBasedPage: number) {
    await loadCharges(companyId, subscriptionId, oneBasedPage)
  }

  async function goToDocumentsPage(companyId: number, oneBasedPage: number) {
    await loadDocuments(companyId, oneBasedPage)
  }

  async function goToPaymentsPage(companyId: number, oneBasedPage: number) {
    await loadPayments(companyId, oneBasedPage)
  }

  /**
   * <b>Registrar que entró la plata.</b> La única escritura de la pantalla.
   *
   * <p>Devuelve el pago que creó el servidor —no un `boolean`— porque el modal lo
   * pinta después como hecho consumado, con el estado y el identificador que puso
   * el servidor y no los que propuso el formulario (§3.2). `null` si no se
   * registró.
   *
   * <p><b>El conflicto tiene su propio mensaje y no es un fallo.</b> `gateway` +
   * `gatewayReference` son únicos juntos: si el servidor responde 409, el mismo
   * aviso de la pasarela llegó dos veces y el sistema hizo justo lo que tenía que
   * hacer. El título lo dice con las palabras que fija §4.5 —«Ese pago ya estaba
   * registrado»— en vez de con «violación de restricción única», que empuja a
   * reintentar con otra referencia y es cómo un mismo giro acaba contado dos
   * veces. Se usa `warnFrom` y no `warn` a secas para no tirar el `X-Trace-Id`.
   */
  async function registerPayment(
    companyId: number,
    subscriptionId: number,
    payload: RegisterSubscriptionPaymentRequest,
  ): Promise<SubscriptionPaymentResponse | null> {
    store.setSavingPayment(true)
    try {
      const created = await subscriptionMoneyApi.registerPayment(companyId, payload)
      // Recargar los tres: un pago recién registrado cambia lo cobrado, y puede
      // cambiar el saldo de los documentos en cuanto el backend lo aplique.
      await Promise.all([
        loadPayments(companyId, 1),
        loadDocuments(companyId, 1),
        loadCharges(companyId, subscriptionId, 1),
      ])
      success(
        'Pago registrado',
        'Queda pendiente hasta que se confirme; hasta entonces no cuenta como cobro.',
      )
      return created
    } catch (err: unknown) {
      if (isDuplicatePayment(err)) {
        warnFrom('Ese pago ya estaba registrado', err, DUPLICATE_PAYMENT_MESSAGE)
        return null
      }
      errorFrom('No se pudo registrar el pago', err)
      return null
    } finally {
      store.setSavingPayment(false)
    }
  }

  onUnmounted(() => {
    chargesRequest?.abort()
    documentsRequest?.abort()
    paymentsRequest?.abort()
  })

  return {
    chargeRows,
    visibleCharges,
    documentRows,
    paymentRows,
    accrued,
    collected,
    accruedAnnouncement,
    collectedAnnouncement,
    focusedDocumentId,
    focusedDocumentNotice,
    documentScopeNotice,
    chargeStatus,
    documentScope,
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
    chargesPage: computed(() => charges.value.page + 1),
    chargesPageSize: computed(() => charges.value.pageSize),
    chargesTotal: computed(() => charges.value.totalElements),
    chargesPageCount: computed(() => Math.max(charges.value.totalPages, 1)),
    documentsPage: computed(() => documents.value.page + 1),
    documentsPageSize: computed(() => documents.value.pageSize),
    documentsTotal: computed(() => documents.value.totalElements),
    documentsPageCount: computed(() => Math.max(documents.value.totalPages, 1)),
    paymentsPage: computed(() => payments.value.page + 1),
    paymentsPageSize: computed(() => payments.value.pageSize),
    paymentsTotal: computed(() => payments.value.totalElements),
    paymentsPageCount: computed(() => Math.max(payments.value.totalPages, 1)),
    openMoney,
    changeChargeStatus,
    changeDocumentScope,
    focusDocument,
    goToChargesPage,
    goToDocumentsPage,
    goToPaymentsPage,
    registerPayment,
    reloadCharges: loadCharges,
    reloadDocuments: loadDocuments,
    reloadPayments: loadPayments,
  }
}

/**
 * `true` si el servidor rechazó el alta porque ese pago ya existía.
 *
 * <p>Se mira el 409 y no un código de negocio concreto: la restricción es de base
 * de datos (`gateway` + `gatewayReference` únicos juntos) y el backend no publica
 * hoy un `code` propio para ella. Confundir este caso con un fallo genérico es lo
 * que lleva al operador a reintentar cambiando la referencia.
 */
function isDuplicatePayment(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409
}
