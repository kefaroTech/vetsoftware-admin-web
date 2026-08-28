/**
 * <b>Devoluciones de dinero.</b> Sacar plata de la plataforma y devolvérsela a una
 * empresa.
 *
 * <p><b>Sacar dinero exige firma.</b> Una devolución no es un movimiento contable
 * más: es una salida de caja, y el contrato lo dice en su propia forma — el cuerpo
 * pide importe, medio, cuenta destino, fecha de giro, fecha valor, motivo de lista
 * cerrada, motivo escrito <b>y autorizante</b>. Los ocho son obligatorios salvo la
 * referencia de destino. Por eso esta operación usa el modal de acción firmada
 * compartido y no un formulario cualquiera.
 */

/**
 * Por dónde sale la plata. `CUSTOMER_CREDIT` es el único que no sale de la cuenta:
 * devuelve al saldo a favor del cliente, no al banco.
 */
export type RefundMethod = 'CARD' | 'PSE' | 'BANK_TRANSFER' | 'CUSTOMER_CREDIT'

export const REFUND_METHODS: readonly RefundMethod[] = [
  'CARD',
  'PSE',
  'BANK_TRANSFER',
  'CUSTOMER_CREDIT',
] as const

export const REFUND_METHOD_LABEL: Record<RefundMethod, string> = {
  CARD: 'Reverso a la tarjeta',
  PSE: 'PSE',
  BANK_TRANSFER: 'Transferencia bancaria',
  CUSTOMER_CREDIT: 'Saldo a favor del cliente',
}

/**
 * Qué significa cada medio, donde se elige.
 *
 * <p>La diferencia que hay que ver antes de firmar: los tres primeros sacan plata
 * de la cuenta de la plataforma; el cuarto no saca nada — abre un lote de saldo a
 * favor que el cliente consumirá en su próxima cuenta de cobro, y que
 * <b>caduca</b>. Elegirlo creyendo que se le devuelve el dinero es la forma de que
 * un cliente que pidió su plata se quede con un crédito que se le vence.
 */
export const REFUND_METHOD_MEANING: Record<RefundMethod, string> = {
  CARD: 'Sale de la cuenta y vuelve a la tarjeta con la que se pagó.',
  PSE: 'Sale de la cuenta hacia la cuenta bancaria que indique el cliente.',
  BANK_TRANSFER: 'Sale de la cuenta por transferencia. Exige la cuenta destino.',
  CUSTOMER_CREDIT:
    'No sale plata: se abre saldo a favor, que se consume en la próxima cuenta y caduca.',
}

/** Por qué se devuelve. Lista cerrada: es lo que después se puede contar. */
export type RefundReasonCode =
  | 'WITHDRAWAL'
  | 'BILLING_ERROR'
  | 'CANCELLATION_CREDIT'
  | 'REVERSAL'
  | 'DUPLICATE_PAYMENT'
  | 'OTHER'

export const REFUND_REASON_CODES: readonly RefundReasonCode[] = [
  'WITHDRAWAL',
  'BILLING_ERROR',
  'CANCELLATION_CREDIT',
  'REVERSAL',
  'DUPLICATE_PAYMENT',
  'OTHER',
] as const

export const REFUND_REASON_LABEL: Record<RefundReasonCode, string> = {
  WITHDRAWAL: 'Retracto del cliente',
  BILLING_ERROR: 'Error de facturación nuestro',
  CANCELLATION_CREDIT: 'Crédito por cancelación',
  REVERSAL: 'Reversión de pago',
  DUPLICATE_PAYMENT: 'Pago duplicado',
  OTHER: 'Otro',
}

/**
 * Una devolución registrada, <b>tal como la ve la plataforma</b>. Es la que pinta
 * esta consola.
 *
 * <p>`reason` —el texto— es obligatorio, así que ninguna devolución puede quedar
 * sin explicación escrita.
 *
 * <p><b>El contrato publica dos respuestas para la misma devolución, y las dos son
 * deliberadas.</b> `PaymentRefundResponse` es la del cliente y no lleva
 * `authorizedBySystemUserId`; esta es la de plataforma y sí lo lleva, además como
 * campo <b>obligatorio</b>. No es una versión «ampliada» que alguien olvidó
 * unificar: el id del operador interno es un entero pequeño y enumerable, y
 * servirlo al tenant deja mapear la plantilla de VetSoftware y correlacionar qué
 * operador atiende a qué clínica. El recorte vive en el `record` —la frontera— y
 * no en el DTO, para que añadir el campo al lado del cliente sea una fuga visible
 * en el diff.
 *
 * <p>Esta pantalla usa esta, y no la del tenant, <b>porque es la consola de
 * superadministrador</b>: consume `GET`/`POST /system/payment-refunds`, que sirve
 * {@code SystemPaymentRefundController} bajo `hasRole('SYSTEM')` y devuelve
 * siempre este esquema. Tiparla con la del cliente era descartar en el navegador
 * un dato que el servidor ya manda, y dejar sin auditar la mitad de la firma de
 * una salida de caja.
 *
 * <p>Tampoco lleva `clientRequestId`: la llave de idempotencia es una barandilla
 * de quien escribe, no un dato del expediente.
 */
export interface SystemPaymentRefundResponse {
  id: number
  companyId: number
  paymentId: number
  /** El documento que se devuelve, cuando la devolución nace de uno. */
  sourceDocumentId: number | null
  amount: number
  method: RefundMethod
  /** La cuenta destino o la referencia del reverso. Vacía en un reverso a tarjeta. */
  destinationReference: string | null
  /** Cuándo se giró. */
  refundedAt: string
  /** La fecha con la que entra en la contabilidad. No tiene por qué ser la del giro. */
  valueDate: string
  reasonCode: RefundReasonCode
  reason: string
  /**
   * <b>Quién firmó la salida de caja</b>, como id interno del operador de
   * plataforma. Obligatorio: ninguna devolución existe sin autorizante.
   *
   * <p>Es un <b>identificador, no un nombre</b>. El contrato no publica ningún
   * dato legible de la persona junto a la devolución —`SystemUserResponse` y
   * `SystemUserSummary` solo exponen `id` y `code`, y ninguno viaja aquí—, así
   * que la columna «Autorizó» pinta el número. Sirve para auditar; no sirve para
   * leer de un vistazo quién firmó.
   */
  authorizedBySystemUserId: number
  createdDate: string
}

/**
 * La misma devolución, <b>tal como la ve el cliente</b>. Esta consola no la pinta:
 * se declara para que el contrato quede atado por los dos lados.
 *
 * <p><b>No lleva `authorizedBySystemUserId`, y esa ausencia es la regla, no un
 * defecto.</b> El bloque «Cobro y saldos» es <em>escribe plataforma, leen ambos</em>,
 * y una devolución es plata del cliente: la ve entera menos quién la autorizó. Ese
 * id es del personal interno de VetSoftware, y publicarlo a cualquier empleado con
 * permiso de lectura de cualquier clínica es lo que el recorte impide. Quien
 * necesita el dato es la tesorería, y lo recibe en `SystemPaymentRefundResponse`.
 *
 * <p>Tampoco lleva `clientRequestId`, por el mismo motivo que su hermana.
 */
export interface PaymentRefundResponse {
  id: number
  companyId: number
  paymentId: number
  /** El documento que se devuelve, cuando la devolución nace de uno. */
  sourceDocumentId: number | null
  amount: number
  method: RefundMethod
  /** La cuenta destino o la referencia del reverso. Vacía en un reverso a tarjeta. */
  destinationReference: string | null
  /** Cuándo se giró. */
  refundedAt: string
  /** La fecha con la que entra en la contabilidad. No tiene por qué ser la del giro. */
  valueDate: string
  reasonCode: RefundReasonCode
  reason: string
  createdDate: string
}

/** `POST /system/payment-refunds?companyId=…` */
export interface RegisterPaymentRefundRequest {
  paymentId: number
  sourceDocumentId: number | null
  amount: number
  method: RefundMethod
  destinationReference: string | null
  refundedAt: string
  valueDate: string
  reasonCode: RefundReasonCode
  reason: string
  authorizedBySystemUserId: number
  clientRequestId: string
}
