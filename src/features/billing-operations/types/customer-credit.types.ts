/**
 * <b>Saldo a favor</b> — plata del cliente que todavía no se ha aplicado a nada.
 *
 * <p><b>No es un número: es una pila de lotes.</b> Cada concesión abre un lote con
 * su propia fecha de caducidad, y consumir salda <b>empezando por el que antes
 * caduca</b>. Por eso `POST /system/customer-credit/consumptions` devuelve una
 * <b>lista</b> de movimientos y no uno: un consumo de 100.000 puede tocar tres
 * lotes. Pintar el saldo como una cifra suelta esconde justo el dato que decide si
 * el cliente va a perder dinero este mes.
 *
 * <p><b>Y caduca.</b> Un lote que vence sin consumirse se pierde, y el cliente se
 * entera cuando ya no está. Un lote por vencer tiene que verse <b>antes</b> de
 * vencer: eso es lo que hace la lista de `GET /system/customer-credit/expiring`.
 */

/** Qué hizo el movimiento con la pila de lotes. */
export type CreditEntryKind = 'GRANT' | 'CONSUMPTION' | 'EXPIRATION' | 'VOID' | 'CORRECTION'

export const CREDIT_ENTRY_LABEL: Record<CreditEntryKind, string> = {
  GRANT: 'Concesión',
  CONSUMPTION: 'Consumo',
  EXPIRATION: 'Caducidad',
  VOID: 'Anulación',
  CORRECTION: 'Corrección',
}

/**
 * Qué significa cada movimiento para el cliente. La caducidad es la única que le
 * quita plata sin que nadie decida nada, y por eso se nombra así.
 */
export const CREDIT_ENTRY_MEANING: Record<CreditEntryKind, string> = {
  GRANT: 'Se abrió un lote de saldo a favor.',
  CONSUMPTION: 'Se aplicó saldo a una cuenta de cobro.',
  EXPIRATION: 'Un lote venció sin usarse. El cliente perdió ese saldo.',
  VOID: 'Se anuló un movimiento anterior. Los dos quedan.',
  CORRECTION: 'Se ajustó el saldo. Deja rastro, no reescribe.',
}

export const CREDIT_ENTRY_VARIANT: Record<
  CreditEntryKind,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  GRANT: 'success',
  CONSUMPTION: 'neutral',
  EXPIRATION: 'danger',
  VOID: 'warning',
  CORRECTION: 'warning',
}

/** De dónde salió el saldo. Es la lista cerrada que firma una concesión. */
export type CreditOriginKind =
  'OVERPAYMENT' | 'CREDIT_NOTE' | 'CANCELLATION' | 'APPLICATION' | 'EXPIRY' | 'ROUNDING' | 'MANUAL'

export const CREDIT_ORIGIN_KINDS: readonly CreditOriginKind[] = [
  'OVERPAYMENT',
  'CREDIT_NOTE',
  'CANCELLATION',
  'APPLICATION',
  'EXPIRY',
  'ROUNDING',
  'MANUAL',
] as const

export const CREDIT_ORIGIN_LABEL: Record<CreditOriginKind, string> = {
  OVERPAYMENT: 'Pagó de más',
  CREDIT_NOTE: 'Nota crédito',
  CANCELLATION: 'Cancelación de contrato',
  APPLICATION: 'Aplicación a un documento',
  EXPIRY: 'Caducidad de otro lote',
  ROUNDING: 'Residuo de redondeo',
  MANUAL: 'Concesión manual',
}

/**
 * El saldo consolidado de una empresa.
 *
 * <p>`nextExpiryOn` es el campo que hace útil esta tabla: sin él, un saldo de
 * 400.000 y otro de 400.000 se leen igual aunque uno caduque el mes que viene.
 * Vacío significa que ningún lote tiene fecha, no que no caduque nunca.
 */
export interface CustomerCreditBalanceResponse {
  id: number
  companyId: number
  balanceAmount: number
  /** Cuándo caduca el primer lote. Es lo que ordena la lista de trabajo. */
  nextExpiryOn: string | null
  recalculatedAt: string
  version: number | null
}

/**
 * Un movimiento de la pila de lotes.
 *
 * <p>`lotEntryId` es a qué lote pertenece el movimiento: en un `GRANT` es él mismo,
 * y en un `CONSUMPTION` es el lote del que se sacó. Es lo que permite leer un
 * consumo de tres líneas como un solo consumo repartido y no como tres consumos.
 */
export interface CustomerCreditEntryResponse {
  id: number
  companyId: number
  entryKind: CreditEntryKind
  amount: number
  /** El lote al que pertenece el movimiento. En una concesión, él mismo. */
  lotEntryId: number | null
  originKind: CreditOriginKind
  originPaymentId: number | null
  originDocumentId: number | null
  originSubscriptionId: number | null
  occurredAt: string
  valueDate: string
  /** Cuándo caduca este lote. Vacío = sin fecha de caducidad. */
  expiresOn: string | null
  createdDate: string
}

/** `POST /system/customer-credit/grants?companyId=…` */
export interface GrantCustomerCreditRequest {
  amount: number
  originKind: CreditOriginKind
  originPaymentId: number | null
  originDocumentId: number | null
  originSubscriptionId: number | null
  /** Cuándo caduca el lote. Vacío abre un lote sin caducidad. */
  expiresOn: string | null
  clientRequestId: string
}

/**
 * `POST /system/customer-credit/consumptions?companyId=…`
 *
 * <p>No se elige el lote: lo elige el servidor, y empieza por el que antes caduca.
 * Por eso este cuerpo no tiene `lotEntryId` — dejar elegir permitiría gastar el
 * lote de diciembre y perder el de septiembre.
 */
export interface ConsumeCustomerCreditRequest {
  amount: number
  originDocumentId: number
  clientRequestId: string
}

/**
 * A cuántos días de su caducidad un lote pasa a ser urgente.
 *
 * <p>Treinta días es un ciclo de facturación entero: un lote que caduca dentro de
 * menos que eso ya no tiene una cuenta de cobro por delante donde consumirse. El
 * umbral se pinta escrito, no se esconde en un color, porque el operador tiene que
 * poder discutirlo con el cliente al teléfono.
 */
export const CREDIT_EXPIRY_WARNING_DAYS = 30
