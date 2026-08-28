import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { paymentReversalsApi } from '../api/payment-reversals.api'
import { useMoneyCircuitStore } from '../stores/money-circuit.store'
import { horizonInstant, useMoneyList } from './moneyCircuitList'
import {
  REVERSAL_URGENT_DAYS,
  type AcknowledgeReversalRequest,
  type OpenReversalRequest,
  type OpposeReversalRequest,
  type PaymentReversalRequestResponse,
  type ResolveReversalRequest,
} from '../types/payment-reversals.types'

/**
 * <b>Cuántos días por delante mira la lista de reversiones que vencen.</b>
 *
 * <p>Una semana, que es más que el umbral de urgencia (`REVERSAL_URGENT_DAYS`): la
 * lista tiene que enseñar lo que va a ser urgente <b>antes</b> de que lo sea, no
 * cuando ya no da tiempo a reunir la prueba de una oposición.
 */
export const REVERSAL_HORIZON_DAYS = 7

/**
 * <b>Reversiones de pago</b>: el expediente completo, la cola de vencimientos y las
 * cuatro escrituras del procedimiento.
 *
 * <p>El estado vive en el store de Pinia y se lee con `storeToRefs`; no hay ninguna
 * `ref()` a nivel de módulo.
 *
 * <p><b>Las cuatro escrituras son fases, no estados que se sobreescriben.</b> Abrir,
 * acusar recibo, oponerse y resolver dejan cada una su fecha y su prueba en el
 * expediente. Se recarga entero después de cada una porque el plazo, la fase y lo
 * que la pantalla puede ofrecer cambian a la vez.
 */
export function usePaymentReversals() {
  const store = useMoneyCircuitStore()
  const { reversals, reversalsExpiring, saving } = storeToRefs(store)
  const { errorFrom, success } = useToast()

  const feed = useMoneyList<PaymentReversalRequestResponse>(
    'reversals',
    reversals,
    store.setReversals,
    (page, pageSize, signal) => paymentReversalsApi.listAll(page, pageSize, null, signal),
    'No se pudieron cargar las reversiones',
  )

  const expiring = useMoneyList<PaymentReversalRequestResponse>(
    'reversalsExpiring',
    reversalsExpiring,
    store.setReversalsExpiring,
    (page, pageSize, signal) =>
      paymentReversalsApi.listExpiring(
        horizonInstant(REVERSAL_HORIZON_DAYS),
        page,
        pageSize,
        signal,
      ),
    'No se pudieron cargar las reversiones por vencer',
  )

  async function reloadAll() {
    await Promise.all([feed.reload(), expiring.reload()])
  }

  /**
   * Abre la solicitud.
   *
   * <p>El aviso recuerda cuál de las tres fechas manda: el reloj del consumidor
   * arranca cuando <b>él</b> tuvo conocimiento, no cuando nos llegó la queja. Tomar
   * la segunda por la primera regala días de plazo.
   */
  async function open(companyId: number, payload: OpenReversalRequest): Promise<boolean> {
    store.setSaving('openReversal', true)
    try {
      await paymentReversalsApi.open(companyId, payload)
      success(
        'Solicitud de reversión abierta',
        `Quedan menos de ${REVERSAL_URGENT_DAYS} días útiles para reunir la prueba si se va a oponer.`,
      )
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo abrir la solicitud', error)
      return false
    } finally {
      store.setSaving('openReversal', false)
    }
  }

  async function acknowledge(
    row: PaymentReversalRequestResponse,
    payload: AcknowledgeReversalRequest,
  ): Promise<boolean> {
    store.setSaving('acknowledge', true)
    try {
      await paymentReversalsApi.acknowledge(row.companyId, row.id, payload)
      success('Acuse registrado')
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo registrar el acuse', error)
      return false
    } finally {
      store.setSaving('acknowledge', false)
    }
  }

  async function oppose(
    row: PaymentReversalRequestResponse,
    payload: OpposeReversalRequest,
  ): Promise<boolean> {
    store.setSaving('oppose', true)
    try {
      await paymentReversalsApi.oppose(row.companyId, row.id, payload)
      success('Oposición registrada', 'Queda su motivo tasado y la referencia de la prueba.')
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo registrar la oposición', error)
      return false
    } finally {
      store.setSaving('oppose', false)
    }
  }

  async function resolve(
    row: PaymentReversalRequestResponse,
    payload: ResolveReversalRequest,
  ): Promise<boolean> {
    store.setSaving('resolve', true)
    try {
      await paymentReversalsApi.resolve(row.companyId, row.id, payload)
      success(
        'Solicitud resuelta',
        'El expediente queda cerrado y entero: no se borra ninguna fase.',
      )
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo resolver la solicitud', error)
      return false
    } finally {
      store.setSaving('resolve', false)
    }
  }

  return {
    feed,
    expiring,
    savingOpen: computed(() => saving.value.openReversal),
    savingAcknowledge: computed(() => saving.value.acknowledge),
    savingOppose: computed(() => saving.value.oppose),
    savingResolve: computed(() => saving.value.resolve),
    reloadAll,
    open,
    acknowledge,
    oppose,
    resolve,
  }
}
