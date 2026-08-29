/**
 * Cotizaciones — el embudo comercial de la consola de plataforma.
 *
 * <p><b>Por qué casi todo es copia congelada y no una referencia.</b> Una cotización enviada es un
 * documento: sus líneas guardan `itemCode`, `itemName`, `itemType`, `unitAmount` y `taxRate`
 * copiados del catálogo el día en que se emitió. Si mañana sube el precio de «Historia clínica»,
 * la cotización de ayer sigue diciendo lo que decía. Por eso estos tipos NO reutilizan
 * `CatalogItemResponse`: apuntar a la ficha viva del artículo sería justo el error que el modelo
 * evita.
 *
 * <p>Consecuencia directa en los tipos: `itemType` y `taxTreatment` se declaran `string` y no la
 * unión cerrada de `commercial-catalog.types`. Una cotización de 2026 puede conservar un tipo de
 * artículo que el catálogo ya retiró, y una unión lo convertiría en un valor imposible que el
 * compilador cree que no existe. El rótulo se resuelve con `itemTypeLabel()`, que cae al código
 * crudo cuando no lo conoce en vez de pintar un hueco.
 */

/** El ciclo de `quotes.status`: `DRAFT → SENT → ACCEPTED | REJECTED | EXPIRED`. */
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

export type QuoteBillingCycle = 'MONTHLY' | 'ANNUAL'

/**
 * Resumen de empresa anidado del contrato.
 *
 * <p>Las cotizaciones son la ÚNICA familia de estas pantallas cuyo DTO trae el nombre de la
 * empresa; `SubscriptionResponse`, `BillingDocumentResponse` y `SubscriptionPaymentResponse`
 * exponen solo `companyId` y obligan a pintar «#42». Ver el issue de contrato B-1.
 */
export interface CompanySummary {
  id: number
  name: string
  identifier: string
}

/** Una línea de la oferta, con el precio y el impuesto congelados al emitirla. */
export interface QuoteLineResponse {
  id: number
  lineNumber: number
  /** Referencia al artículo vivo. Sirve para enlazar, NUNCA para releer el nombre o el precio. */
  catalogItemId: number
  itemCode: string
  itemName: string
  /** Copia congelada: puede ser un tipo que el catálogo ya no ofrece. Ver la cabecera. */
  itemType: string
  /**
   * Tramo de la tarifa escalonada del que salió este renglón (D-66). Los tramos son
   * ACUMULATIVOS: una cantidad que cruza escalones produce VARIOS renglones del mismo
   * artículo a precios distintos, y `tierMin`/`tierMax` son lo único que explica por qué.
   * Sin ellos, dos líneas iguales con `unitAmount` distinto parecen un error de datos.
   *
   * <p>`tierMax` nulo es el último tramo, el de «en adelante».
   */
  tierMin: number
  tierMax: number | null
  contractedQuantity: number
  includedQuantity: number
  quantity: number
  unitAmount: number
  grossAmount: number
  discountPercent: number
  discountAmount: number
  /**
   * D-86. El descuento está sujeto a una condición —permanencia—, y por eso el IVA se
   * liquida sobre el precio de LISTA y no sobre el rebajado. Es lo que explica que
   * `taxAmount` no salga de aplicar `taxRate` al importe con descuento.
   */
  discountIsConditional: boolean
  taxRate: number
  /** Copia congelada, igual que `itemType`. */
  taxTreatment: string
  /**
   * La base sobre la que se liquidó el impuesto. Con `discountIsConditional` en `true` NO
   * coincide con el importe rebajado, y ese es justo el motivo de que el contrato la mande
   * en vez de dejar que el front la recomponga: recomponerla mal es cobrar mal.
   */
  taxableBase: number
  taxAmount: number
  lineTotal: number
  enabled: boolean
}

/**
 * Una respuesta del configurador que produjo esta oferta.
 *
 * <p>No es accesorio: es la única forma de responder «¿por qué le vendimos esto?» seis meses
 * después, y por eso el detalle las pinta como pares legibles y no como identificadores.
 */
export interface QuoteAnswerResponse {
  id: number
  questionId: number
  optionId: number | null
  questionCode: string
  answerValue: string
  enabled: boolean
}

/** Fila del listado de plataforma (`GET /quotes/platform`). */
export interface QuoteSummaryResponse {
  id: number
  quoteNumber: string
  /** `null` cuando se cotizó a un prospecto que todavía no existe como empresa. */
  company: CompanySummary | null
  prospectName: string | null
  prospectEmail: string | null
  priceListId: number
  billingCycle: QuoteBillingCycle
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  status: QuoteStatus
  /** Hasta cuándo se respeta el precio ofrecido. Sin esto, una oferta de 2026 vale en 2029. */
  validUntil: string
  trialDays: number
  acceptedAt: string | null
  createdDate: string
  enabled: boolean
}

/** El documento completo (`GET /quotes/{id}`). */
export interface QuoteResponse {
  id: number
  quoteNumber: string
  company: CompanySummary | null
  prospectName: string | null
  prospectEmail: string | null
  prospectDocument: string | null
  prospectPhone: string | null
  priceListId: number
  billingCycle: QuoteBillingCycle
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  status: QuoteStatus
  validUntil: string
  trialDays: number
  /** Momento de la aceptación. Con `acceptedByEmail` y `acceptedIp`, la prueba de que contrató. */
  acceptedAt: string | null
  acceptedByEmail: string | null
  /**
   * La pone el SERVIDOR desde la petición, no el formulario. Una prueba que el cliente escribe no
   * prueba nada, así que el modal de aceptación no tiene —ni debe tener— campo de IP.
   */
  acceptedIp: string | null
  /** Llave de idempotencia con la que se creó. Es lo que hace que un doble clic no cree dos. */
  clientRequestId: string | null
  lines: QuoteLineResponse[]
  answers: QuoteAnswerResponse[]
  createdDate: string
  enabled: boolean
}

export interface QuoteLineRequest {
  catalogItemId: number
  quantity: number
  discountPercent: number
  /**
   * D-86. Marca el descuento como sujeto a permanencia; entonces el servidor liquida el IVA
   * sobre el precio de lista y no sobre el rebajado.
   *
   * <p>Opcional a propósito, igual que el `Boolean` (envoltorio, no primitivo) del `record`
   * de Java: omitirlo es legal y significa `false`. Lo caro es marcar de más, no de menos.
   */
  discountIsConditional?: boolean
}

export interface QuoteAnswerRequest {
  questionId: number
  optionId: number | null
  answerValue: string | null
}

export interface CreateQuoteRequest {
  /** `crypto.randomUUID()` UNA vez al abrir el formulario, no en cada envío. */
  clientRequestId: string
  prospectName: string | null
  prospectEmail: string | null
  prospectDocument: string | null
  prospectPhone: string | null
  priceListId: number
  billingCycle: QuoteBillingCycle
  validUntil: string
  trialDays: number | null
  lines: QuoteLineRequest[]
  answers: QuoteAnswerRequest[]
}

/** El servidor añade la IP y la marca de tiempo; aquí solo viaja quién dijo que sí. */
export interface AcceptQuoteRequest {
  acceptedByEmail: string
}

/**
 * Una línea de `POST /quotes/self-serve`. <b>Espeja `SelfServeQuoteLineRequest`.</b>
 *
 * <p><b>Esta consola no consume la ruta de autoservicio</b> —la usa la clínica desde el front del
 * tenant, que sí la tiene implementada—, y aun así los dos tipos se declaran y se atan aquí. El
 * motivo no es simetría: un esquema sin atadura es un agujero, y este ya se movió una vez. La
 * línea pedía `catalogItemId: number` y ahora pide `code: string`; ese cambio invierte el sentido
 * del campo —de identificador interno a código de catálogo— y <b>los dos fronts lo habrían
 * aceptado en silencio</b>, porque nada comparaba el esquema con nada. Aquí, revertirlo rompe la
 * compilación con el nombre del campo delante.
 *
 * <p>`quantity` se declara <b>requerido</b> aunque el contrato lo dé opcional, y esa estrechez es
 * legítima (`MismatchedFields` acepta un tipo local más estrecho): el contrato lo marca opcional
 * solo porque un `int` primitivo de Java no lleva `@NotNull`, mientras el borde REST lo valida
 * `@Positive`. Un cuerpo sin `quantity` llega al servidor como `0` y se rechaza con un 400, así
 * que declararlo opcional dejaría compilar exactamente la petición que no funciona.
 */
export interface SelfServeQuoteLineRequest {
  /** Código del artículo del catálogo. <b>No</b> es `catalogItemId`: ver la nota de arriba. */
  code: string
  quantity: number
}

/**
 * `POST /quotes/self-serve` — la clínica pide su propia oferta. <b>Espeja
 * `SelfServeQuoteRequest`.</b>
 *
 * <p>No lleva `companyId` —lo pone el servidor desde el principal— ni ningún término económico:
 * ni tarifa, ni vigencia, ni descuento, ni días de prueba. No son campos que el servidor valide
 * después: son campos que el tipo no tiene, así que no hay dónde escribirlos. Es la diferencia
 * con `CreateQuoteRequest`, que es la de esta consola y sí los lleva todos.
 *
 * <p>`billingCycle` se estrecha a `QuoteBillingCycle` aunque el contrato diga `string`: el backend
 * lo acota con `@Pattern(regexp = "MONTHLY|ANNUAL")`. <b>Ojo con el reverso</b>: si el backend
 * añadiera un tercer ciclo, el esquema seguiría diciendo `string` y esta atadura <b>no diría
 * nada</b> — la unión hay que ampliarla a mano.
 */
export interface SelfServeQuoteRequest {
  /** Llave de idempotencia del cliente. Máximo 64 caracteres. */
  clientRequestId: string
  billingCycle: QuoteBillingCycle
  lines: SelfServeQuoteLineRequest[]
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
}

/**
 * El tono acompaña al rótulo, nunca lo sustituye (WCAG 2.2 §1.4.1): `AppBadge` siempre pinta el
 * texto. No se inventa un quinto tono — los cuatro salen de `tokens.css` y están medidos.
 */
export const QUOTE_STATUS_VARIANT: Record<
  QuoteStatus,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  DRAFT: 'neutral',
  SENT: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'neutral',
}

export const QUOTE_BILLING_CYCLE_LABEL: Record<QuoteBillingCycle, string> = {
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
}

export const QUOTE_BILLING_CYCLE_OPTIONS: { value: QuoteBillingCycle; label: string }[] = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'ANNUAL', label: 'Anual' },
]

const ITEM_TYPE_LABEL: Record<string, string> = {
  MODULE: 'Módulo',
  CAPACITY: 'Capacidad',
  ONE_TIME: 'Pago único',
  BUNDLE: 'Paquete',
}

const TAX_TREATMENT_LABEL: Record<string, string> = {
  TAXED: 'Gravado',
  EXEMPT: 'Exento',
  EXCLUDED: 'Excluido',
}

/**
 * Cae al código crudo si el catálogo retiró el tipo: la línea es una copia congelada y su valor
 * puede ser legítimamente uno que el enum de hoy ya no contempla. Preferimos enseñar el código a
 * enseñar un hueco.
 */
export function itemTypeLabel(code: string): string {
  return ITEM_TYPE_LABEL[code] ?? code
}

export function taxTreatmentLabel(code: string): string {
  return TAX_TREATMENT_LABEL[code] ?? code
}

/**
 * **La regla que gobierna la pantalla de detalle.** A partir de `SENT` la cotización es un
 * documento: no se recalcula, no se edita y no se elimina. Solo se agrega — se acepta, se rechaza
 * o se emite otra. Un `DRAFT` todavía no se le ha enseñado a nadie.
 *
 * <p>El detalle NO usa esto para deshabilitar botones: lo usa para elegir **qué componente monta**.
 * Un `<input disabled>` diría «editable, pero ahora no»; el chasis de documento dice «esto es un
 * hecho». Ver `QuoteDetailView.vue`.
 */
export function isEmittedQuote(status: QuoteStatus): boolean {
  return status !== 'DRAFT'
}

/** El único estado en el que todavía se puede decidir el resultado de la oferta. */
export function isDecidableQuote(status: QuoteStatus): boolean {
  return status === 'SENT'
}
