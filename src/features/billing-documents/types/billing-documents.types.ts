import type {
  DocumentKind,
  IssueStatus,
  TaxTreatment,
} from '@/features/billing-operations/types/billing-operations.types'
import {
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_VARIANT,
} from '@/features/subscriptions-admin/types/subscription-money.types'

/**
 * <b>El documento de cobro visto como documento</b>: su circuito de estados, lo
 * que lo compone y lo que lo va saldando (§G2–G4 de la ampliación).
 *
 * <p><b>Lo que este fichero NO redeclara.</b> `BillingDocumentResponse`,
 * `BillingDocumentTaxSummary`, `DocumentKind`, `IssueStatus` y
 * `RegisterExternalInvoiceRequest` ya existen en `features/billing-operations`
 * (W1-E) y se importan de allí. Copiarlos aquí daría dos verdades sobre la misma
 * tabla y dos sitios donde arreglar el día que el contrato cambie. Igual con
 * `SubscriptionChargeResponse`, que vive en `features/subscriptions-admin`: el
 * renglón de un documento y el cargo devengado de un contrato <b>son la misma
 * fila</b> de `subscription_charges`, y declararla dos veces sería el mismo
 * defecto con otro nombre.
 *
 * <p>Lo propio de esta feature son tres cosas que ninguna pantalla anterior
 * necesitaba: el <b>vocabulario del circuito</b>, la <b>aplicación</b> —qué salda
 * qué— y la <b>nota crédito</b>.
 *
 * <p><b>Dos convenciones de importe que no se mezclan</b> (regla de negocio, no
 * de estilo): los importes de un documento son <b>siempre positivos</b> y el
 * signo lo da su tipo — una `CREDIT_NOTE` de 40.000 trae `totalAmount: 40000`,
 * no `-40000`. Lo que sí es negativo es el <i>cargo</i> que anula a otro
 * (`SubscriptionChargeResponse.subtotalAmount`, `voidsChargeId`). Pintar el total
 * de una nota crédito en negativo «porque resta» sería aplicar la convención del
 * cargo al documento, y a partir de ahí ninguna suma de pantalla cuadra con
 * ninguna suma del servidor.
 */

/** Qué es cada tipo de documento. */
export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  INVOICE: 'Cuenta de cobro',
  CREDIT_NOTE: 'Nota crédito',
  DEBIT_NOTE: 'Nota débito',
}

/** Cómo mueve la cartera cada tipo. Es el signo del documento, escrito. */
export const DOCUMENT_KIND_DIRECTION: Record<DocumentKind, string> = {
  INVOICE: 'Suma a lo que la empresa debe.',
  CREDIT_NOTE: 'Resta de lo que la empresa debe. Sus importes se guardan en positivo.',
  DEBIT_NOTE: 'Suma a lo que la empresa debe. Sus importes se guardan en positivo.',
}

export interface IssueStatusPresentation {
  /** El rótulo del circuito, fijado en §G2. No se improvisa por pantalla. */
  label: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
  /** Qué significa para quien opera. Es la columna, no una decoración. */
  meaning: string
}

/**
 * Qué significa cada estado <b>para quien opera</b>, que es lo que un rótulo de
 * dos palabras no puede decir.
 *
 * <p><b>`AWAITING_EXTERNAL` es el que importa.</b> Su significado no es un
 * sinónimo de su rótulo: es dinero devengado que nadie facturó. Es el estado más
 * fácil de no ver precisamente porque <b>no falla nada</b> — la plataforma prestó
 * el servicio, calculó el documento, y ahí se quedó. Ninguna alerta suena por un
 * documento que espera.
 */
export const ISSUE_STATUS_MEANING: Record<IssueStatus, string> = {
  DRAFT: 'Está calculado y ni siquiera se mandó a facturar.',
  AWAITING_EXTERNAL: 'Devengado y todavía sin factura externa: es plata que nadie facturó.',
  EXTERNAL_REGISTERED:
    'La referencia de la factura fiscal que emitió el tercero ya está capturada.',
  VOIDED: 'Se anuló antes de existir fuera; su periodo vuelve a quedar libre para reemitir.',
}

/**
 * <b>Los cuatro estados del circuito</b>: rótulo, tono y significado.
 *
 * <p><b>El rótulo y el tono NO se escriben aquí: se derivan.</b> Ya existen dos
 * copias literales —`BillingDocumentsTable.vue` y `ISSUE_STATUS_LABEL` /
 * `ISSUE_STATUS_VARIANT` de `subscriptions-admin`— y una guarda
 * (`tests/unit/subscription-money.spec.ts`) las mantiene idénticas leyendo el
 * texto de la primera. Escribir aquí una tercera copia añadiría un rótulo que esa
 * guarda no cubre, y ese es exactamente el mecanismo por el que el mismo estado
 * acaba llamándose de dos formas en dos pantallas de la misma consola. Derivando,
 * lo único propio de esta feature es el significado.
 *
 * <p>⚠️ La especificación §G2 quiere rótulos más cortos —«Calculado», «Esperando
 * factura», «Facturado»— y este no es el sitio donde cambiarlos: ese renombrado
 * toca a la vez la tabla de cobranza, el mapa de `subscriptions-admin` y la propia
 * guarda. Queda declarado como pendiente en vez de hacerse a medias y dejar tres
 * pantallas diciendo dos cosas.
 */
export const ISSUE_STATUS_PRESENTATION: Record<IssueStatus, IssueStatusPresentation> = {
  DRAFT: {
    label: ISSUE_STATUS_LABEL.DRAFT,
    variant: ISSUE_STATUS_VARIANT.DRAFT,
    meaning: ISSUE_STATUS_MEANING.DRAFT,
  },
  AWAITING_EXTERNAL: {
    label: ISSUE_STATUS_LABEL.AWAITING_EXTERNAL,
    variant: ISSUE_STATUS_VARIANT.AWAITING_EXTERNAL,
    meaning: ISSUE_STATUS_MEANING.AWAITING_EXTERNAL,
  },
  EXTERNAL_REGISTERED: {
    label: ISSUE_STATUS_LABEL.EXTERNAL_REGISTERED,
    variant: ISSUE_STATUS_VARIANT.EXTERNAL_REGISTERED,
    meaning: ISSUE_STATUS_MEANING.EXTERNAL_REGISTERED,
  },
  VOIDED: {
    label: ISSUE_STATUS_LABEL.VOIDED,
    variant: ISSUE_STATUS_VARIANT.VOIDED,
    meaning: ISSUE_STATUS_MEANING.VOIDED,
  },
}

/**
 * A partir de cuántos días un documento que espera factura externa deja de ser
 * «reciente» y pasa a ser un atasco.
 *
 * <p>Treinta días es un ciclo de facturación entero: un documento que lleva más
 * que eso esperando ya sobrevivió al cierre del mes que lo debía haber sacado.
 * El umbral se pinta escrito en la pantalla —«más de 30 días»— y no se esconde en
 * un color, porque el operador tiene que poder discutirlo.
 */
export const STALLED_AFTER_DAYS = 30

/**
 * <b>Tolerancia del impuesto agregado, en unidades de la moneda del documento.</b>
 *
 * <p>Es una regla de negocio y no un redondeo de presentación: la plataforma
 * calcula el impuesto <b>una vez sobre la base agregada</b> y el emisor externo lo
 * calcula <b>línea a línea</b>. Dos formas legítimas de llegar al mismo sitio que
 * difieren en unos pesos. Un documento con dos pesos de resto está <b>cerrado</b>,
 * no en mora, y pintarlo como discrepancia manda a alguien a perseguir una
 * diferencia que no existe.
 *
 * <p>Va al lado del rótulo siempre («dentro de la tolerancia de 2»): un umbral que
 * no se ve es un umbral que nadie puede rebatir.
 */
export const TAX_TOLERANCE = 2

/**
 * <b>Los tres tratamientos fiscales, cada uno con lo que significa.</b>
 *
 * <p><b>Exento y excluido no se colapsan en «tarifa cero»</b> (§G3): los dos
 * pagan cero y son cosas distintas —uno está dentro del impuesto con tarifa 0 y
 * el otro está fuera del impuesto—, y esa diferencia es la que decide si el
 * emisor externo puede descontar el IVA de sus compras. Fundirlos en una fila
 * porque «el importe es el mismo» es perder el dato que hace falta para
 * declarar.
 *
 * <p>No reutiliza `TAX_TREATMENT_OPTIONS` de `commercial-catalog` a propósito:
 * aquello es la lista de un `AppSelect` —pares `{value,label}` para elegir— y
 * esto es un mapa de lectura con el significado al lado. Los rótulos se escriben
 * iguales para que las dos pantallas digan lo mismo.
 */
export const TAX_TREATMENT_PRESENTATION: Record<TaxTreatment, { label: string; meaning: string }> =
  {
    TAXED: { label: 'Gravado', meaning: 'Dentro del impuesto y con tarifa.' },
    EXEMPT: { label: 'Exento', meaning: 'Dentro del impuesto, con tarifa cero.' },
    EXCLUDED: { label: 'Excluido', meaning: 'Fuera del impuesto. No es lo mismo que exento.' },
  }

/**
 * Los seis orígenes de una aplicación. El contrato los declara como enum, así que
 * son estos y no hay un séptimo hasta que el backend lo publique.
 */
export type ApplicationSourceKind =
  'PAYMENT' | 'CREDIT_NOTE' | 'WITHHOLDING' | 'CUSTOMER_CREDIT' | 'ROUNDING' | 'WRITE_OFF'

export interface ApplicationSourcePresentation {
  label: string
  /** Qué es de verdad esa fila. En retención, evita una discusión contable. */
  meaning: string
}

/**
 * <b>Rótulos de los seis orígenes</b>, con la regla que §G4 exige por escrito.
 *
 * <p><b>La retención no se llama «descuento».</b> Una retención no reduce el
 * ingreso: baja la cartera y sube un activo. Llamarla descuento invita a
 * descuadrar el ingreso del mes, y además es la fila que provoca el peor fallo
 * conocido del cobro — el cliente giró menos porque retuvo, el saldo queda vivo,
 * arranca la mora y la empresa cae a solo lectura por una deuda que fiscalmente
 * no existe.
 */
export const APPLICATION_SOURCE_PRESENTATION: Record<
  ApplicationSourceKind,
  ApplicationSourcePresentation
> = {
  PAYMENT: { label: 'Pago', meaning: 'Entró la plata.' },
  CREDIT_NOTE: {
    label: 'Nota crédito',
    meaning: 'Otro documento corrige a este y lo salda en esa parte.',
  },
  WITHHOLDING: {
    label: 'Retención en la fuente',
    meaning: 'Plata suya que fue directa a la DIAN. No es un descuento: no reduce el ingreso.',
  },
  CUSTOMER_CREDIT: {
    label: 'Saldo a favor',
    meaning: 'Se aplicó crédito que la empresa ya tenía.',
  },
  ROUNDING: {
    label: 'Residuo de redondeo',
    meaning: 'Los centavos que ningún medio de pago mueve.',
  },
  WRITE_OFF: { label: 'Castigo', meaning: 'Se dio por incobrable. No entró plata.' },
}

/**
 * Resumen de un documento tal como lo devuelve una aplicación. Es el esquema
 * `BillingDocumentSummary` del contrato, no un recorte propio.
 *
 * <p>`documentNumber` y `balanceAmount` son nulables porque el contrato no los
 * marca garantizados; `documentKind` viaja como `string` suelto allí y aquí se
 * estrecha al enum del documento, que es el mismo dominio.
 */
export interface BillingDocumentSummary {
  id: number
  companyId: number
  documentNumber: string | null
  documentKind: DocumentKind
  totalAmount: number
  balanceAmount: number | null
}

/**
 * <b>Una aplicación: qué salda qué.</b> `GET /billing-document-applications`.
 *
 * <p><b>No se edita y no se borra</b>, y la forma del recurso lo dice: el contrato
 * no declara `PUT` ni `DELETE`. Deshacer una aplicación es crear otra que la
 * contra-aplica (`POST /{id}/reversal`), y las dos quedan — por eso
 * `reversalOfId`. Una papelera en esta tabla sería una promesa que el esquema no
 * puede cumplir.
 */
export interface BillingDocumentApplicationResponse {
  id: number
  companyId: number
  /** El documento que se salda. Siempre viene. */
  targetDocument: BillingDocumentSummary
  sourceKind: ApplicationSourceKind
  /** El pago, cuando el origen es `PAYMENT`. */
  paymentId: number | null
  /** El documento de origen, cuando lo salda otro documento (nota crédito). */
  sourceDocument: BillingDocumentSummary | null
  /**
   * <b>Cuándo cuenta el asiento, que no es cuándo se registró.</b> El contrato lo
   * declara <b>obligatorio</b>, así que no es nulable: toda aplicación tiene fecha
   * de valor. Es la que manda para saber en qué periodo contable cae la fila, y por
   * eso no se puede sustituir por `appliedAt` —ese dice cuándo se tecleó—.
   */
  valueDate: string
  /** El lote de saldo a favor, cuando el origen es `CUSTOMER_CREDIT`. */
  creditEntryId: number | null
  /** La retención practicada, cuando el origen es `WITHHOLDING`. */
  withholdingId: number | null
  /** Firma nominal de plataforma. Solo con origen `WRITE_OFF`. */
  writeOffAuthorizedBySystemUserId: number | null
  /** Motivo escrito del castigo. Solo con origen `WRITE_OFF`. */
  writeOffReason: string | null
  /**
   * Cuánto de este documento saldó esta fila.
   *
   * <p>⚠️ El contrato <b>no dice qué signo trae una contra-aplicación</b>: declara
   * `appliedAmount: number` y nada más. Por eso la pantalla no supone que la suma
   * de esta columna sea lo saldado — la <b>compara</b> con `settledAmount`, que es
   * el número que el servidor mantiene, y dice si las dos cuentan lo mismo. Sumar
   * a ciegas daría una cifra plausible y equivocada justo en los documentos que
   * llevan una reversión, que son los que alguien está mirando porque algo pasó.
   */
  appliedAmount: number
  /** A qué aplicación contra-aplica esta. Las dos quedan y suman cero. */
  reversalOfId: number | null
  appliedAt: string
  createdDate: string
}

/**
 * Emitir la nota crédito que corrige un documento ya registrado.
 *
 * <p>Es el <b>único</b> camino para corregir un documento con factura externa: el
 * original no se toca. Si se tocara, lo que dice VetSoftware dejaría de coincidir
 * con lo que tiene la DIAN y no habría forma de saber cuál de los dos miente.
 *
 * <p>El cuerpo son los cargos a acreditar, no un importe: el servidor deriva el
 * importe de los cargos. Por eso no existe —y no puede existir— ningún campo de
 * «importe a corregir» en esta pantalla.
 */
export interface IssueCreditNoteRequest {
  chargeIds: number[]
}
