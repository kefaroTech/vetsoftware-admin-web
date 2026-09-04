import type {
  DocumentKind,
  IssueStatus,
  PaymentMethod,
  TaxTreatment,
} from '@/features/billing-operations/types/billing-operations.types'

/**
 * `/dinero` — <b>los tres verbos, en el expediente de un contrato</b> (§3.5 y
 * §4.4.2, tarea W2-E).
 *
 * <p><b>Devengar</b> (el servicio se prestó: `subscription_charges`) ·
 * <b>facturar</b> (se emitió el documento: `subscription_billing_documents`) ·
 * <b>cobrar</b> (entró la plata: `subscription_payments`). No son sinónimos y
 * esta pantalla no los funde: un cargo `PENDING` <b>no</b> es una factura, y una
 * cuenta de cobro emitida <b>no</b> es dinero recibido.
 *
 * <p><b>Lo que este fichero NO redeclara.</b> `BillingDocumentResponse`,
 * `SubscriptionPaymentResponse` y sus rótulos ya existen en
 * `features/billing-operations` (W1-E) y se importan de allí. Copiarlos aquí
 * habría dado dos verdades sobre la misma tabla y dos sitios donde arreglar el
 * día que el contrato cambie — que es exactamente lo que la consola no puede
 * permitirse en una pantalla contable. Esta feature aporta solo lo que W1-E no
 * necesitaba: el <b>cargo</b> y el <b>cuerpo del alta de un pago</b>.
 *
 * <p><b>Todo lo de aquí son documentos, no formularios</b> (§3.2). Un cargo no se
 * corrige: se emite otro cargo negativo que lo anula, y los dos quedan. Un
 * documento con factura externa registrada no cambia de importe: corregirlo exige
 * una nota crédito encadenada. Por eso ninguno de estos tipos tiene un
 * `Update…Request`, y no es un olvido.
 */

/**
 * Los seis tipos de cargo del contrato.
 *
 * <p>`CREDIT` y `DISCOUNT` existen y hoy no se emiten desde esta consola; se
 * declaran porque el enum del backend los trae y una fila con un valor sin rótulo
 * pintaría el valor crudo, que es lo que §4.4.2 prohíbe.
 *
 * <p>`OVERAGE` es el sexto y el más reciente. Esta unión es <b>cerrada</b> y
 * `CHARGE_TYPE_PRESENTATION` la recorre de forma <b>exhaustiva</b>: añadir el valor
 * al backend sin añadirlo aquí deja de compilar, que es exactamente lo que se
 * quiere. Es la barandilla que impide que un cargo llegue a la pantalla sin
 * rótulo.
 */
export type SubscriptionChargeType =
  'RECURRING' | 'PRORATION' | 'ONE_TIME' | 'CREDIT' | 'DISCOUNT' | 'OVERAGE'

/**
 * El estado de un cargo, que es la mitad de la frontera entre <b>devengar</b> y
 * <b>facturar</b>.
 *
 * <p>`PENDING` es servicio prestado que todavía no está en ninguna cuenta de
 * cobro. `INVOICED` es servicio prestado que ya entró en una. `VOIDED` es un
 * cargo anulado — que sigue ahí, porque anular no borra.
 */
export type SubscriptionChargeStatus = 'PENDING' | 'INVOICED' | 'VOIDED'

/**
 * Un cargo: <b>el servicio se prestó</b>. `GET /subscription-billing/charges`.
 *
 * <p><b>`prorationDays` y `periodDays` son el corazón de la pantalla.</b> El
 * modelo lo dice sin rodeos: sin esos dos números «un prorrateo no se puede
 * reconstruir: se ve el importe pero no de dónde salió, y explicárselo a un
 * cliente que reclama pasa a ser un ejercicio de arqueología». Por eso no se
 * pintan como dos columnas numéricas sueltas sino como la fracción que son —«18
 * de 31 días»— y por eso su ausencia se dice en voz alta en vez de dejar la celda
 * en blanco.
 *
 * <p><b>Los tres eslabones de la cadena de §3.3 viven en tres campos de aquí</b>,
 * y son la razón de que este DTO esté atado al contrato en `api.contract.ts`: si
 * el backend renombrara uno, el enlace no fallaría, <b>desaparecería</b>, y la
 * pantalla seguiría respondiendo «no se sabe de dónde salió» con aplomo sobre un
 * cargo que sí lo sabe.
 *
 * <ul>
 *   <li>`billingDocumentId` — en qué cuenta de cobro entró. Es la vuelta hacia
 *       «¿por qué se le facturaron 179.000?».</li>
 *   <li>`amendmentId` — qué otrosí lo abrió. Es el salto a «Historia».</li>
 *   <li>`subscriptionItemId` — qué línea del contrato lo paga. Es el salto a «Lo
 *       contratado».</li>
 * </ul>
 *
 * <p><b>El signo.</b> Un cargo de anulación es <b>negativo</b>: sumado al
 * original da cero y los dos quedan en el expediente. `voidsChargeId` dice a cuál
 * anula. Pintar ese negativo como si fuera un error sería mentir sobre la
 * contabilidad; lleva `ds-amount--neg` <b>y</b> su rótulo textual, nunca solo el
 * color (§5.2).
 */
export interface SubscriptionChargeResponse {
  id: number
  subscriptionId: number
  /** La línea del contrato que lo paga. El salto a «Lo contratado». */
  subscriptionItemId: number | null
  chargeType: SubscriptionChargeType
  description: string
  /** Cuándo se prestó el servicio. NO es cuándo se facturó ni cuándo se cobró. */
  servicePeriodStart: string
  servicePeriodEnd: string
  quantity: number
  unitAmount: number
  /** El importe del cargo. Negativo cuando anula a otro. */
  subtotalAmount: number
  taxRate: number
  taxTreatment: TaxTreatment
  /**
   * Días efectivamente cobrados del periodo. Con `periodDays`, la fracción «18 de
   * 31 días».
   *
   * <p>Nulable, y a propósito: un cargo `RECURRING` cubre el periodo entero y no
   * tiene fracción que enseñar. Declararlo `number` a secas convertiría ese hueco
   * legítimo en un `0 de 0 días` — un dato inventado sobre dinero.
   */
  prorationDays: number | null
  /** Días que tiene el periodo completo. Sin él, el prorrateo no se puede reconstruir. */
  periodDays: number | null
  status: SubscriptionChargeStatus
  /** El otrosí que lo abrió. El salto a «Historia». Nulo en un ciclo recurrente. */
  amendmentId: number | null
  /** La cuenta de cobro en la que entró. Un cargo `PENDING` todavía no tiene ninguna. */
  billingDocumentId: number | null
  /** A qué cargo anula este. Los dos quedan y suman cero. */
  voidsChargeId: number | null
  createdDate: string
}

/**
 * `POST /subscription-payments` — <b>registrar que entró la plata</b>.
 *
 * <p><b>Por qué el alta vive aquí y no en `/cobranza`.</b> W1-E lo dejó fuera a
 * propósito y con este argumento: la ruta resuelve la empresa con
 * `Authz.currentCompanyId()`, así que exige la cabecera `X-Company-Id` y <b>la
 * empresa nunca puede ser implícita</b>. En el feed global de `/cobranza` no hay
 * ninguna empresa en pantalla sobre la que apoyarse; aquí sí — está en la
 * cabecera del expediente, permanente y a la vista en las seis sub-vistas. La
 * restricción del contrato se convierte en una decisión de diseño coherente en
 * vez de en un desplegable de empresas.
 *
 * <p><b>`clientRequestId` se genera con `crypto.randomUUID()` una vez al abrir el
 * formulario</b>, no en cada envío. Es la llave que impide que un doble clic
 * cobre dos veces, y regenerarla por envío la anularía justo cuando sirve. Es el
 * mismo patrón de `CancelSubscriptionModal` (W2-A) y de las cotizaciones (W1-D).
 *
 * <p><b>El pago es independiente de a qué factura se aplique</b>, y por eso este
 * cuerpo <b>no</b> lleva `billingDocumentId`: un cliente puede pagar tres cuentas
 * de cobro de un giro, o abonar la mitad de una. Fundir «registrar el pago» con
 * «aplicarlo a un documento» en una sola operación obligaría a inventar la
 * relación que el modelo separó a propósito.
 *
 * <p>`gateway` + `gatewayReference` son <b>únicos juntos</b>: el mismo aviso de
 * la pasarela recibido dos veces no crea dos pagos. Si el servidor responde
 * conflicto, el mensaje dice «Ese pago ya estaba registrado», no «violación de
 * restricción única» (§4.5).
 *
 * <p>`status` NO está en el cuerpo: lo pone el servidor. Un pago nace `PENDING` y
 * <b>solo los confirmados cuentan como cobro</b>; dejar que el cliente de la API
 * declarase «confirmado» al registrar sería dar por cobrado lo que todavía no lo
 * está.
 */
export interface RegisterSubscriptionPaymentRequest {
  amount: number
  /** ISO 4217, tres letras. El contrato lo declara opcional; esta consola lo manda siempre. */
  currency?: string
  paymentMethod: PaymentMethod
  gateway?: string
  gatewayReference?: string
  /** `yyyy-MM-ddTHH:mm:ss` local. Cuándo entró la plata, no cuándo se registró. */
  receivedAt: string
  /** Llave de idempotencia. Una por apertura del formulario, no por envío. */
  clientRequestId?: string
}

/**
 * Presentación de un tipo de cargo: el rótulo que ve el operador y la definición
 * a la que ese rótulo responde.
 *
 * <p><b>`meaning` no lo pinta hoy ninguna pantalla</b> —la sub-vista del dinero
 * solo enseña los tres verbos—, y aun así tiene que estar escrito: sin él,
 * «Prorrateo» es una palabra que cada quien completa a su manera cuando se la lee
 * a un cliente por teléfono. Es además lo que `subscription-money.spec.ts` barre
 * para que ninguna de estas frases use el vocabulario que §3.4 prohíbe.
 */
export interface ChargeTypePresentation {
  label: string
  meaning: string
}

export const CHARGE_TYPE_PRESENTATION: Record<SubscriptionChargeType, ChargeTypePresentation> = {
  RECURRING: {
    label: 'Recurrente',
    meaning: 'La cuota del periodo completo por lo que estaba contratado desde el primer día.',
  },
  PRORATION: {
    label: 'Prorrateo',
    meaning:
      'La parte del periodo que corresponde a un cambio hecho a mitad de camino. Va siempre con su fracción de días: es lo que permite reconstruir el importe.',
  },
  ONE_TIME: {
    label: 'Único',
    meaning: 'Un cobro que ocurre una sola vez y no se repite el mes siguiente.',
  },
  CREDIT: {
    label: 'Abono',
    meaning: 'Un importe a favor de la empresa. Resta de lo devengado del periodo.',
  },
  DISCOUNT: {
    label: 'Descuento',
    meaning: 'Una rebaja aplicada sobre lo devengado. Resta, y por eso su importe es negativo.',
  },
  // El rótulo NO dice «exceso» ni «penalización»: el excedente solo se cobra a
  // quien contrató el derecho a pasarse del cupo, así que es consumo vendido, no
  // una sanción. Llamarlo penalización en la factura de un cliente que compró
  // justamente esa flexibilidad es una reclamación asegurada.
  OVERAGE: {
    label: 'Excedente',
    meaning:
      'El consumo por encima del cupo contratado, en las suscripciones que compraron el derecho a superarlo. Se cobra por lo efectivamente usado de más, y por eso su importe es positivo.',
  },
}

/**
 * El mismo mapa, <b>a prueba de un tipo de cargo que esta consola no conoce</b>.
 *
 * <p>La unión es cerrada en tiempo de compilación, pero el valor llega por HTTP:
 * basta con que el backend emita un séptimo tipo —o con que el campo no venga—
 * para que el `Record` se indexe a `undefined`, y leer `.label` sobre eso derriba
 * el árbol entero de la pantalla. El tipo no avisa: un `Record` de claves finitas
 * se resuelve como su valor, nunca como `T | undefined`.
 *
 * <p>Todo lo que pinta un cargo —en esta feature y en la del documento de
 * cobro— pasa por aquí, para que el hueco se vea igual en las dos pantallas en
 * vez de resolverse a mano y distinto en cada una. Un guion honesto antes que
 * reventar o inventar un rótulo, igual que `billingCycleLabel()` (R14).
 */
const UNKNOWN_CHARGE_TYPE: ChargeTypePresentation = {
  label: '—',
  meaning: 'Esta consola no conoce este tipo de cargo y no puede decir qué significa.',
}

export function chargeTypePresentation(
  chargeType: SubscriptionChargeType | null | undefined,
): ChargeTypePresentation {
  if (chargeType == null) return UNKNOWN_CHARGE_TYPE
  return CHARGE_TYPE_PRESENTATION[chargeType] ?? UNKNOWN_CHARGE_TYPE
}

/**
 * Presentación de un estado de cargo. Los tres llevan <b>rótulo textual</b>: el
 * tono acompaña, nunca sustituye (§5.2, WCAG §1.4.1).
 */
export interface ChargeStatusPresentation {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
  meaning: string
}

/**
 * <b>Aquí es donde se separan devengar y facturar</b>, y por eso los rótulos no
 * dicen «Pendiente» y «Listo».
 *
 * <p>«Devengado, sin facturar» dice las dos cosas a la vez: el servicio ya se
 * prestó (devengado) y todavía no hay documento (sin facturar). Un «Pendiente» a
 * secas se lee como «no ha pasado nada», que es falso y es justo la confusión que
 * esta pantalla existe para deshacer.
 */
export const CHARGE_STATUS_PRESENTATION: Record<
  SubscriptionChargeStatus,
  ChargeStatusPresentation
> = {
  PENDING: {
    label: 'Devengado, sin facturar',
    variant: 'warning',
    meaning:
      'El servicio ya se prestó y todavía no hay ninguna cuenta de cobro que lo incluya. No es una factura.',
  },
  INVOICED: {
    label: 'Facturado',
    variant: 'neutral',
    meaning:
      'Ya entró en una cuenta de cobro. Facturado no es cobrado: el dinero puede seguir sin entrar.',
  },
  VOIDED: {
    label: 'Anulado',
    variant: 'neutral',
    meaning:
      'Se anuló con un cargo negativo. Los dos quedan en el expediente y suman cero: anular no borra.',
  },
}

/**
 * El mismo mapa, <b>a prueba de un estado que esta consola no conoce</b>, por la
 * misma razón que `chargeTypePresentation()`.
 *
 * <p>El tono de respaldo es <b>neutro</b> a propósito: pintar de `warning` o de
 * `danger` un estado del que no se sabe nada afirmaría sobre el dinero algo que
 * nadie ha comprobado, y el color es lo único que aquí no lleva rótulo que lo
 * corrija.
 */
const UNKNOWN_CHARGE_STATUS: ChargeStatusPresentation = {
  label: '—',
  variant: 'neutral',
  meaning: 'Esta consola no conoce este estado de cargo y no puede decir qué significa.',
}

export function chargeStatusPresentation(
  status: SubscriptionChargeStatus | null | undefined,
): ChargeStatusPresentation {
  if (status == null) return UNKNOWN_CHARGE_STATUS
  return CHARGE_STATUS_PRESENTATION[status] ?? UNKNOWN_CHARGE_STATUS
}

/**
 * Presentación de la clase de un documento de cobro.
 *
 * <p><b>Una nota crédito NO se pinta en rojo con un menos.</b> Los importes de un
 * documento son <b>siempre positivos</b> y el signo lo da su tipo (§3.5): pintar
 * un `CREDIT_NOTE` como si fuera una deuda es mentir sobre la contabilidad en la
 * dirección contraria. Por eso los tres van en `neutral` y lo que los distingue
 * es la palabra, no el color.
 */
export const DOCUMENT_KIND_PRESENTATION: Record<DocumentKind, ChargeTypePresentation> = {
  INVOICE: {
    label: 'Cuenta de cobro',
    meaning: 'Suma a lo que la empresa debe.',
  },
  CREDIT_NOTE: {
    label: 'Nota crédito',
    meaning:
      'Resta de lo que la empresa debe: corrige a la baja un documento anterior. Su importe se escribe en positivo; lo que resta lo dice su tipo, no un signo menos.',
  },
  DEBIT_NOTE: {
    label: 'Nota débito',
    meaning: 'Suma sobre un documento anterior: corrige al alza.',
  },
}

/**
 * El mismo mapa, <b>a prueba de una clase de documento que esta consola no
 * conoce</b>. `documentKind` llega por HTTP y su rótulo alimenta un distintivo de
 * la tabla de documentos: leer `.label` sobre `undefined` derriba la sub-vista.
 *
 * <p>Un guion honesto antes que inventar la clase de un documento contable, que es
 * el dato del que cuelga el signo de su importe.
 */
const UNKNOWN_DOCUMENT_KIND: ChargeTypePresentation = {
  label: '—',
  meaning: 'Esta consola no conoce esta clase de documento y no puede decir qué significa.',
}

export function documentKindPresentation(
  documentKind: DocumentKind | null | undefined,
): ChargeTypePresentation {
  if (documentKind == null) return UNKNOWN_DOCUMENT_KIND
  return DOCUMENT_KIND_PRESENTATION[documentKind] ?? UNKNOWN_DOCUMENT_KIND
}

/**
 * El estado de emisión de un documento, con los rótulos <b>literales</b> de
 * `BillingDocumentsTable.vue:60-72` (W1-E).
 *
 * <p>§4.5 dice de esos mapas que «ya son correctos y <b>no se cambian</b>», así
 * que aquí se reproducen palabra por palabra en vez de escribir una segunda
 * versión: dos rótulos distintos para el mismo estado en dos pantallas de la
 * misma consola es cómo un operador acaba creyendo que son dos cosas.
 *
 * <p>⚠️ <b>Esto es una copia, y una copia es deuda.</b> Los originales viven
 * dentro del `<script setup>` de un SFC, así que no se pueden importar; hoistarlos
 * a `billing-operations.types.ts` obligaría a tocar un fichero de una tarea ya
 * cerrada y a mover su prueba. Queda abierto como issue en vez de resolverse a
 * medias.
 */
export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  DRAFT: 'Borrador',
  AWAITING_EXTERNAL: 'Pendiente de factura externa',
  EXTERNAL_REGISTERED: 'Factura externa registrada',
  VOIDED: 'Anulado',
}

/** Los tonos de W1-E, también literales. El rótulo textual va siempre al lado (§5.2). */
export const ISSUE_STATUS_VARIANT: Record<
  IssueStatus,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  DRAFT: 'neutral',
  AWAITING_EXTERNAL: 'warning',
  EXTERNAL_REGISTERED: 'success',
  VOIDED: 'danger',
}
