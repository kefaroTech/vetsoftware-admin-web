import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emptyPage, type PageResponse } from '@/types/pagination'
import type {
  CustomerCreditBalanceResponse,
  CustomerCreditEntryResponse,
} from '../types/customer-credit.types'
import type { SystemPaymentRefundResponse } from '../types/payment-refunds.types'
import type { SystemPaymentAttemptResponse } from '../types/payment-attempts.types'
import type { PaymentReversalRequestResponse } from '../types/payment-reversals.types'

/**
 * El estado de las <b>cuatro pestañas del circuito del dinero</b>: devoluciones,
 * intentos de cobro, reversiones y saldo a favor.
 *
 * <p><b>Por qué un store y no `ref()` dentro de cada composable.</b> Las cuatro son
 * cuatro RUTAS, igual que las cuatro de cobranza: cada una monta y desmonta su
 * vista. Con estado por instancia, ir de «Reversiones» a «Intentos» y volver
 * repintaría el esqueleto y perdería la página en la que estaba el operador a mitad
 * de una revisión. Es estado compartido entre pantallas, así que por la regla
 * obligatoria del proyecto vive en Pinia. <b>Aquí no hay ningún `ref()` a nivel de
 * módulo</b> — el patrón híbrido está prohibido.
 *
 * <p><b>Ocho listas y no cuatro.</b> Tres pestañas tienen dos: el feed completo y
 * la <b>lista de trabajo</b> —los reintentos vencidos, las reversiones que caducan,
 * los lotes por vencer—. No son un filtro del feed: son endpoints distintos con
 * corte por fecha en el servidor, y mezclarlas obligaría a filtrar en cliente una
 * página de 20 sobre 300, que diría «no hay nada urgente» sobre algo que sí lo
 * está.
 *
 * <p>Cada página se declara con su tipo concreto y no en un
 * `Record<Slice, PageResponse<unknown>>`: el contenido de las ocho es distinto y un
 * mapa genérico obligaría a castear en cada consumidor, que es donde se cuelan los
 * campos que el backend renombró.
 */
export type MoneyCircuitList =
  | 'refunds'
  | 'attempts'
  | 'attemptsDue'
  | 'reversals'
  | 'reversalsExpiring'
  | 'balances'
  | 'entries'
  | 'entriesExpiring'

/** Las tres listas que el SERVIDOR sabe filtrar por empresa. Las otras cinco, no. */
export type FilterableList = 'refunds' | 'attempts' | 'entries'

/** Cada escritura del circuito, para que su botón —y solo el suyo— diga «guardando». */
export type MoneyCircuitAction =
  | 'refund'
  | 'attempt'
  | 'reschedule'
  | 'openReversal'
  | 'acknowledge'
  | 'oppose'
  | 'resolve'
  | 'grant'
  | 'consume'
  | 'expire'

const LISTS: MoneyCircuitList[] = [
  'refunds',
  'attempts',
  'attemptsDue',
  'reversals',
  'reversalsExpiring',
  'balances',
  'entries',
  'entriesExpiring',
]

const ACTIONS: MoneyCircuitAction[] = [
  'refund',
  'attempt',
  'reschedule',
  'openReversal',
  'acknowledge',
  'oppose',
  'resolve',
  'grant',
  'consume',
  'expire',
]

function initialFlags(): Record<MoneyCircuitList, boolean> {
  return Object.fromEntries(LISTS.map((list) => [list, false])) as Record<MoneyCircuitList, boolean>
}

function initialMessages(): Record<MoneyCircuitList, string | null> {
  return Object.fromEntries(LISTS.map((list) => [list, null])) as Record<
    MoneyCircuitList,
    string | null
  >
}

function initialSaving(): Record<MoneyCircuitAction, boolean> {
  return Object.fromEntries(ACTIONS.map((action) => [action, false])) as Record<
    MoneyCircuitAction,
    boolean
  >
}

export const useMoneyCircuitStore = defineStore('money-circuit', () => {
  const refunds =
    ref<PageResponse<SystemPaymentRefundResponse>>(emptyPage<SystemPaymentRefundResponse>())
  const attempts =
    ref<PageResponse<SystemPaymentAttemptResponse>>(emptyPage<SystemPaymentAttemptResponse>())
  const attemptsDue =
    ref<PageResponse<SystemPaymentAttemptResponse>>(emptyPage<SystemPaymentAttemptResponse>())
  const reversals =
    ref<PageResponse<PaymentReversalRequestResponse>>(emptyPage<PaymentReversalRequestResponse>())
  const reversalsExpiring =
    ref<PageResponse<PaymentReversalRequestResponse>>(emptyPage<PaymentReversalRequestResponse>())
  const balances =
    ref<PageResponse<CustomerCreditBalanceResponse>>(emptyPage<CustomerCreditBalanceResponse>())
  const entries =
    ref<PageResponse<CustomerCreditEntryResponse>>(emptyPage<CustomerCreditEntryResponse>())
  const entriesExpiring =
    ref<PageResponse<CustomerCreditEntryResponse>>(emptyPage<CustomerCreditEntryResponse>())

  const loading = ref(initialFlags())
  const errors = ref(initialMessages())
  const errorTraceIds = ref(initialMessages())
  const saving = ref(initialSaving())

  /**
   * <b>Los lotes que tocó el último consumo o la última caducidad.</b>
   *
   * <p>No es un detalle de presentación. Consumir saldo salda por lotes empezando
   * por el que antes caduca, así que un consumo de 100.000 puede producir tres
   * movimientos; enseñar solo el importe pedido haría creer que se gastó un lote
   * cuando se gastaron tres, y el cliente descubriría en su siguiente cuenta que ya
   * no le queda el que creía. El servidor devuelve la lista y aquí se guarda para
   * poder enseñarla entera.
   */
  const lastLotMovements = ref<CustomerCreditEntryResponse[]>([])

  /** `null` = sin filtro. Las cinco listas que el servidor no filtra no aparecen aquí. */
  const companyFilter = ref<Record<FilterableList, number | null>>({
    refunds: null,
    attempts: null,
    entries: null,
  })

  function setRefunds(page: PageResponse<SystemPaymentRefundResponse>) {
    refunds.value = page
  }

  function setAttempts(page: PageResponse<SystemPaymentAttemptResponse>) {
    attempts.value = page
  }

  function setAttemptsDue(page: PageResponse<SystemPaymentAttemptResponse>) {
    attemptsDue.value = page
  }

  function setReversals(page: PageResponse<PaymentReversalRequestResponse>) {
    reversals.value = page
  }

  function setReversalsExpiring(page: PageResponse<PaymentReversalRequestResponse>) {
    reversalsExpiring.value = page
  }

  function setBalances(page: PageResponse<CustomerCreditBalanceResponse>) {
    balances.value = page
  }

  function setEntries(page: PageResponse<CustomerCreditEntryResponse>) {
    entries.value = page
  }

  function setEntriesExpiring(page: PageResponse<CustomerCreditEntryResponse>) {
    entriesExpiring.value = page
  }

  function setLoading(list: MoneyCircuitList, value: boolean) {
    loading.value[list] = value
  }

  function setError(list: MoneyCircuitList, message: string | null, traceId: string | null) {
    errors.value[list] = message
    errorTraceIds.value[list] = traceId
  }

  function setSaving(action: MoneyCircuitAction, value: boolean) {
    saving.value[action] = value
  }

  function setCompanyFilter(list: FilterableList, companyId: number | null) {
    companyFilter.value[list] = companyId
  }

  function setLastLotMovements(movements: CustomerCreditEntryResponse[]) {
    lastLotMovements.value = movements
  }

  return {
    refunds,
    attempts,
    attemptsDue,
    reversals,
    reversalsExpiring,
    balances,
    entries,
    entriesExpiring,
    loading,
    errors,
    errorTraceIds,
    saving,
    companyFilter,
    lastLotMovements,
    setRefunds,
    setAttempts,
    setAttemptsDue,
    setReversals,
    setReversalsExpiring,
    setBalances,
    setEntries,
    setEntriesExpiring,
    setLoading,
    setError,
    setSaving,
    setCompanyFilter,
    setLastLotMovements,
  }
})
