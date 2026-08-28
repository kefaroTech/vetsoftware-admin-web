import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emptyPage, type PageResponse } from '@/types/pagination'
import type { IssueStatus } from '@/features/billing-operations/types/billing-operations.types'
import type { BillingDocumentResponse } from '@/features/billing-operations/types/billing-operations.types'
import type { SubscriptionChargeResponse } from '@/features/subscriptions-admin/types/subscription-money.types'
import type { BillingDocumentApplicationResponse } from '../types/billing-documents.types'

/**
 * El estado de `/documentos` y de `/documentos/:companyId/:id`.
 *
 * <p><b>Por qué un store y no `ref()` dentro del composable.</b> Las dos
 * pantallas son dos rutas y el trabajo va y viene entre ellas: se abre un
 * documento desde la lista, se registra su factura externa y se vuelve. Con
 * estado por instancia, esa vuelta repintaría el esqueleto y perdería la pestaña
 * del circuito y la página en la que estaba el operador a mitad del cierre de
 * mes. Es estado compartido entre pantallas, así que por la regla obligatoria del
 * proyecto vive en Pinia. <b>Aquí no hay ningún `ref()` a nivel de módulo</b> —
 * el patrón híbrido está prohibido.
 *
 * <p>Las tres rodajas del detalle se declaran por separado y con su tipo concreto
 * porque son tres peticiones distintas que fallan por separado: el documento
 * puede cargar y sus aplicaciones no, y en ese caso la pantalla tiene que decir
 * exactamente qué falta en vez de teñir la vista entera de error.
 */

/** Las tres rodajas del detalle, cada una con su carga y su error propios. */
export type DocumentSlice = 'document' | 'applications' | 'charges'

/**
 * Cuántos cargos del contrato se piden de una vez para cruzarlos con el
 * documento.
 *
 * <p>Es el tope de página del backend. No se pagina más allá a propósito: si un
 * contrato tiene más cargos que esto, el cruce en cliente deja de ser completo y
 * la pantalla lo <b>dice</b> en vez de enseñar una lista de renglones a la que le
 * faltan filas. Ver `useBillingDocumentDetail`.
 */
export const CHARGES_PAGE_SIZE = 200

function initialFlags(): Record<DocumentSlice, boolean> {
  return { document: false, applications: false, charges: false }
}

function initialMessages(): Record<DocumentSlice, string | null> {
  return { document: null, applications: null, charges: null }
}

export const useBillingDocumentsStore = defineStore('billing-documents', () => {
  /**
   * La pestaña del circuito en la que está la lista. Sobrevive a abrir un
   * documento y volver, que es el único motivo por el que es estado y no una
   * variable local.
   */
  const tab = ref<IssueStatus>('AWAITING_EXTERNAL')

  const document = ref<BillingDocumentResponse | null>(null)

  /**
   * Qué documento hay cargado, como `empresa:id`.
   *
   * <p>Sin esta clave, navegar del documento 7 al 9 pintaría el 7 durante el
   * tiempo de la petición: los datos viejos con la URL nueva. En una pantalla de
   * dinero eso es enseñar la cartera de otra empresa con el número de esta.
   */
  const documentKey = ref<string | null>(null)

  const applications =
    ref<PageResponse<BillingDocumentApplicationResponse>>(
      emptyPage<BillingDocumentApplicationResponse>(),
    )

  const charges = ref<PageResponse<SubscriptionChargeResponse>>(
    emptyPage<SubscriptionChargeResponse>(CHARGES_PAGE_SIZE),
  )

  const loading = ref(initialFlags())
  const errors = ref(initialMessages())
  const errorTraceIds = ref(initialMessages())

  function setTab(value: IssueStatus) {
    tab.value = value
  }

  function setDocument(key: string, value: BillingDocumentResponse | null) {
    documentKey.value = key
    document.value = value
  }

  function setApplications(page: PageResponse<BillingDocumentApplicationResponse>) {
    applications.value = page
  }

  function setCharges(page: PageResponse<SubscriptionChargeResponse>) {
    charges.value = page
  }

  function setLoading(slice: DocumentSlice, value: boolean) {
    loading.value[slice] = value
  }

  function setError(slice: DocumentSlice, message: string | null, traceId: string | null) {
    errors.value[slice] = message
    errorTraceIds.value[slice] = traceId
  }

  /**
   * Deja el detalle en blanco antes de cargar otro documento.
   *
   * <p>La regla del proyecto es recargar siempre al abrir pantalla; esto es su
   * otra mitad: además de recargar, no enseñar lo anterior mientras tanto.
   */
  function resetDetail(key: string) {
    documentKey.value = key
    document.value = null
    applications.value = emptyPage<BillingDocumentApplicationResponse>()
    charges.value = emptyPage<SubscriptionChargeResponse>(CHARGES_PAGE_SIZE)
    errors.value = initialMessages()
    errorTraceIds.value = initialMessages()
  }

  return {
    tab,
    document,
    documentKey,
    applications,
    charges,
    loading,
    errors,
    errorTraceIds,
    setTab,
    setDocument,
    setApplications,
    setCharges,
    setLoading,
    setError,
    resetDetail,
  }
})
