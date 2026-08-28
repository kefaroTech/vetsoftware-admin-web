/**
 * <b>Reversión de pago</b> — la figura del Estatuto del Consumidor colombiano
 * (Ley 1480 de 2011, art. 51 y su reglamentación).
 *
 * <p>No es «devolver la plata». Es un procedimiento con causales tasadas, con
 * plazos que corren solos y con una oposición posible del comercio. Modelarlo como
 * un botón de devolución pierde exactamente lo que hace falta el día que el caso
 * llega a la Superintendencia: por qué se pidió, cuándo empezó a correr el reloj y
 * qué se contestó.
 */

/** De dónde viene la solicitud: la pide el consumidor o la impone la pasarela. */
export type ReversalOrigin = 'CONSUMER_CLAIM' | 'GATEWAY_CHARGEBACK'

export const REVERSAL_ORIGIN_LABEL: Record<ReversalOrigin, string> = {
  CONSUMER_CLAIM: 'Reclamación del consumidor',
  GATEWAY_CHARGEBACK: 'Contracargo de la pasarela',
}

/**
 * <b>Las cinco causales tasadas, y no hay una sexta.</b>
 *
 * <p>La ley las enumera y la lista es cerrada: una reversión que no encaja en una
 * de estas cinco no procede. Por eso el campo es un desplegable cerrado y no un
 * texto libre — con texto libre, dentro de dos ejercicios nadie puede contar
 * cuántas reversiones fueron por fraude y cuántas por producto no recibido, que es
 * justo la cuenta que pide el regulador.
 */
export type ReversalCausal =
  'FRAUD' | 'UNSOLICITED_OPERATION' | 'PRODUCT_NOT_RECEIVED' | 'NOT_AS_ORDERED' | 'DEFECTIVE'

export const REVERSAL_CAUSALS: readonly ReversalCausal[] = [
  'FRAUD',
  'UNSOLICITED_OPERATION',
  'PRODUCT_NOT_RECEIVED',
  'NOT_AS_ORDERED',
  'DEFECTIVE',
] as const

export const REVERSAL_CAUSAL_LABEL: Record<ReversalCausal, string> = {
  FRAUD: 'Fraude',
  UNSOLICITED_OPERATION: 'Operación no solicitada',
  PRODUCT_NOT_RECEIVED: 'El producto no se recibió',
  NOT_AS_ORDERED: 'No es lo que se pidió',
  DEFECTIVE: 'Producto defectuoso o incompleto',
}

/**
 * <b>Quién pide la reversión decide si la figura aplica.</b> La reversión del pago
 * protege al <i>consumidor</i>; una empresa que compra software para operar su
 * clínica normalmente no lo es. Marcarlo `UNDETERMINED` no es un descuido: es el
 * estado honesto mientras alguien no lo decida, y verlo escrito evita que se
 * resuelva por costumbre.
 */
export type ConsumerDetermination = 'CONSUMER' | 'NOT_CONSUMER' | 'UNDETERMINED'

export const CONSUMER_DETERMINATION_LABEL: Record<ConsumerDetermination, string> = {
  CONSUMER: 'Es consumidor',
  NOT_CONSUMER: 'No es consumidor',
  UNDETERMINED: 'Sin determinar',
}

export const CONSUMER_DETERMINATION_MEANING: Record<ConsumerDetermination, string> = {
  CONSUMER: 'La figura aplica y los plazos corren.',
  NOT_CONSUMER: 'La figura no aplica: lo que proceda es una devolución ordinaria.',
  UNDETERMINED: 'Todavía no se ha decidido. Los plazos corren igual mientras tanto.',
}

/** Los tres motivos por los que el comercio se puede oponer. También es lista cerrada. */
export type OppositionGround =
  'OPERATION_DID_NOT_EXIST' | 'INSUFFICIENT_FUNDS' | 'CAUSAL_NOT_REPORTED'

export const OPPOSITION_GROUNDS: readonly OppositionGround[] = [
  'OPERATION_DID_NOT_EXIST',
  'INSUFFICIENT_FUNDS',
  'CAUSAL_NOT_REPORTED',
] as const

export const OPPOSITION_GROUND_LABEL: Record<OppositionGround, string> = {
  OPERATION_DID_NOT_EXIST: 'La operación nunca existió',
  INSUFFICIENT_FUNDS: 'No hay saldo suficiente para revertir',
  CAUSAL_NOT_REPORTED: 'La causal no se reportó en plazo',
}

/** En qué acaba la solicitud. Cuatro salidas, todas definitivas. */
export type ReversalOutcome = 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED' | 'WITHDRAWN'

export const REVERSAL_OUTCOMES: readonly ReversalOutcome[] = [
  'ACCEPTED',
  'PARTIALLY_ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
] as const

export const REVERSAL_OUTCOME_LABEL: Record<ReversalOutcome, string> = {
  ACCEPTED: 'Aceptada',
  PARTIALLY_ACCEPTED: 'Aceptada en parte',
  REJECTED: 'Rechazada',
  WITHDRAWN: 'Retirada por el consumidor',
}

export const REVERSAL_OUTCOME_VARIANT: Record<
  ReversalOutcome,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  ACCEPTED: 'success',
  PARTIALLY_ACCEPTED: 'warning',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
}

/**
 * <b>Una solicitud de reversión, con sus tres fechas.</b>
 *
 * <p><b>Las tres fechas no son la misma fecha repetida</b>, y confundirlas es el
 * error caro de esta pantalla:
 *
 * <ul>
 *   <li>`consumerBecameAwareAt` — <b>cuándo tuvo conocimiento el consumidor</b>. Es
 *       la que arranca su reloj legal.</li>
 *   <li>`claimReceivedAt` — cuándo nos llegó la queja. Puede ser días después.</li>
 *   <li>`issuerNotifiedAt` — cuándo se notificó al emisor. Es la que abre el plazo
 *       del banco.</li>
 * </ul>
 *
 * <p>Tomar la segunda por la primera regala días de plazo y es lo que hace perder
 * una reversión que se podía haber contestado a tiempo.
 */
export interface PaymentReversalRequestResponse {
  id: number
  companyId: number
  paymentId: number
  origin: ReversalOrigin
  causal: ReversalCausal | null
  consumerDetermination: ConsumerDetermination
  /** Cuándo tuvo conocimiento el consumidor. Aquí arranca su reloj, no en la queja. */
  consumerBecameAwareAt: string | null
  claimReceivedAt: string
  issuerNotifiedAt: string | null
  claimEvidenceRef: string | null
  acknowledgementRef: string | null
  acknowledgedAt: string | null
  oppositionGround: OppositionGround | null
  oppositionEvidenceRef: string | null
  opposedAt: string | null
  /** Hasta cuándo hay para contestar. Es lo que ordena la lista de trabajo. */
  deadlineAt: string
  appliedAmount: number | null
  outcome: ReversalOutcome | null
  /** La devolución que salió de aceptar la reversión, si la hubo. */
  resultingRefundId: number | null
  createdDate: string
  version: number | null
}

/** `POST /system/payment-reversal-requests?companyId=…` */
export interface OpenReversalRequest {
  paymentId: number
  origin: ReversalOrigin
  causal: ReversalCausal | null
  consumerDetermination: ConsumerDetermination
  consumerBecameAwareAt: string | null
  claimReceivedAt: string
  issuerNotifiedAt: string | null
  claimEvidenceRef: string | null
  deadlineAt: string
}

/** `PATCH …/{id}/acknowledgement` — dejar constancia de que se acusó recibo. */
export interface AcknowledgeReversalRequest {
  acknowledgementRef: string
}

/** `PATCH …/{id}/opposition` — oponerse, con una de las tres causales y su prueba. */
export interface OpposeReversalRequest {
  ground: OppositionGround
  oppositionEvidenceRef: string
}

/** `PATCH …/{id}/outcome` — cerrar la solicitud. */
export interface ResolveReversalRequest {
  outcome: ReversalOutcome
  /** Cuánto se revirtió de verdad. Obligatorio de hecho cuando se acepta en parte. */
  appliedAmount: number | null
  resultingRefundId: number | null
}

/**
 * A cuántos días de su plazo una solicitud pasa a ser urgente.
 *
 * <p>Tres días es lo que tarda en reunirse la prueba de una oposición. Una
 * solicitud que entra en esa franja sin contestar ya no se contesta a tiempo, así
 * que el umbral se pinta escrito —«vence en menos de 3 días»— y no se esconde en un
 * color.
 */
export const REVERSAL_URGENT_DAYS = 3
