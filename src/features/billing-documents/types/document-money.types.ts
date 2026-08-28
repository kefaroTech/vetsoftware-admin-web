import type { ApplicationSourceKind } from './billing-documents.types'

/**
 * <b>Lo que se le puede hacer al dinero de un documento</b>: aplicar, contra-aplicar,
 * registrar una retención y emitir la nota crédito que lo corrige.
 *
 * <p>Vive aparte de `billing-documents.types.ts` porque aquello describe el
 * <b>documento</b> —su circuito, su desglose, lo que ya lo salda— y esto describe
 * las <b>escrituras</b>. Son dos ritmos distintos: el primero cambia cuando cambia
 * el modelo del documento, el segundo cuando el contrato publica una operación
 * nueva.
 *
 * <p><b>Los importes son siempre positivos.</b> El signo lo da el tipo del
 * documento y el sentido de la fila, nunca un menos en el campo. Un formulario
 * que aceptara «−40000» dejaría entrar dos convenciones de signo a la vez y a
 * partir de ahí ninguna suma de pantalla cuadra con ninguna suma del servidor.
 */

/**
 * <b>Registrar una aplicación a mano.</b>
 * `POST /billing-document-applications` · `ApplyBillingDocumentRequest`.
 *
 * <p>`clientRequestId` es la llave de idempotencia: el mismo envío repetido —doble
 * clic, reintento del navegador, red que se cortó tras salir la petición— no puede
 * saldar dos veces el mismo documento. Se genera en el cliente al abrir el
 * formulario y viaja con él.
 */
export interface ApplyBillingDocumentRequest {
  targetDocumentId: number
  sourceKind: ApplicationSourceKind
  /** Solo con origen `PAYMENT`. */
  paymentId: number | null
  /** Solo con origen `CREDIT_NOTE`: el documento que corrige a este. */
  sourceDocumentId: number | null
  /**
   * <b>Los cuatro campos de abajo son opcionales en el contrato y aquí van con
   * `?`, no con `| null`.</b> No es cosmético: en un cuerpo de petición omitir un
   * campo y mandarlo a `null` no son lo mismo, y estos tres últimos solo tienen
   * sentido acompañando a su origen. Obligar a cada formulario a escribir
   * `withholdingId: null` para registrar un pago sería pedirle que afirme algo
   * sobre una retención que no existe.
   */
  /** Solo con origen `CUSTOMER_CREDIT`: el lote de saldo a favor del que sale. */
  creditEntryId?: number
  /** Solo con origen `WITHHOLDING`: la retención ya practicada que se imputa. */
  withholdingId?: number
  /** Solo con origen `WRITE_OFF`: el motivo escrito del castigo. Máximo 255. */
  writeOffReason?: string
  /**
   * La fecha con la que el asiento entra en la contabilidad. Si no viaja, la pone
   * el servidor. Se manda cuando el operador está regularizando algo de un periodo
   * anterior, que es justo cuando la fecha de registro y la de valor dejan de
   * coincidir.
   */
  valueDate?: string
  appliedAmount: number
  clientRequestId: string
}

/** Qué referencia admite cada origen. Es lo que decide qué campo pinta el formulario. */
export type ApplicationReferenceField = 'PAYMENT' | 'DOCUMENT' | 'NONE'

export interface ApplicationSourceForm {
  /** Qué referencia acompaña a este origen, si es que alguna. */
  reference: ApplicationReferenceField
  /**
   * La ruta que el contrato prefiere para este origen, cuando existe otra mejor.
   * `null` = esta es la única. Se pinta como aviso dentro del formulario: ofrecer
   * el camino largo sin decir que hay uno corto es cómo se acaban registrando
   * retenciones sin base, sin tarifa y sin año gravable.
   */
  betterRoute: string | null
}

/**
 * <b>Cómo se registra cada uno de los seis orígenes.</b>
 *
 * <p>Los seis caben en `POST /billing-document-applications`, pero <b>tres tienen
 * un camino mejor</b> y el formulario lo dice en vez de dejar elegir a ciegas. Una
 * retención registrada como aplicación suelta pierde el tipo, la base, la tarifa,
 * el municipio y el año gravable — exactamente los datos que hacen falta el día que
 * la contadora del cliente pide el certificado.
 */
export const APPLICATION_SOURCE_FORM: Record<ApplicationSourceKind, ApplicationSourceForm> = {
  PAYMENT: { reference: 'PAYMENT', betterRoute: null },
  CREDIT_NOTE: {
    reference: 'DOCUMENT',
    betterRoute:
      'Si la nota crédito todavía no existe, emítela desde «Emitir nota crédito»: así queda encadenada al original y su aplicación la crea el servidor.',
  },
  WITHHOLDING: {
    reference: 'NONE',
    betterRoute:
      'Usa «Registrar retención»: por aquí se guarda el importe y nada más — ni el tipo, ni la base, ni la tarifa, ni el municipio, ni el año gravable.',
  },
  CUSTOMER_CREDIT: {
    reference: 'NONE',
    betterRoute:
      'Consumir saldo a favor por lotes se hace en «Saldo a favor», que descuenta empezando por el lote que antes caduca. Por aquí se salda el documento sin tocar ningún lote.',
  },
  ROUNDING: { reference: 'NONE', betterRoute: null },
  WRITE_OFF: { reference: 'NONE', betterRoute: null },
}

/** Los tres impuestos que un cliente puede retener en Colombia. */
export type WithholdingType = 'INCOME_TAX' | 'VAT' | 'ICA'

export const WITHHOLDING_TYPES: readonly WithholdingType[] = ['INCOME_TAX', 'VAT', 'ICA'] as const

export const WITHHOLDING_TYPE_LABEL: Record<WithholdingType, string> = {
  INCOME_TAX: 'Retención en la fuente (renta)',
  VAT: 'Retención de IVA (reteiva)',
  ICA: 'Retención de ICA (reteica)',
}

/**
 * Qué cambia entre los tres, dicho donde se elige.
 *
 * <p>Solo el ICA es municipal, y es el único de los tres que sin código de
 * municipio queda inservible: el certificado lo expide el municipio, no la DIAN.
 */
export const WITHHOLDING_TYPE_MEANING: Record<WithholdingType, string> = {
  INCOME_TAX: 'La practica el cliente sobre la base gravable y la consigna a la DIAN.',
  VAT: 'Se practica sobre el IVA facturado, no sobre el total.',
  ICA: 'Es municipal: sin el código del municipio el certificado no se puede pedir.',
}

export const WITHHOLDING_TYPE_OPTIONS: { value: WithholdingType; label: string }[] =
  WITHHOLDING_TYPES.map((value) => ({ value, label: WITHHOLDING_TYPE_LABEL[value] }))

/**
 * <b>Una retención practicada por el cliente.</b>
 * `GET/POST /system/document-withholdings` · `DocumentWithholdingResponse`.
 *
 * <p><b>Una retención saldada no es una deuda.</b> El cliente que retuvo bien y
 * giró el resto no está en mora aunque el saldo del documento no llegue a cero por
 * sí solo: la parte retenida está en la DIAN, no sin pagar. Registrarla es lo que
 * convierte ese saldo vivo en una fila explicada, y es lo que impide que la mora
 * arranque contra alguien que pagó correctamente.
 *
 * <p>`certificateId` llega cuando el cliente ya entregó el certificado. Vacío no
 * significa que no exista: significa que todavía no llegó, y el año gravable manda
 * — `GET /system/document-withholdings/uncertified?fiscalYear=` es la lista de las
 * que faltan.
 */
export interface DocumentWithholdingResponse {
  id: number
  companyId: number
  billingDocumentId: number
  type: WithholdingType
  taxableBase: number
  ratePercent: number
  amount: number
  /** Código DIVIPOLA del municipio. Solo tiene sentido con `ICA`. */
  municipalityCode: string | null
  fiscalYear: number
  /** El periodo fiscal al que se imputa, tal como lo escribe el cliente: `2026-08`. */
  fiscalPeriodKey: string
  /** `yyyy-MM-dd`. La fecha en la que el cliente la practicó, no la de hoy. */
  practicedOn: string
  certificateId: number | null
  createdDate: string
}

/** El cuerpo de `POST /system/document-withholdings?companyId=…`. */
export interface RegisterDocumentWithholdingRequest {
  billingDocumentId: number
  type: WithholdingType
  taxableBase: number
  ratePercent: number
  amount: number
  municipalityCode: string | null
  fiscalYear: number | null
  fiscalPeriodKey: string
  practicedOn: string
}

/**
 * Cuánto puede separarse el importe declarado del que sale de base × tarifa antes
 * de que la pantalla lo cante, en unidades de la moneda del documento.
 *
 * <p>No se corrige el importe automáticamente: el que manda es el que el cliente
 * escribió en su certificado, y ajustarlo «para que cuadre» produciría una
 * retención que no coincide con ningún papel. Lo que sí se hace es avisar, porque
 * una diferencia de miles suele ser una tarifa mal tecleada.
 */
export const WITHHOLDING_ROUNDING_TOLERANCE = 1
