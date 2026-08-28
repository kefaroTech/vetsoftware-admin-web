/**
 * <b>Intentos de cobro y su reintento.</b>
 *
 * <p>El dato que gobierna toda esta pantalla es <b>uno solo</b>: `declineKind`. De
 * él dependen si se puede reintentar, si el intento cuenta contra el cliente y si
 * arranca la cobranza. Tratar los tres rechazos igual —«falló, reintenta»— produce
 * los tres daños a la vez: multa de la red, cliente perseguido por un error
 * nuestro, y cuenta restringida sin causa.
 */

/**
 * Las <b>tres familias de rechazo</b>. No son grados de gravedad: son tres cosas
 * distintas con tres respuestas distintas.
 */
export type DeclineKind = 'SOFT' | 'HARD' | 'CONFIGURATION'

export const DECLINE_KINDS: readonly DeclineKind[] = ['SOFT', 'HARD', 'CONFIGURATION'] as const

/**
 * <b>Cuántas veces se reintenta un rechazo blando y en cuánto tiempo.</b>
 *
 * <p>Cuatro intentos en catorce días. No es una cifra de diseño: es el techo que
 * separa reintentar de hostigar a la red emisora, y las redes cobran por pasarse.
 * Va escrito en la pantalla, al lado del contador, porque un umbral que no se ve es
 * un umbral que nadie puede discutir.
 */
export const SOFT_MAX_ATTEMPTS = 4
export const SOFT_WINDOW_DAYS = 14

export interface DeclineKindPresentation {
  label: string
  /** Qué pasó de verdad. Es lo que decide qué hacer, no una glosa del rótulo. */
  meaning: string
  /** <b>Si se puede reintentar.</b> Gobierna la existencia del botón, no su color. */
  retryable: boolean
  /** Si el intento cuenta contra el cliente en la ventana de reintentos. */
  consumesCustomerAttempts: boolean
  /** Si el rechazo arranca cobranza contra el cliente. */
  startsDunning: boolean
  /** Qué hacer a continuación. Sin esto la pantalla clasifica y no ayuda. */
  nextStep: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
}

/**
 * <b>Las tres familias, con lo que cada una permite y lo que cada una prohíbe.</b>
 *
 * <ul>
 *   <li><b>Blando</b>: falta de fondos, límite diario, un «inténtalo más tarde».
 *       La tarjeta está bien y el cobro puede salir mañana. Se reintenta, con
 *       techo.</li>
 *   <li><b>Duro</b>: tarjeta robada, cuenta cerrada, cobro prohibido por el emisor.
 *       <b>No se reintenta jamás.</b> No es prudencia: las redes penalizan el
 *       reintento sobre un rechazo duro, y quien insiste acaba pagando por cada
 *       intento y arriesgando su cuenta de comercio. Ofrecer «reintentar» aquí es
 *       ofrecer algo que daña.</li>
 *   <li><b>Error propio</b>: credencial mal puesta, pasarela caída, una petición
 *       mal formada. <b>El cliente no ha hecho nada.</b> Ni consume sus intentos ni
 *       arranca cobranza contra él: contarlo sería restringirle la cuenta por una
 *       avería nuestra.</li>
 * </ul>
 */
export const DECLINE_KIND_PRESENTATION: Record<DeclineKind, DeclineKindPresentation> = {
  SOFT: {
    label: 'Rechazo blando',
    meaning: 'La tarjeta está bien; hoy no había fondos o el emisor pidió esperar.',
    retryable: true,
    consumesCustomerAttempts: true,
    startsDunning: true,
    nextStep: `Se puede reprogramar: hasta ${SOFT_MAX_ATTEMPTS} intentos en ${SOFT_WINDOW_DAYS} días.`,
    variant: 'warning',
  },
  HARD: {
    label: 'Rechazo duro',
    meaning: 'El emisor prohíbe el cobro: tarjeta cancelada, robada o cuenta cerrada.',
    retryable: false,
    consumesCustomerAttempts: true,
    startsDunning: true,
    nextStep: 'No se reintenta. Hay que pedir otro medio de pago al cliente.',
    variant: 'danger',
  },
  CONFIGURATION: {
    label: 'Error nuestro',
    meaning: 'Credencial mal puesta, pasarela caída o petición mal formada. El cliente no falló.',
    retryable: true,
    consumesCustomerAttempts: false,
    startsDunning: false,
    nextStep: 'Arregla la configuración y vuelve a intentarlo. No cuenta contra el cliente.',
    variant: 'neutral',
  },
}

/**
 * Un intento de cobro tal como lo devuelve `/system/payment-attempts`.
 *
 * <p>Es el esquema `SystemPaymentAttemptResponse`, que añade `gatewayDeclineCode` a
 * la variante de tenant: el código crudo de la pasarela es lo que un operador pega
 * en el soporte del proveedor, y sin él la familia es una clasificación sin prueba.
 *
 * <p>`nextAttemptAt` vacío no significa «no se reintentará»: significa que nadie lo
 * ha programado. La diferencia importa — en un rechazo duro tiene que quedar vacío
 * para siempre, y en uno blando vacío es trabajo pendiente.
 */
export interface SystemPaymentAttemptResponse {
  id: number
  companyId: number
  billingDocumentId: number
  paymentMethodId: number | null
  /** Cuántos van, contando desde 1. Es lo que se compara con el techo de la ventana. */
  attemptNumber: number
  gateway: string
  requestedAmount: number
  /** El código crudo del proveedor: la prueba detrás de la familia. */
  gatewayDeclineCode: string | null
  declineKind: DeclineKind
  attemptedAt: string
  nextAttemptAt: string | null
  createdDate: string
  version: number | null
}

/** `POST /system/payment-attempts?companyId=…` — anotar un intento y su rechazo. */
export interface RecordPaymentAttemptRequest {
  billingDocumentId: number
  paymentMethodId: number | null
  gateway: string
  requestedAmount: number
  gatewayDeclineCode: string | null
  declineKind: DeclineKind
  attemptedAt: string
  /**
   * Cuándo se vuelve a intentar. <b>Tiene que ir vacío en un rechazo duro</b>: el
   * formulario no lo permite y el rótulo dice por qué.
   */
  nextAttemptAt: string | null
}

/** `PATCH /system/payment-attempts/{id}/schedule` — mover el próximo reintento. */
export interface ReschedulePaymentAttemptRequest {
  nextAttemptAt: string
}
