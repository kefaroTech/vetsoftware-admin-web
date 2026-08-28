import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { documentMoneyApi } from '../api/document-money.api'
import { useDocumentMoneyStore } from '../stores/document-money.store'
import type { IssueCreditNoteRequest } from '../types/billing-documents.types'
import type {
  ApplyBillingDocumentRequest,
  RegisterDocumentWithholdingRequest,
} from '../types/document-money.types'

/**
 * <b>Las cuatro escrituras del dinero de un documento</b>, con su aviso y su
 * recarga.
 *
 * <p>Todo el estado vive en el store de Pinia y se lee con `storeToRefs`. No hay
 * ningún `ref()` a nivel de módulo: el patrón híbrido está prohibido.
 *
 * <p><b>Cada acción devuelve `boolean` y recarga la pantalla entera al terminar.</b>
 * No se parchea la fila en memoria a propósito: una aplicación cambia
 * `settledAmount` y `balanceAmount` del documento, y una nota crédito cambia además
 * el estado del circuito. Recalcular esos números en el cliente daría una cifra
 * plausible que ya no es la del servidor — y en una pantalla de cartera, una cifra
 * plausible y equivocada es peor que un segundo de espera.
 *
 * <p><b>Ningún `catch` escribe el texto del error a mano.</b> `errorFrom` saca el
 * mensaje del `ProblemDetail` y arrastra el `X-Trace-Id`; un literal lo tiraría y
 * soporte se quedaría sin forma de correlacionar el fallo con el backend.
 */
export function useDocumentMoneyActions(reload: () => Promise<void> | void) {
  const store = useDocumentMoneyStore()
  const { saving, reversingApplicationId, lastCreditNoteId } = storeToRefs(store)
  const { errorFrom, success } = useToast()

  /**
   * Registra una aplicación a mano.
   *
   * <p>`clientRequestId` lo trae el formulario, generado al abrirse: es la llave de
   * idempotencia y tiene que ser la misma en el reintento del mismo envío, no una
   * nueva por llamada.
   */
  async function apply(companyId: number, payload: ApplyBillingDocumentRequest): Promise<boolean> {
    store.setSaving('apply', true)
    try {
      await documentMoneyApi.apply(companyId, payload)
      success('Aplicación registrada')
      await reload()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo registrar la aplicación', error)
      return false
    } finally {
      store.setSaving('apply', false)
    }
  }

  /**
   * <b>Contra-aplica</b> una aplicación equivocada.
   *
   * <p>El aviso de éxito nombra lo que de verdad pasó —quedan tres filas, no
   * una— porque «Aplicación anulada» haría creer que la original desapareció, y
   * quien lo crea busca después una fila que sigue ahí y la contra-aplica otra vez.
   */
  async function reverseApplication(companyId: number, applicationId: number): Promise<boolean> {
    store.setReversing(applicationId)
    try {
      await documentMoneyApi.reverseApplication(companyId, applicationId)
      success(
        'Contra-aplicación registrada',
        `La aplicación #${applicationId} sigue en la tabla y ahora tiene debajo la fila que la anula.`,
      )
      await reload()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo contra-aplicar', error)
      return false
    } finally {
      store.setReversing(null)
    }
  }

  /** Registra una retención practicada por el cliente sobre este documento. */
  async function registerWithholding(
    companyId: number,
    payload: RegisterDocumentWithholdingRequest,
  ): Promise<boolean> {
    store.setSaving('withholding', true)
    try {
      await documentMoneyApi.registerWithholding(companyId, payload)
      success(
        'Retención registrada',
        'El saldo que queda ya no es una deuda del cliente: es plata que fue a la DIAN.',
      )
      await reload()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo registrar la retención', error)
      return false
    } finally {
      store.setSaving('withholding', false)
    }
  }

  /**
   * Emite la nota crédito que corrige a este documento.
   *
   * <p>Guarda el identificador del documento nuevo porque el contrato no publica la
   * vuelta de la cadena: sin esto, quien acaba de emitirla no tiene forma de
   * abrirla salvo buscándola en el listado de la empresa.
   */
  async function issueCreditNote(
    companyId: number,
    documentId: number,
    payload: IssueCreditNoteRequest,
  ): Promise<boolean> {
    store.setSaving('creditNote', true)
    try {
      const created = await documentMoneyApi.issueCreditNote(companyId, documentId, payload)
      store.setLastCreditNote(created.id)
      success(
        'Nota crédito emitida',
        'El documento original no se ha tocado: la corrección es el documento nuevo.',
      )
      await reload()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo emitir la nota crédito', error)
      return false
    } finally {
      store.setSaving('creditNote', false)
    }
  }

  return {
    saving,
    reversingApplicationId,
    lastCreditNoteId,
    resetActions: store.reset,
    apply,
    reverseApplication,
    registerWithholding,
    issueCreditNote,
  }
}
