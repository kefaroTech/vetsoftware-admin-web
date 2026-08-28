import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { paymentRefundsApi } from '../api/payment-refunds.api'
import { useMoneyCircuitStore } from '../stores/money-circuit.store'
import { useMoneyList } from './moneyCircuitList'
import type {
  RegisterPaymentRefundRequest,
  SystemPaymentRefundResponse,
} from '../types/payment-refunds.types'

/**
 * <b>Devoluciones de dinero</b>: el feed global y su alta firmada.
 *
 * <p>El estado vive en el store de Pinia y se lee con `storeToRefs`; no hay ninguna
 * `ref()` a nivel de módulo.
 *
 * <p><b>Registrar una devolución recarga la lista entera</b> y no inserta la fila en
 * memoria: el servidor decide el identificador, la fecha de creación y —cuando el
 * medio es saldo a favor— el lote que abre. Insertar a mano una fila fabricada
 * enseñaría un movimiento de caja que no coincide con el que quedó registrado.
 *
 * <p>El mensaje de error sale del `ProblemDetail` con su `X-Trace-Id`: ningún
 * `catch` escribe el texto a mano.
 */
export function usePaymentRefunds() {
  const store = useMoneyCircuitStore()
  const { refunds, companyFilter, saving } = storeToRefs(store)
  const { errorFrom, success } = useToast()

  const list = useMoneyList<SystemPaymentRefundResponse>(
    'refunds',
    refunds,
    store.setRefunds,
    (page, pageSize, signal) =>
      paymentRefundsApi.listAll(page, pageSize, companyFilter.value.refunds, signal),
    'No se pudieron cargar las devoluciones',
  )

  /**
   * Registra la devolución.
   *
   * <p>El aviso nombra lo que de verdad pasó según el medio: con
   * `CUSTOMER_CREDIT` <b>no sale plata</b> — se abre un lote de saldo a favor que
   * caduca—, y decir «devolución registrada» a secas dejaría creer al operador que
   * el cliente ya tiene su dinero en el banco.
   */
  async function register(
    companyId: number,
    payload: RegisterPaymentRefundRequest,
  ): Promise<boolean> {
    store.setSaving('refund', true)
    try {
      await paymentRefundsApi.register(companyId, payload)
      success(
        'Devolución registrada',
        payload.method === 'CUSTOMER_CREDIT'
          ? 'No salió plata de la cuenta: se abrió saldo a favor del cliente, y ese saldo caduca.'
          : 'Queda registrada la salida de caja con su autorizante.',
      )
      await list.reload()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo registrar la devolución', error)
      return false
    } finally {
      store.setSaving('refund', false)
    }
  }

  return {
    ...list,
    saving: computed(() => saving.value.refund),
    companyId: computed(() => companyFilter.value.refunds),
    applyCompanyFilter(companyId: number | null) {
      store.setCompanyFilter('refunds', companyId)
      return list.reload()
    },
    register,
  }
}
