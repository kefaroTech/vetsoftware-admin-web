import { endOfDayInstant, PENDING_STALE_HOURS, startOfDayInstant } from './billingFormat'
import type {
  PaymentsFilterState,
  SubscriptionPaymentsQuery,
} from '../types/billing-operations.types'

export function defaultPaymentsFilter(): PaymentsFilterState {
  return { status: null, receivedFrom: null, receivedTo: null, agingOnly: false }
}

/**
 * Traduce el filtro de pantalla al `SubscriptionPaymentsQuery` del contrato.
 * «Solo pendientes con más de 1 hora» manda sobre el estado elegido a
 * mano: son la misma pregunta —¿qué pago quedó `PENDING` y el webhook nunca
 * llegó?— y dejar los dos activos a la vez no tiene una lectura que las
 * combine.
 */
export function buildPaymentsQuery(
  companyId: number | null,
  filter: PaymentsFilterState,
): SubscriptionPaymentsQuery {
  const query: SubscriptionPaymentsQuery = {}
  if (companyId !== null) query.companyId = companyId
  if (filter.agingOnly) {
    query.status = 'PENDING'
    query.pendingOlderThanMinutes = PENDING_STALE_HOURS * 60
  } else if (filter.status) {
    query.status = filter.status
  }
  if (filter.receivedFrom) query.receivedFrom = startOfDayInstant(filter.receivedFrom)
  if (filter.receivedTo) query.receivedTo = endOfDayInstant(filter.receivedTo)
  return query
}
