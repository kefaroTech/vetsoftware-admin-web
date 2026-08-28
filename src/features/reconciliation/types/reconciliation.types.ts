/**
 * Tipos de conciliación — el cuadre de la plataforma con el mundo de fuera.
 *
 * <p>Tres cosas distintas que la pantalla junta y el contrato mantiene
 * separadas:
 *
 * <ol>
 *   <li><b>El cuadre con el facturador externo</b>
 *       (`/system/external-invoice-reconciliations`): nuestro documento de cobro
 *       frente a la factura fiscal que emitió el tercero. Cuatro números
 *       enfrentados y cuatro estados.</li>
 *   <li><b>Las liquidaciones de la pasarela</b> (`/system/gateway-settlements`):
 *       el lote con el que la pasarela nos paga, con sus cinco importes.</li>
 *   <li><b>Los extractos bancarios</b> (`/system/bank-receipts`): el abono que
 *       de verdad entró en la cuenta, contra el que se concilia el lote.</li>
 * </ol>
 *
 * <p>Los nombres son los del esquema del contrato (`api/openapi.json`) para que
 * la atadura de `src/types/api.contract.ts` se lea igual que en el otro
 * repositorio y una deriva del backend falle con el nombre a la vista.
 *
 * <p>⚠️ <b>Aviso de aislamiento, y es el eje del módulo.</b> Una liquidación
 * agrupa los cobros de <b>muchas clínicas</b> en una sola fila. Esta consola es
 * de plataforma y aquí sí se ve el lote entero — pero ninguna de estas
 * estructuras lleva, ni debe llevar, una llave que vaya del pago de un cliente
 * concreto a su lote. Ver `GatewaySettlementResponse`.
 */

// ───────────────────────────────────────────────────────────────────────────
// 1 · El cuadre con el facturador externo
// ───────────────────────────────────────────────────────────────────────────

/**
 * Los cuatro veredictos de un cuadre. **Dos de ellos están cerrados y dos no**,
 * y esa es la única lectura que importa al cerrar el mes.
 *
 * - `MATCHED` — los cuatro números coinciden. Cerrado.
 * - `WITHIN_TOLERANCE` — hay diferencia, pero es de redondeo: nuestro impuesto
 *   va agregado sobre el total y el emisor lo calcula línea a línea, así que dos
 *   pesos de diferencia son aritmética, no discrepancia. **Cerrado, no en
 *   mora.**
 * - `MISMATCH` — la diferencia no cabe en la tolerancia. Alguien cobró de más o
 *   de menos.
 * - `MISSING_EXTERNAL` — devengamos el ingreso y **nunca llegó factura
 *   externa**. Es el peor de los cuatro y el más fácil de no ver, porque no hay
 *   ninguna cifra que chirríe: no hay cifra ninguna.
 */
export type ExternalInvoiceReconciliationStatus =
  'MATCHED' | 'WITHIN_TOLERANCE' | 'MISMATCH' | 'MISSING_EXTERNAL'

export interface ExternalInvoiceReconciliationResponse {
  id: number
  companyId: number
  billingDocumentId: number
  /** Resolución de facturación del emisor. Vacía mientras no se ha casado la factura. */
  externalResolutionNumber: string | null
  externalRangeFrom: number | null
  externalRangeTo: number | null
  resolutionValidUntil: string | null
  /** El identificador que le puso el emisor. `null` = todavía no hay factura externa. */
  externalInvoiceId: string | null
  externalCufe: string | null
  /** Lo que calculamos nosotros. Siempre viene: es lo que devengamos. */
  computedTotal: number
  computedTax: number
  /** Lo que dice el emisor. `null` mientras no haya factura: **hueco, no cero**. */
  externalTotal: number | null
  externalTax: number | null
  /** La que declara el servidor. `null` cuando no hay con qué restar. */
  difference: number | null
  status: ExternalInvoiceReconciliationStatus
  resolvedBySystemUserId: number | null
  resolvedAt: string | null
  resolutionNote: string | null
  /** Periodo contable `yyyy-MM` al que se imputa la resolución. */
  postingPeriod: string | null
  createdDate: string
}

/** `POST /system/external-invoice-reconciliations?companyId=` */
export interface OpenExternalInvoiceReconciliationRequest {
  billingDocumentId: number
  computedTotal: number
  computedTax: number
}

/** `POST /system/external-invoice-reconciliations/{id}/external-invoice` */
export interface MatchExternalInvoiceRequest {
  externalInvoiceId: string
  externalCufe: string | null
  externalTotal: number
  externalTax: number
  externalResolutionNumber: string | null
  externalRangeFrom: number | null
  externalRangeTo: number | null
  resolutionValidUntil: string | null
}

/**
 * `POST /system/external-invoice-reconciliations/{id}/resolution`
 *
 * <p>Los tres campos son obligatorios en el contrato: cerrar un cuadre sin decir
 * quién, por qué y a qué periodo contable lo imputa es cerrar sin dejar rastro.
 * `postingPeriod` lleva el patrón `^[0-9]{4}-(0[1-9]|1[0-2])$` en el propio
 * esquema.
 */
export interface ResolveExternalInvoiceReconciliationRequest {
  resolvedBySystemUserId: number
  resolutionNote: string
  postingPeriod: string
}

// ───────────────────────────────────────────────────────────────────────────
// 2 · Las liquidaciones de la pasarela
// ───────────────────────────────────────────────────────────────────────────

/**
 * Un lote de la pasarela: lo que nos paga de una vez y lo que nos cobró por
 * cobrarlo.
 *
 * <p><b>Los cinco importes admiten negativo</b> y eso no es un dato roto: un
 * contracargo dentro del lote resta, y un lote con más devoluciones que cobros
 * puede llegar con el bruto en negativo. La pantalla los pinta tal cual — con su
 * signo — porque convertirlos a cero o a valor absoluto es esconder exactamente
 * el mes que hay que mirar.
 *
 * <p>⚠️ <b>`settlementReference` es una etiqueta, no una llave.</b> El lote agrupa
 * los cobros de muchas clínicas en una fila, así que cualquier camino que lleve
 * del pago de un cliente a su lote —un enlace, una búsqueda por referencia, un
 * filtro— convierte el detalle de un cliente en una puerta al agregado de todos
 * los demás. Aquí la referencia se lee y se copia a mano contra el portal de la
 * pasarela; no navega a ningún sitio, y ninguna estructura de este módulo lleva
 * el identificador de un pago concreto.
 */
export interface GatewaySettlementResponse {
  id: number
  /** El nombre de la pasarela tal y como lo declara el registro. */
  gateway: string
  settlementReference: string
  /** La factura que la pasarela nos emite por su comisión. */
  providerInvoiceRef: string | null
  providerTaxId: string | null
  grossAmount: number
  feeAmount: number
  feeTaxAmount: number
  gmfAmount: number
  netAmount: number
  /** Comisión + impuesto de la comisión + gravamen. Derivado por el servidor. */
  totalCost: number
  /** Los cobros que el lote **dice** traer. Ver `GatewaySettlementReconciliationResponse`. */
  paymentCount: number
  settledOn: string
  /** El abono bancario con el que se casó. `null` = todavía sin casar. */
  bankReceiptId: number | null
  createdDate: string
}

/** `POST /system/gateway-settlements` */
export interface RegisterGatewaySettlementRequest {
  gateway: string
  settlementReference: string
  grossAmount: number
  feeAmount: number
  feeTaxAmount: number
  gmfAmount: number
  netAmount: number
  /** El contrato lo declara opcional: un lote se puede registrar sin la cuenta. */
  paymentCount: number | null
  settledOn: string
}

/** `PATCH /system/gateway-settlements/{id}/provider-invoice` */
export interface AttachProviderInvoiceRequest {
  providerInvoiceRef: string
  providerTaxId: string
}

/** `PATCH /system/gateway-settlements/{id}/bank-receipt` */
export interface LinkBankReceiptRequest {
  bankReceiptId: number
}

/**
 * La cuenta del lote, contrastada.
 *
 * <p>La liquidación **declara** cuántos cobros trae y el servidor cuenta cuántos
 * hay atados de verdad. Si dice 37 y hay 36, hay un pago perdido: la pasarela
 * cobró un dinero que no llegó a ninguna de nuestras cuentas o que no supimos
 * imputar, y eso es exactamente lo que hay que reclamar mientras la ventana de
 * reclamación siga abierta.
 *
 * <p><b>Es un agregado y solo un agregado</b>: dice cuántos faltan, nunca
 * cuáles. Poner aquí la lista de pagos del lote sería el camino del cliente al
 * lote por la puerta de atrás.
 */
export interface GatewaySettlementReconciliationResponse {
  settlementId: number
  gateway: string
  settlementReference: string
  /** Cobros que el lote dice traer. */
  declaredPayments: number
  /** Cobros realmente atados al lote. */
  linkedPayments: number
  /** Declarados menos enlazados. Positivo: falta atar un cobro. Negativo: sobra uno. */
  difference: number
  balanced: boolean
}

// ───────────────────────────────────────────────────────────────────────────
// 3 · Los extractos bancarios
// ───────────────────────────────────────────────────────────────────────────

/**
 * Qué se sabe de un abono de la cuenta.
 *
 * - `UNIDENTIFIED` — entró dinero y no se sabe de qué es. Es la bandeja de
 *   trabajo: mientras siga aquí, hay caja sin explicar.
 * - `IDENTIFIED` — ya se sabe a qué corresponde.
 * - `DISCARDED` — no era nuestro, o era un movimiento que no toca conciliar.
 */
export type BankReceiptStatus = 'UNIDENTIFIED' | 'IDENTIFIED' | 'DISCARDED'

export interface BankReceiptResponse {
  id: number
  bankAccountRef: string
  bankReference: string
  receivedOn: string
  /** Admite negativo: una devolución bancaria es un abono con signo. */
  amount: number
  description: string | null
  status: BankReceiptStatus
  identifiedAt: string | null
  createdDate: string
}

/** `POST /system/bank-receipts` */
export interface RegisterBankReceiptRequest {
  bankAccountRef: string
  bankReference: string
  receivedOn: string
  amount: number
  description: string | null
}
