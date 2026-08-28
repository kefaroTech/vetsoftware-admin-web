import type {
  BankReceiptStatus,
  ExternalInvoiceReconciliationResponse,
  ExternalInvoiceReconciliationStatus,
  GatewaySettlementReconciliationResponse,
  GatewaySettlementResponse,
} from '../types/reconciliation.types'

/**
 * Los veredictos de la conciliación, en castellano y con las palabras exactas.
 *
 * <p>Funciones y mapas puros, sin Vue y sin red: el mismo texto tiene que salir
 * en la tabla, en el detalle y en la confirmación, y un veredicto contado de tres
 * maneras obliga al que cierra el mes a traducir entre ellas. Traducir es donde
 * se equivoca.
 */

/** El tono con el que se pinta un veredicto. El mismo vocabulario que `AppBadge`. */
export type VerdictTone = 'success' | 'warning' | 'danger' | 'neutral'

export interface Verdict {
  /** El rótulo corto. Nunca vacío, y nunca comunicado solo por color (WCAG 2.2 §1.4.1). */
  label: string
  /** Qué significa y qué hay que hacer, en una frase. */
  meaning: string
  tone: VerdictTone
  /**
   * `true` cuando el cuadre **está terminado** y no espera a nadie. Es lo que
   * separa las dos filas cerradas de las dos que son trabajo pendiente, y lo que
   * decide si algo entra en la lista de mora.
   */
  closed: boolean
}

/**
 * Los cuatro veredictos del cuadre con el facturador externo.
 *
 * <p><b>`WITHIN_TOLERANCE` está cerrado y hay que decirlo con esas palabras.</b>
 * Nuestro impuesto se calcula agregado sobre el total del documento y el emisor
 * lo calcula línea a línea; dos pesos de diferencia entre los dos es aritmética
 * de redondeo, no una discrepancia. Pintarlo en rojo junto a los `MISMATCH`
 * hincha la lista de trabajo del cierre con filas que no tienen nada que
 * arreglar, y la lista que se llena de ruido se deja de mirar.
 *
 * <p><b>`MISSING_EXTERNAL` es el peor y va el primero en cualquier orden.</b> No
 * es que los números no cuadren: es que devengamos un ingreso, se cobró, y nunca
 * salió factura fiscal. No hay ninguna cifra que chirríe porque no hay cifra, así
 * que si nadie lo va a buscar a propósito no aparece hasta la inspección.
 */
export const EXTERNAL_VERDICT: Record<ExternalInvoiceReconciliationStatus, Verdict> = {
  MATCHED: {
    label: 'Cuadra',
    meaning: 'El total y el impuesto que calculamos coinciden con los de la factura del emisor.',
    tone: 'success',
    closed: true,
  },
  WITHIN_TOLERANCE: {
    label: 'Cuadra dentro de la tolerancia',
    meaning:
      'La diferencia es de redondeo: nuestro impuesto va agregado sobre el total y el emisor lo calcula línea a línea. Es tolerancia, no discrepancia — este documento está cerrado, no en mora.',
    tone: 'success',
    closed: true,
  },
  MISMATCH: {
    label: 'No cuadra',
    meaning:
      'La diferencia no cabe en la tolerancia: uno de los dos cobró de más o de menos. Hay que corregir el documento o pedir la nota al emisor antes de cerrar el periodo.',
    tone: 'danger',
    closed: false,
  },
  MISSING_EXTERNAL: {
    label: 'Devengado sin factura externa',
    meaning:
      'El ingreso está devengado y nunca llegó la factura fiscal del emisor. Es dinero devengado que nadie facturó: no hay ninguna cifra que chirríe, porque no hay cifra.',
    tone: 'danger',
    closed: false,
  },
}

export function externalVerdict(status: ExternalInvoiceReconciliationStatus): Verdict {
  return EXTERNAL_VERDICT[status]
}

/** El orden en que se trabaja el cierre: primero lo que no tiene factura. */
export const EXTERNAL_STATUS_ORDER: readonly ExternalInvoiceReconciliationStatus[] = [
  'MISSING_EXTERNAL',
  'MISMATCH',
  'WITHIN_TOLERANCE',
  'MATCHED',
] as const

export const EXTERNAL_STATUS_OPTIONS: {
  value: ExternalInvoiceReconciliationStatus
  label: string
}[] = EXTERNAL_STATUS_ORDER.map((status) => ({
  value: status,
  label: EXTERNAL_VERDICT[status].label,
}))

/**
 * ¿Le falta a este cuadre la factura del emisor?
 *
 * <p>No se deduce del estado sino del dato: un cuadre sin `externalInvoiceId`
 * todavía no se ha casado con nada, y sus columnas «externas» son un
 * <b>hueco</b>, no un cero. Es la diferencia entre «el emisor dice 0» y «el
 * emisor no ha dicho nada», y confundirlas produce una diferencia inventada del
 * tamaño de la factura entera.
 */
export function lacksExternalInvoice(
  reconciliation: Pick<
    ExternalInvoiceReconciliationResponse,
    'externalInvoiceId' | 'externalTotal' | 'externalTax'
  >,
): boolean {
  return (
    !reconciliation.externalInvoiceId &&
    reconciliation.externalTotal == null &&
    reconciliation.externalTax == null
  )
}

/**
 * Las dos diferencias, calculadas solo cuando hay con qué.
 *
 * <p>El contrato trae una `difference` sola, sin decir de cuál de los dos pares
 * es. Estas dos se derivan de los cuatro números que sí vienen y se pintan al
 * lado de la del servidor: son las que dejan ver si lo que baila es el total o
 * solo el impuesto, que es lo que decide si se pide una nota crédito o se cierra
 * por tolerancia.
 */
export interface AmountGap {
  total: number | null
  tax: number | null
}

export function amountGap(
  reconciliation: Pick<
    ExternalInvoiceReconciliationResponse,
    'computedTotal' | 'computedTax' | 'externalTotal' | 'externalTax'
  >,
): AmountGap {
  return {
    total:
      reconciliation.externalTotal == null
        ? null
        : reconciliation.computedTotal - reconciliation.externalTotal,
    tax:
      reconciliation.externalTax == null
        ? null
        : reconciliation.computedTax - reconciliation.externalTax,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// La cuenta del lote
// ───────────────────────────────────────────────────────────────────────────

/**
 * Qué dice la cuenta de una liquidación, en la frase con la que se reclama.
 *
 * <p>«Declara 37 cobros y hay 36 atados: falta 1» es lo que se copia en el
 * correo a la pasarela. «No cuadra» no sirve para reclamar nada.
 *
 * <p>El signo importa y se cuenta distinto: <b>positivo</b> es un pago perdido
 * —cobrado y no imputado— y es dinero que se reclama; <b>negativo</b> es un cobro
 * atado de más, que casi siempre es un error de imputación nuestro y no un
 * agujero de la pasarela.
 */
export function settlementCountVerdict(
  reconciliation: Pick<
    GatewaySettlementReconciliationResponse,
    'declaredPayments' | 'linkedPayments' | 'difference' | 'balanced'
  >,
): Verdict {
  const { declaredPayments: declared, linkedPayments: linked, difference } = reconciliation
  const counted = `Declara ${declared} ${declared === 1 ? 'cobro' : 'cobros'} y hay ${linked} ${linked === 1 ? 'atado' : 'atados'}`

  if (reconciliation.balanced) {
    return {
      label: 'La cuenta cuadra',
      meaning: `${counted}. La liquidación trae lo que dice traer.`,
      tone: 'success',
      closed: true,
    }
  }

  if (difference > 0) {
    return {
      label: difference === 1 ? 'Falta 1 cobro' : `Faltan ${difference} cobros`,
      meaning: `${counted}: ${difference === 1 ? 'hay un pago perdido' : `hay ${difference} pagos perdidos`}. La pasarela cobró un dinero que no llegó a imputarse, y eso es exactamente lo que hay que reclamarle con esta referencia delante.`,
      tone: 'danger',
      closed: false,
    }
  }

  const extra = Math.abs(difference)
  return {
    label: extra === 1 ? 'Sobra 1 cobro' : `Sobran ${extra} cobros`,
    meaning: `${counted}: hay ${extra === 1 ? 'uno atado de más' : `${extra} atados de más`}. La liquidación no declara tantos, así que lo más probable es una imputación nuestra a un lote que no era.`,
    tone: 'warning',
    closed: false,
  }
}

/**
 * Los importes del lote que llegan en negativo.
 *
 * <p>Un negativo aquí **no es un dato roto**: un contracargo dentro del lote
 * resta, y un mes con más devoluciones que cobros deja el bruto por debajo de
 * cero. La pantalla los pinta con su signo y lo dice; lo que no hace es
 * normalizarlos, que es como una devolución de dos millones se convierte en un
 * ingreso de dos millones.
 */
/** Une una lista en castellano: «a, b y c». Vacía devuelve cadena vacía. */
export function joinSpanish(items: readonly string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1] ?? ''}`
}

export function negativeAmountLabels(
  settlement: Pick<
    GatewaySettlementResponse,
    'grossAmount' | 'feeAmount' | 'feeTaxAmount' | 'gmfAmount' | 'netAmount'
  >,
): string[] {
  const pairs: [string, number][] = [
    ['bruto', settlement.grossAmount],
    ['comisión', settlement.feeAmount],
    ['impuesto de la comisión', settlement.feeTaxAmount],
    ['gravamen de salida', settlement.gmfAmount],
    ['neto', settlement.netAmount],
  ]
  return pairs.filter(([, value]) => value < 0).map(([label]) => label)
}

/**
 * ¿Sale la cuenta del lote? `bruto − comisión − impuesto − gravamen` debería dar
 * el neto.
 *
 * <p>El contrato no lo garantiza: `totalCost` es derivado pero `netAmount` viene
 * del registro, así que los dos pueden no coincidir si el lote se dio de alta a
 * mano con un dedo torcido. Se compara con una tolerancia de un peso, porque el
 * redondeo del gravamen a las cuatro por mil produce céntimos que no son un
 * descuadre.
 */
export const AMOUNT_TOLERANCE = 1

export function settlementAmountsBalance(
  settlement: Pick<
    GatewaySettlementResponse,
    'grossAmount' | 'feeAmount' | 'feeTaxAmount' | 'gmfAmount' | 'netAmount'
  >,
): { expectedNet: number; gap: number; balanced: boolean } {
  const expectedNet =
    settlement.grossAmount - settlement.feeAmount - settlement.feeTaxAmount - settlement.gmfAmount
  const gap = settlement.netAmount - expectedNet
  return { expectedNet, gap, balanced: Math.abs(gap) <= AMOUNT_TOLERANCE }
}

// ───────────────────────────────────────────────────────────────────────────
// Los extractos bancarios
// ───────────────────────────────────────────────────────────────────────────

export const BANK_RECEIPT_VERDICT: Record<BankReceiptStatus, Verdict> = {
  UNIDENTIFIED: {
    label: 'Sin identificar',
    meaning:
      'Entró dinero en la cuenta y todavía no se sabe de qué es. Mientras siga aquí hay caja sin explicar.',
    tone: 'warning',
    closed: false,
  },
  IDENTIFIED: {
    label: 'Identificado',
    meaning: 'Ya se sabe a qué corresponde este abono.',
    tone: 'success',
    closed: true,
  },
  DISCARDED: {
    label: 'Descartado',
    meaning:
      'No era nuestro, o es un movimiento que no toca conciliar. Se conserva por trazabilidad.',
    tone: 'neutral',
    closed: true,
  },
}

export function bankReceiptVerdict(status: BankReceiptStatus): Verdict {
  return BANK_RECEIPT_VERDICT[status]
}

/**
 * El periodo contable de hoy en `yyyy-MM`, que es lo que exige
 * `ResolveExternalInvoiceReconciliationRequest` con su patrón.
 *
 * <p>Se arma con los componentes locales y no con `toISOString()`: en Bogotá
 * (UTC-5) el ISO en UTC del 1 de marzo a las 20:00 ya dice marzo, pero el del 31
 * de marzo a las 20:00 dice abril — e imputar un cierre al mes siguiente es
 * exactamente el error que no se puede permitir.
 */
export function currentPostingPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const POSTING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
