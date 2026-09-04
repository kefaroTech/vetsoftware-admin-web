import type {
  BillingDocumentResponse,
  SubscriptionPaymentResponse,
} from '@/features/billing-operations/types/billing-operations.types'
import type { AmountReading } from './subscriptionHistoryText'
import {
  chargeStatusPresentation,
  chargeTypePresentation,
  type SubscriptionChargeResponse,
} from '../types/subscription-money.types'
import { formatAmount } from '@/composables/format'
/**
 * Los textos y las lecturas de `/dinero` (§3.5 y §4.4.2, tarea W2-E).
 *
 * <p>Todo lo que esta pantalla <b>afirma</b> vive aquí y no en el marcado: es lo
 * que permite que una prueba unitaria compruebe que ninguna frase de una pantalla
 * de contabilidad dice lo que no es, y que el vocabulario prohibido de §3.4 no se
 * cuela por una plantilla.
 *
 * <p><b>Qué NO se reimplementa aquí, y por qué importa.</b> `formatAmount`,
 * `formatMoney`, `formatDate` (`src/composables/format.ts`) y `formatDateTime`
 * (W2-C) ya existen. La consola no necesita una sexta forma de escribir un
 * importe: cada copia es un sitio más donde arreglar el día que el contrato
 * declare la divisa.
 *
 * <p><b>La decisión de la divisa, heredada de W1-E y extendida al cargo.</b>
 * `BillingDocumentResponse` no declara `currency`, y <b>`SubscriptionChargeResponse`
 * tampoco</b>: ninguno de los dos esquemas del contrato trae el campo. Rotular con
 * «$» una cifra cuya divisa el servidor no declara es inventar el dato, así que
 * los importes de cargo y de documento se pintan con `formatAmount()` —sin
 * símbolo— exactamente como ya hace la pantalla de cobranza. Los <b>pagos</b> sí
 * traen su divisa y por eso son los únicos de esta pantalla que la llevan escrita.
 * Cuando el contrato añada `currency` a los otros dos, se migran los dos a la vez.
 */

/** Frase de portada: la separación que la pantalla existe para sostener. */
export const MONEY_INTRO_NOTE =
  'Devengar, facturar y cobrar son tres cosas distintas y esta pantalla no las funde. Un cargo sin facturar no es una factura, y una cuenta de cobro emitida no es dinero recibido.'

/** Un verbo del dinero, con lo que significa y dónde se ve. */
export interface MoneyVerb {
  /** El verbo, tal cual se nombra. */
  verb: string
  /** Qué ocurrió de verdad cuando ese verbo aplica. */
  meaning: string
  /** El nombre del bloque de la pantalla que lo enseña. */
  block: string
}

/**
 * <b>Los tres verbos, nombrados.</b> El modelo los separa a propósito y la
 * interfaz mantiene la separación en vez de meterlo todo en «Facturación»
 * (§3.5).
 *
 * <p>Van en la portada de la pantalla y no en un pie de página: es lo primero que
 * hay que entender para no leer mal las tres tablas de abajo, y quien lo lea
 * después ya habrá sacado su conclusión equivocada.
 */
export const MONEY_VERBS: MoneyVerb[] = [
  {
    verb: 'Devengar',
    meaning: 'El servicio se prestó. Existe el derecho a cobrarlo; todavía no hay documento.',
    block: 'Devengado',
  },
  {
    verb: 'Facturar',
    meaning:
      'Se emitió el documento de cobro. Existe el documento; todavía no ha entrado la plata.',
    block: 'Facturado',
  },
  {
    verb: 'Cobrar',
    meaning: 'Entró la plata. Solo cuenta cuando el pago está confirmado.',
    block: 'Cobrado',
  },
]

/**
 * La convención de signos, declarada <b>en pantalla</b> y no solo en el código
 * (§3.5). Sin ella, un negativo se lee como un error y una nota crédito en rojo
 * se lee como una deuda; las dos lecturas mienten sobre la contabilidad, cada una
 * en una dirección.
 */
export const SIGN_CONVENTION_NOTE =
  'Un cargo de anulación es negativo: sumado al original da cero y los dos quedan en el expediente, porque anular no borra. Los importes de un documento de cobro son siempre positivos y el signo lo da su tipo, así que una nota crédito no se pinta en rojo con un menos.'

/**
 * La fracción de un prorrateo: <b>«18 de 31 días»</b>.
 *
 * <p>Es el requisito duro de §3.3 y la razón de que `prorationDays` y
 * `periodDays` existan. El modelo lo dice literalmente: sin esos dos números «un
 * prorrateo no se puede reconstruir: se ve el importe pero no de dónde salió, y
 * explicárselo a un cliente que reclama pasa a ser un ejercicio de arqueología».
 *
 * <p>Por eso <b>no</b> se pintan como dos columnas numéricas sueltas: dos celdas
 * con «18» y «31» obligan a hacer la división mentalmente, que es justo el paso
 * que nadie da cuando tiene al cliente al teléfono.
 */
export interface ProrationFraction {
  /** «18 de 31 días». El titular. */
  fraction: string
  /** El porcentaje redondeado, como refuerzo. Nunca solo. */
  percent: number
  /** La frase completa, para el `title` y para leerla en voz alta. */
  sentence: string
}

/**
 * Devuelve la fracción cuando el cargo la trae, y `null` cuando no.
 *
 * <p><b>`null` no es lo mismo para todos los cargos</b> y por eso esta función no
 * inventa un texto: un `RECURRING` cubre el periodo entero y no tiene fracción
 * que enseñar —ahí el hueco es correcto—, mientras que un `PRORATION` sin días es
 * un dato que falta y hay que decirlo. Quien decide cuál de las dos frases toca
 * es `prorationGap`, no esta.
 */
export function prorationFraction(charge: SubscriptionChargeResponse): ProrationFraction | null {
  const { prorationDays, periodDays } = charge
  if (prorationDays == null || periodDays == null) return null
  if (!Number.isFinite(prorationDays) || !Number.isFinite(periodDays)) return null
  // Un periodo de cero días no es un periodo: dividir por él daría `Infinity` y
  // pintaría «18 de 0 días (∞ %)» sobre una factura.
  if (periodDays <= 0) return null

  const percent = Math.round((prorationDays / periodDays) * 100)
  const fraction = `${prorationDays} de ${periodDays} ${periodDays === 1 ? 'día' : 'días'}`
  return {
    fraction,
    percent,
    sentence: `Se cobraron ${fraction} del periodo, el ${percent} % de la cuota completa.`,
  }
}

/**
 * Qué decir cuando <b>no</b> hay fracción, según el tipo de cargo.
 *
 * <p>Devuelve `''` cuando el hueco es legítimo. Un `PRORATION` sin sus días es lo
 * que el modelo llama arqueología, y esta pantalla lo dice en voz alta en vez de
 * dejar la celda en blanco: un blanco se lee como «no aplica» y aquí significa
 * «no se puede reconstruir».
 */
export function prorationGap(charge: SubscriptionChargeResponse): string {
  if (prorationFraction(charge) !== null) return ''
  if (charge.chargeType !== 'PRORATION') return ''
  return 'Este prorrateo no trae sus días: el importe se ve, pero no de dónde salió.'
}

/**
 * <b>El importe de un cargo, con su signo y su lectura.</b>
 *
 * <p>El signo <i>es</i> la información. Un cargo de anulación llega en negativo a
 * propósito, y pintarlo como si fuera un error —o quitarle el signo para que
 * «quede bonito»— rompe la única propiedad que hace que las cuentas cierren:
 * original + anulación = cero, con los dos en el expediente.
 *
 * <p>Sin símbolo de moneda: el esquema del cargo no declara divisa. Ver la
 * cabecera de este módulo.
 */
export function chargeAmountReading(charge: SubscriptionChargeResponse): AmountReading {
  const value = charge.subtotalAmount
  if (value == null || Number.isNaN(value)) {
    return { amount: '—', sentence: 'El cargo no trae importe.' }
  }
  if (value < 0) {
    const abs = formatAmount(Math.abs(value))
    return {
      amount: `−${abs}`,
      sentence: charge.voidsChargeId
        ? `Resta ${abs}: anula el cargo #${charge.voidsChargeId}, y los dos quedan sumando cero.`
        : `Resta ${abs} de lo devengado del periodo.`,
    }
  }
  return {
    amount: formatAmount(value),
    sentence: `Suma ${formatAmount(value)} a lo devengado del periodo.`,
  }
}

/**
 * La clase del signo. `''` para el positivo: `.ds-amount--pos` tiñe de verde y
 * un cargo corriente no es una buena noticia, es lo normal.
 *
 * <p>El color <b>nunca</b> va solo (§5.2, WCAG §1.4.1): el signo «−» ya está en
 * la cifra y el estado lleva su badge con rótulo.
 */
export function chargeAmountClass(charge: SubscriptionChargeResponse): string {
  return charge.subtotalAmount < 0 ? 'ds-amount--neg' : ''
}

/** Distintivo textual de un cargo que anula a otro. Vacío cuando no anula a ninguno. */
export function voidBadgeLabel(charge: SubscriptionChargeResponse): string {
  return charge.voidsChargeId == null ? '' : `Anula el cargo #${charge.voidsChargeId}`
}

/**
 * <b>El recuento de lo devengado, separado por lo que significa cada estado.</b>
 *
 * <p>Un único «total devengado» sumando los tres estados sería la cifra más
 * peligrosa de la pantalla: mezclaría lo que todavía no está en ninguna cuenta de
 * cobro con lo que ya se facturó y con lo que se anuló. Son tres cifras y se
 * pintan como tres.
 *
 * <p>Los anulados se cuentan aparte y <b>no</b> se restan de los otros dos: el
 * cargo de anulación ya viene en negativo y aparece en su propio estado; restarlo
 * además lo contaría dos veces.
 */
export interface AccruedTotals {
  pendingAmount: number
  pendingCount: number
  invoicedAmount: number
  invoicedCount: number
  voidedCount: number
}

export function accruedTotals(charges: SubscriptionChargeResponse[]): AccruedTotals {
  const totals: AccruedTotals = {
    pendingAmount: 0,
    pendingCount: 0,
    invoicedAmount: 0,
    invoicedCount: 0,
    voidedCount: 0,
  }
  for (const charge of charges) {
    const amount = Number.isFinite(charge.subtotalAmount) ? charge.subtotalAmount : 0
    if (charge.status === 'PENDING') {
      totals.pendingAmount += amount
      totals.pendingCount += 1
    } else if (charge.status === 'INVOICED') {
      totals.invoicedAmount += amount
      totals.invoicedCount += 1
    } else {
      totals.voidedCount += 1
    }
  }
  return totals
}

/**
 * La frase del bloque «Devengado», que dice las tres cifras <b>sin fundirlas</b>.
 *
 * <p>Es también lo que se anuncia en la región `role="status"` al cambiar el
 * filtro de estado (§5.3): un cambio de consulta que no se anuncia deja a quien no
 * ve la tabla creyendo que sigue mirando lo mismo.
 */
export function accruedSummary(totals: AccruedTotals, scopeNote = ''): string {
  const partes = [
    `${totals.pendingCount} ${totals.pendingCount === 1 ? 'cargo devengado sin facturar' : 'cargos devengados sin facturar'} por ${formatAmount(totals.pendingAmount)}`,
    `${totals.invoicedCount} ya ${totals.invoicedCount === 1 ? 'facturado' : 'facturados'} por ${formatAmount(totals.invoicedAmount)}`,
  ]
  if (totals.voidedCount > 0) {
    partes.push(`${totals.voidedCount} ${totals.voidedCount === 1 ? 'anulado' : 'anulados'}`)
  }
  const frase = `${partes.join(' · ')}.`
  return scopeNote ? `${frase} ${scopeNote}` : frase
}

/**
 * <b>Solo los pagos confirmados cuentan como cobro.</b>
 *
 * <p>Los cuatro estados del contrato son `PENDING`, `CONFIRMED`, `FAILED` y
 * `REFUNDED`, y tres de ellos no son plata que se quedó. Sumar un pago pendiente
 * al total cobrado es exactamente cómo una cuenta morosa se ve al día en pantalla
 * mientras el banco todavía no ha abonado nada.
 */
export function countsAsCollected(payment: SubscriptionPaymentResponse): boolean {
  return payment.status === 'CONFIRMED'
}

/** Lo efectivamente cobrado, y cuánto queda fuera del recuento y por qué. */
export interface CollectedTotals {
  confirmedAmount: number
  confirmedCount: number
  /** Registrados pero que NO cuentan: pendientes, fallidos y devueltos. */
  notCountedCount: number
}

export function collectedTotals(payments: SubscriptionPaymentResponse[]): CollectedTotals {
  const totals: CollectedTotals = { confirmedAmount: 0, confirmedCount: 0, notCountedCount: 0 }
  for (const payment of payments) {
    if (countsAsCollected(payment)) {
      totals.confirmedAmount += Number.isFinite(payment.amount) ? payment.amount : 0
      totals.confirmedCount += 1
    } else {
      totals.notCountedCount += 1
    }
  }
  return totals
}

/**
 * La frase del bloque «Cobrado». Nombra lo que <b>no</b> cuenta, porque un total
 * que omite en silencio tres pagos pendientes es un total que engaña.
 */
export function collectedSummary(totals: CollectedTotals): string {
  const base = `${totals.confirmedCount} ${totals.confirmedCount === 1 ? 'pago confirmado' : 'pagos confirmados'} por ${formatAmount(totals.confirmedAmount)}.`
  if (totals.notCountedCount === 0) return base
  return `${base} Otros ${totals.notCountedCount} registrados no cuentan como cobro: están pendientes, fallidos o devueltos.`
}

/**
 * Lo que queda por cobrar de un documento, dicho con las dos cifras que lo
 * componen. `balanceAmount` a secas no dice si es que no se ha pagado nada o si
 * es que se abonó la mitad.
 */
export function documentBalanceReading(document: BillingDocumentResponse): AmountReading {
  const balance = document.balanceAmount
  const settled = document.settledAmount
  if (balance == null || Number.isNaN(balance)) {
    return { amount: '—', sentence: 'El documento no dice cuánto queda por cobrar.' }
  }
  if (balance <= 0) {
    return {
      amount: formatAmount(0),
      sentence: `Saldado: se aplicaron ${formatAmount(settled)} sobre un total de ${formatAmount(document.totalAmount)}.`,
    }
  }
  if (settled > 0) {
    return {
      amount: formatAmount(balance),
      sentence: `Abonado en parte: ${formatAmount(settled)} de ${formatAmount(document.totalAmount)}. Quedan ${formatAmount(balance)}.`,
    }
  }
  return {
    amount: formatAmount(balance),
    sentence: `Sin ningún abono: quedan los ${formatAmount(balance)} completos.`,
  }
}

/**
 * <b>La cadena de corrección, visible</b> (§3.2). Un documento con factura
 * externa registrada no cambia de importe: corregirlo exige una nota crédito
 * encadenada al original, y esa relación tiene que verse.
 *
 * <p>⚠️ El contrato solo trae la <b>ida</b> (`correctsDocumentId`). Desde el
 * documento corregido no se puede enlazar a la nota que lo corrige, porque no
 * existe `correctedByDocumentId`. Es la carencia que W1-E ya dejó anotada; aquí
 * se hereda y no se disimula.
 */
export function correctionChainText(document: BillingDocumentResponse): string {
  if (document.correctsDocumentId == null) return ''
  return `Corrige al documento #${document.correctsDocumentId}. El original no se modificó: sigue en el expediente con su importe.`
}

/**
 * El motivo por el que un cargo existe, en una frase, para el `title` de la
 * cadena y para el nombre accesible de sus enlaces.
 */
export function chargeOriginLabel(charge: SubscriptionChargeResponse): string {
  const tipo = chargeTypePresentation(charge.chargeType).label
  const estado = chargeStatusPresentation(charge.status).label
  return `${tipo} · ${estado} · ${charge.description}`
}

/**
 * Mensaje del conflicto de `gateway` + `gatewayReference`, que son únicos juntos.
 *
 * <p>§4.5 lo fija literalmente: el operador tiene que leer <b>«Ese pago ya estaba
 * registrado»</b>, no «violación de restricción única». La segunda le hace pensar
 * que el sistema falló y volver a intentarlo con otra referencia, que es cómo un
 * mismo giro acaba contado dos veces.
 */
export const DUPLICATE_PAYMENT_MESSAGE =
  'Ese pago ya estaba registrado. La pasarela y su referencia son únicas juntas: el mismo aviso recibido dos veces no crea dos pagos.'

/**
 * Lo que se le dice al operador antes de registrar un pago, para que no espere de
 * la operación algo que no hace.
 */
export const PAYMENT_INDEPENDENCE_NOTE =
  'Registrar un pago no lo aplica a ninguna cuenta de cobro concreta: un cliente puede pagar tres de un giro, o abonar la mitad de una. Aquí se anota que entró la plata; la aplicación a los documentos es otra operación.'

/**
 * El pago nace pendiente y lo dice antes de guardarse. Es la otra mitad de «solo
 * los confirmados cuentan como cobro».
 */
export const PAYMENT_STARTS_PENDING_NOTE =
  'El pago queda registrado como pendiente. El estado lo pone el servidor, y hasta que esté confirmado no cuenta como cobro.'
