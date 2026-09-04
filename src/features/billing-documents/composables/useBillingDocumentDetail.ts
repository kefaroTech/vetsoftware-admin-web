import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import type { BillingDocumentResponse } from '@/features/billing-operations/types/billing-operations.types'
import { subscriptionMoneyApi } from '@/features/subscriptions-admin/api/subscription-money.api'
import { billingDocumentsApi } from '../api/billing-documents.api'
import { CHARGES_PAGE_SIZE, useBillingDocumentsStore } from '../stores/billing-documents.store'
import { TAX_TOLERANCE } from '../types/billing-documents.types'

/**
 * <b>El detalle de un documento de cobro</b>, y las tres comprobaciones que la
 * pantalla tiene que hacer para no mentir.
 *
 * <p>Las tres rodajas —documento, aplicaciones, renglones— se piden por separado
 * y fallan por separado: si las aplicaciones caen, el documento sigue siendo
 * legible y solo ese bloque dice que no pudo cargar. Teñir la pantalla entera de
 * error escondería datos que sí llegaron.
 *
 * <p>Todo el estado vive en el store de Pinia y se lee con `storeToRefs`. La
 * única `ref` de este módulo es el `AbortController` por instancia, dentro de la
 * función: no hay ningún singleton a nivel de módulo.
 */
export function useBillingDocumentDetail() {
  const store = useBillingDocumentsStore()
  const { document, documentKey, applications, charges, loading, errors, errorTraceIds } =
    storeToRefs(store)
  const { errorFrom, success } = useToast()
  let inflight: AbortController | null = null

  function fail(slice: 'document' | 'applications' | 'charges', error: unknown, fallback: string) {
    // El mensaje sale del `ProblemDetail` y el identificador de la traza con él.
    // Escribir el texto a mano en el `catch` tiraría el `X-Trace-Id` y soporte se
    // quedaría sin forma de correlacionar el fallo con el backend.
    store.setError(slice, getProblemDetailMessage(error, fallback), getTraceId(error) ?? null)
  }

  async function loadApplications(companyId: number, id: number, signal: AbortSignal) {
    store.setLoading('applications', true)
    try {
      store.setApplications(
        await billingDocumentsApi.listApplications(companyId, id, 0, 50, signal),
      )
    } catch (error: unknown) {
      if (axios.isCancel(error) || signal.aborted) return
      fail('applications', error, 'No se pudo cargar qué salda este documento')
    } finally {
      if (!signal.aborted) store.setLoading('applications', false)
    }
  }

  /**
   * Los renglones, por el único camino que el contrato deja abierto.
   *
   * <p>`GET /subscription-billing/charges` <b>no filtra por documento</b>: acepta
   * `subscriptionId` y `status`. Así que se piden los cargos del contrato y se
   * cruzan aquí por `billingDocumentId`. Ese cruce solo es honesto si se puede
   * demostrar que está completo, y de eso se encarga `chargeLines` más abajo.
   */
  async function loadCharges(companyId: number, subscriptionId: number, signal: AbortSignal) {
    store.setLoading('charges', true)
    try {
      store.setCharges(
        await subscriptionMoneyApi.listCharges(
          companyId,
          subscriptionId,
          null,
          0,
          CHARGES_PAGE_SIZE,
          signal,
        ),
      )
    } catch (error: unknown) {
      if (axios.isCancel(error) || signal.aborted) return
      fail('charges', error, 'No se pudieron cargar los cargos del contrato')
    } finally {
      if (!signal.aborted) store.setLoading('charges', false)
    }
  }

  /**
   * Recarga siempre, sin confiar en lo que hubiera cargado: es la regla del
   * proyecto al abrir una pantalla, y aquí además impide que el documento
   * anterior se quede pintado bajo la URL del nuevo.
   */
  async function load(companyId: number, id: number) {
    inflight?.abort()
    const controller = new AbortController()
    inflight = controller
    store.resetDetail(`${companyId}:${id}`)
    store.setLoading('document', true)

    try {
      const found = await billingDocumentsApi.findById(companyId, id, controller.signal)
      if (controller.signal.aborted) return
      store.setDocument(`${companyId}:${id}`, found)
      store.setLoading('document', false)
      // Las dos rodajas de abajo no dependen entre sí: van en paralelo.
      await Promise.all([
        loadApplications(companyId, id, controller.signal),
        loadCharges(companyId, found.subscriptionId, controller.signal),
      ])
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      fail('document', error, 'No se pudo cargar el documento')
      store.setLoading('document', false)
    }
  }

  /**
   * `DRAFT → AWAITING_EXTERNAL`. Recarga entera al terminar: la transición cambia
   * el estado y con él lo que la pantalla puede ofrecer.
   */
  async function submitForExternalIssue() {
    const current = document.value
    if (!current) return
    try {
      await billingDocumentsApi.submitForExternalIssue(current.companyId, current.id)
      success('El documento entró en la cola de emisión')
      await load(current.companyId, current.id)
    } catch (error: unknown) {
      errorFrom('No se pudo mandar a facturar', error)
    }
  }

  /** Tras registrar la referencia externa el documento es otro: se relee entero. */
  function applyRegistered(updated: BillingDocumentResponse) {
    void load(updated.companyId, updated.id)
  }

  onUnmounted(() => inflight?.abort())

  /**
   * <b>El impuesto propio contra el impuesto línea a línea.</b>
   *
   * <p>La plataforma calcula el impuesto una vez sobre la base agregada; el
   * emisor externo lo calcula por línea. Las dos formas son legítimas y difieren
   * en unos pesos. Por eso hay <b>tres</b> veredictos y no dos: cuadra, está
   * dentro de la tolerancia —y entonces el documento está <b>cerrado</b>, no en
   * mora— o discrepa de verdad.
   */
  const taxCheck = computed(() => {
    const doc = document.value
    if (!doc) return null
    const summed = (doc.taxes ?? []).reduce((total, tax) => total + tax.taxAmount, 0)
    const difference = Math.round((summed - doc.taxAmount) * 100) / 100
    const magnitude = Math.abs(difference)
    return {
      declared: doc.taxAmount,
      summed,
      difference,
      verdict:
        magnitude === 0 ? 'MATCHED' : magnitude <= TAX_TOLERANCE ? 'WITHIN_TOLERANCE' : 'MISMATCH',
    } as const
  })

  /**
   * <b>Total − aplicado = saldo</b>, con la aritmética a la vista y contrastada
   * contra lo que dice el servidor.
   *
   * <p>No se pinta el saldo como un número suelto: se pinta la resta. Y como el
   * contrato no declara el signo de una contra-aplicación, la suma de la columna
   * se <b>compara</b> con `settledAmount` en vez de sustituirlo. Cuando las dos
   * cuentas no coinciden, manda el servidor y la pantalla lo dice.
   */
  const settlement = computed(() => {
    const doc = document.value
    if (!doc) return null
    const rows = applications.value.content
    const summed = rows.reduce((total, row) => total + row.appliedAmount, 0)
    const arithmeticBalance = Math.round((doc.totalAmount - doc.settledAmount) * 100) / 100
    return {
      total: doc.totalAmount,
      settled: doc.settledAmount,
      balance: doc.balanceAmount,
      arithmeticBalance,
      /** ¿La resta del documento da su propio saldo? Si no, hay algo que contar. */
      balanceAgrees: Math.abs(arithmeticBalance - doc.balanceAmount) < 0.005,
      summedApplications: summed,
      /** Solo se puede afirmar si están todas las filas en pantalla. */
      applicationsComplete: rows.length >= applications.value.totalElements,
      applicationsAgree: Math.abs(summed - doc.settledAmount) < 0.005,
    }
  })

  /**
   * <b>Los renglones del documento, o la razón por la que no se pueden enseñar.</b>
   *
   * <p>El cruce en cliente solo vale si se puede demostrar completo, y hay dos
   * formas de que no lo esté: que el contrato tenga más cargos de los que caben en
   * una página, o que la suma de los renglones encontrados no dé el subtotal del
   * documento. En cualquiera de los dos casos la pantalla enseña el hueco y dice
   * cuál es — una lista de renglones a la que le faltan filas es peor que ninguna,
   * porque parece completa.
   */
  const chargeLines = computed(() => {
    const doc = document.value
    if (!doc) return null
    const page = charges.value
    const truncated = page.content.length < page.totalElements
    const rows = page.content.filter((charge) => charge.billingDocumentId === doc.id)
    const subtotal = rows.reduce((total, charge) => total + charge.subtotalAmount, 0)
    const matches = Math.abs(subtotal - doc.subtotalAmount) < 0.005
    return {
      rows,
      subtotal,
      documentSubtotal: doc.subtotalAmount,
      /** Se pidió una página y el contrato tenía más cargos de los que cabían. */
      truncated,
      /**
       * <b>La prueba de que el cruce está completo</b>, y por qué basta: si la
       * suma de los renglones encontrados da el subtotal del documento, están
       * todos — falte lo que falte de otras páginas, no era de este documento.
       * Cuando no da, `truncated` dice si la causa más probable es que se quedaron
       * cargos fuera de la página.
       */
      matches,
      complete: matches,
    }
  })

  return {
    document,
    documentKey,
    applications: computed(() => applications.value.content),
    applicationsTotal: computed(() => applications.value.totalElements),
    chargeLines,
    taxCheck,
    settlement,
    loading,
    errors,
    errorTraceIds,
    load,
    submitForExternalIssue,
    applyRegistered,
  }
}
