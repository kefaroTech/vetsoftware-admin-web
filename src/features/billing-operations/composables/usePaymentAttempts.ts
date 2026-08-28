import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { paymentAttemptsApi } from '../api/payment-attempts.api'
import { useMoneyCircuitStore } from '../stores/money-circuit.store'
import { horizonInstant, useMoneyList } from './moneyCircuitList'
import {
  DECLINE_KIND_PRESENTATION,
  type RecordPaymentAttemptRequest,
  type SystemPaymentAttemptResponse,
} from '../types/payment-attempts.types'

/**
 * <b>Cuántos días por delante mira la lista de trabajo de reintentos.</b>
 *
 * <p>Una semana: es lo que cabe entre dos revisiones de cobranza. Se pinta escrito
 * en la pantalla —«programados para los próximos 7 días»— porque una lista con un
 * corte invisible se lee como «esto es todo», y no lo es.
 */
export const ATTEMPT_DUE_HORIZON_DAYS = 7

/**
 * <b>Intentos de cobro</b>: el feed completo, la lista de reintentos próximos, y las
 * dos escrituras.
 *
 * <p>El estado vive en el store de Pinia y se lee con `storeToRefs`; no hay ninguna
 * `ref()` a nivel de módulo.
 *
 * <p><b>La regla dura de esta pantalla vive aquí y no solo en el marcado.</b> Un
 * rechazo duro <b>no se reprograma nunca</b>: las redes penalizan el reintento
 * excesivo, y quien insiste paga por cada intento y arriesga su cuenta de comercio.
 * El botón no existe en la tabla, y además `reschedule` se niega — que un camino se
 * cierre solo en la vista es que se abrirá el día que alguien añada otra vista.
 */
export function usePaymentAttempts() {
  const store = useMoneyCircuitStore()
  const { attempts, attemptsDue, companyFilter, saving } = storeToRefs(store)
  const { errorFrom, success, warn } = useToast()

  const feed = useMoneyList<SystemPaymentAttemptResponse>(
    'attempts',
    attempts,
    store.setAttempts,
    (page, pageSize, signal) =>
      paymentAttemptsApi.listAll(page, pageSize, companyFilter.value.attempts, signal),
    'No se pudieron cargar los intentos de cobro',
  )

  const due = useMoneyList<SystemPaymentAttemptResponse>(
    'attemptsDue',
    attemptsDue,
    store.setAttemptsDue,
    (page, pageSize, signal) =>
      paymentAttemptsApi.listDue(horizonInstant(ATTEMPT_DUE_HORIZON_DAYS), page, pageSize, signal),
    'No se pudieron cargar los reintentos programados',
  )

  /** Recarga las dos listas: una escritura cambia el feed y puede entrar o salir de la cola. */
  async function reloadAll() {
    await Promise.all([feed.reload(), due.reload()])
  }

  async function record(companyId: number, payload: RecordPaymentAttemptRequest): Promise<boolean> {
    store.setSaving('attempt', true)
    try {
      await paymentAttemptsApi.record(companyId, payload)
      success('Intento registrado', DECLINE_KIND_PRESENTATION[payload.declineKind].nextStep)
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo registrar el intento', error)
      return false
    } finally {
      store.setSaving('attempt', false)
    }
  }

  /**
   * Mueve el próximo reintento.
   *
   * <p>Sobre un rechazo duro se niega en el cliente y se dice por qué, sin llegar al
   * servidor: el daño de reintentar un rechazo duro es económico y con la red, no un
   * 409 que se pueda deshacer.
   */
  async function reschedule(
    attempt: SystemPaymentAttemptResponse,
    nextAttemptAt: string,
  ): Promise<boolean> {
    if (!DECLINE_KIND_PRESENTATION[attempt.declineKind].retryable) {
      warn(
        'Un rechazo duro no se reintenta',
        'El emisor prohíbe el cobro y las redes penalizan el reintento. Hay que pedirle otro medio de pago al cliente.',
      )
      return false
    }

    store.setSaving('reschedule', true)
    try {
      await paymentAttemptsApi.reschedule(attempt.companyId, attempt.id, { nextAttemptAt })
      success('Reintento reprogramado', 'No se cobra ahora: solo cambia cuándo se intentará.')
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo reprogramar el reintento', error)
      return false
    } finally {
      store.setSaving('reschedule', false)
    }
  }

  return {
    feed,
    due,
    savingAttempt: computed(() => saving.value.attempt),
    savingReschedule: computed(() => saving.value.reschedule),
    companyId: computed(() => companyFilter.value.attempts),
    applyCompanyFilter(companyId: number | null) {
      store.setCompanyFilter('attempts', companyId)
      return feed.reload()
    },
    reloadAll,
    record,
    reschedule,
  }
}
