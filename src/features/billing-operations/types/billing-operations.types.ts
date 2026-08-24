/**
 * Cobranza — los tres verbos del dinero, que el modelo separa a propósito.
 *
 * <p><b>Devengar</b> (`subscription_charges`: el servicio se prestó) ·
 * <b>facturar</b> (`subscription_billing_documents`: se emitió el documento) ·
 * <b>cobrar</b> (`subscription_payments`: entró la plata). No son sinónimos y la
 * interfaz no los mezcla: cada uno tiene su tabla, su tipo y su pestaña
 * (especificación de suscripciones §3.5).
 *
 * <p><b>La mitad que ocurre fuera de este software.</b> La factura fiscal de la
 * suscripción la emite otro sistema; aquí solo se registra su referencia
 * (`externalInvoiceNumber`, `externalCufe`, `externalIssuedAt`,
 * `externalProvider`). No confundirla nunca con la facturación electrónica DIAN
 * que cada clínica emite a los dueños de mascotas: son dos emisores, dos
 * numeraciones y dos tablas distintas, y mezclarlas en pantalla enreda la
 * contabilidad de los clientes con la propia.
 *
 * <p><b>Todo lo de aquí son documentos, no formularios</b> (§3.2): se agregan y
 * no se editan. Un documento con factura externa ya registrada no cambia de
 * importe — corregirlo exige una nota crédito encadenada al original.
 */

export type DocumentKind = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE'

export type BillingReason = 'RECURRING_CYCLE' | 'PRORATION' | 'ONE_TIME' | 'ADJUSTMENT'

export type IssueStatus = 'DRAFT' | 'AWAITING_EXTERNAL' | 'EXTERNAL_REGISTERED' | 'VOIDED'

export type TaxTreatment = 'TAXED' | 'EXEMPT' | 'EXCLUDED'

export interface BillingDocumentTaxSummary {
  id: number
  taxTreatment: TaxTreatment
  taxRate: number
  taxableBase: number
  taxAmount: number
}

/**
 * Documento de cobro de la plataforma.
 *
 * <p>⚠️ El contrato **no incluye moneda**. No se añade localmente ni se rotula
 * el importe con `COP` a mano: inventar una divisa en una pantalla contable es
 * peor que no ponerla. Por eso los importes de un documento se pintan con
 * `formatDocumentAmount()` (sin símbolo) y no con `formatCurrency()`, que sí se
 * usa en los pagos porque `SubscriptionPaymentResponse.currency` sí existe. Está
 * abierto como issue de contrato.
 *
 * <p>`companyId` sí lo manda el backend, y es lo que permite ejecutar las
 * escrituras de `/system/subscription-billing/companies/{companyId}/**` sin
 * necesitar la cabecera `X-Company-Id`: la empresa viaja en la URL y **nunca es
 * implícita** (§1.1).
 */
export interface BillingDocumentResponse {
  id: number
  /** La empresa a la que se factura. Va en la URL de toda escritura sobre el documento. */
  companyId: number
  documentNumber: string
  subscriptionId: number
  documentKind: DocumentKind
  billingReason: BillingReason
  periodStart: string
  periodEnd: string
  issueStatus: IssueStatus
  externalInvoiceNumber: string | null
  externalCufe: string | null
  externalIssuedAt: string | null
  externalProvider: string | null
  externalRegisteredAt: string | null
  externalRegisteredBySystemUserId: number | null
  /**
   * La ida de la cadena de corrección: a qué documento corrige este.
   *
   * <p>⚠️ La **vuelta no existe en el contrato**: un documento corregido no
   * expone `correctedByDocumentId`, así que desde el original no se puede
   * enlazar a su nota crédito. §3.2 exige que las dos partes se vean; aquí solo
   * se puede pintar una. Está abierto como issue de contrato.
   */
  correctsDocumentId: number | null
  dueDate: string | null
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
  settledAmount: number
  balanceAmount: number
  taxes: BillingDocumentTaxSummary[]
  createdDate: string
  version: number
}

/**
 * Registro de la referencia de la factura fiscal emitida FUERA de VetSoftware.
 *
 * <p>Es la acción que saca un documento de la lista de pendientes. `cufe` es
 * opcional en el contrato (`@Size(max = 100)` sin `@NotBlank`) porque no todo
 * proveedor lo devuelve; los otros tres son obligatorios.
 */
export interface RegisterExternalInvoiceRequest {
  invoiceNumber: string
  cufe: string | null
  /** `yyyy-MM-dd`. La fecha de emisión que puso el proveedor, no la de hoy. */
  issuedAt: string
  provider: string
}

export type PaymentMethod = 'TRANSFER' | 'CARD' | 'PSE' | 'CASH' | 'OTHER'

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'

/**
 * Un cobro: plata que entró. **Registrarlo no se hace desde aquí** —
 * `POST /subscription-payments` resuelve la empresa con
 * `Authz.currentCompanyId()` y exige la cabecera `X-Company-Id`, así que su alta
 * vive en el expediente del contrato, donde la empresa es explícita (§4.5,
 * onda 2). Esta consola solo consulta el feed global
 * `GET /system/subscription-payments`.
 *
 * <p>`gateway` + `gatewayReference` son únicos juntos: el mismo aviso de la
 * pasarela recibido dos veces no crea dos pagos.
 */
export interface SubscriptionPaymentResponse {
  id: number
  companyId: number
  amount: number
  /** Aquí sí viene la divisa; en `BillingDocumentResponse` no existe. */
  currency: string
  paymentMethod: PaymentMethod
  gateway: string | null
  gatewayReference: string | null
  receivedAt: string
  status: PaymentStatus
  /** Vacío = sin conciliar. Es justo lo que hay que revisar cada mes. */
  reconciledAt: string | null
  createdDate: string
  version: number | null
}

export type DunningEventType =
  'REMINDER_SENT' | 'GRACE_STARTED' | 'READ_ONLY_APPLIED' | 'REACTIVATED' | 'WRITTEN_OFF'

export type DunningChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PHONE' | 'IN_APP'

/** Resumen del contrato al que pertenece el evento de mora. */
export interface DunningSubscriptionSummary {
  id: number
  companyId: number
  subscriptionNumber: string | null
  status: string | null
}

/** Resumen del documento que disparó el evento. Falta cuando el aviso no nació de uno. */
export interface DunningBillingDocumentSummary {
  id: number
  companyId: number
  documentNumber: string | null
  balanceAmount: number | null
}

/**
 * Un aviso de mora. Sirve para lo que dice el modelo: **demostrar que se avisó
 * antes de restringir la cuenta**.
 *
 * <p>Registrar uno nuevo (`POST /dunning-events`) es company-scoped y vive en el
 * expediente del contrato; el feed global de aquí es de solo consulta.
 */
export interface DunningEventResponse {
  id: number
  companyId: number
  subscription: DunningSubscriptionSummary
  billingDocument: DunningBillingDocumentSummary | null
  eventType: DunningEventType
  daysOverdue: number | null
  channel: DunningChannel | null
  detail: string | null
  occurredAt: string
  createdDate: string
}

/** Las cuatro listas de `/cobranza`, una por pestaña. */
export type BillingOperationList = 'awaitingExternal' | 'overdue' | 'payments' | 'dunning'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  PSE: 'PSE',
  CASH: 'Efectivo',
  OTHER: 'Otro',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  FAILED: 'Fallido',
  REFUNDED: 'Devuelto',
}

/**
 * El tono acompaña SIEMPRE al rótulo textual, nunca lo sustituye (§5.2, WCAG
 * §1.4.1): `AppBadge` pinta `label`, no un punto de color.
 */
export const PAYMENT_STATUS_VARIANT: Record<
  PaymentStatus,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
}

/**
 * Rótulos de los cinco eventos de mora.
 *
 * <p>⚠️ **Vocabulario fijado en §3.4 y no negociable**: no existe ni existirá
 * corte total de acceso. `READ_ONLY_APPLIED` se lee «Pasó a solo lectura», nunca
 * «bloqueada» ni «suspendida»: la empresa conserva la consulta y la impresión de
 * toda su información, incluida la historia clínica.
 */
export const DUNNING_EVENT_LABEL: Record<DunningEventType, string> = {
  REMINDER_SENT: 'Recordatorio enviado',
  GRACE_STARTED: 'Empezó la cortesía',
  READ_ONLY_APPLIED: 'Pasó a solo lectura',
  REACTIVATED: 'Reactivada',
  WRITTEN_OFF: 'Dada de baja contable',
}

export const DUNNING_EVENT_VARIANT: Record<
  DunningEventType,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  REMINDER_SENT: 'neutral',
  GRACE_STARTED: 'warning',
  READ_ONLY_APPLIED: 'danger',
  REACTIVATED: 'success',
  WRITTEN_OFF: 'neutral',
}

export const DUNNING_CHANNEL_LABEL: Record<DunningChannel, string> = {
  EMAIL: 'Correo',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Llamada',
  IN_APP: 'En la aplicación',
}
