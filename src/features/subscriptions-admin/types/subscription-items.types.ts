import type {
  CapacityUnit,
  ItemType,
  TaxTreatment,
} from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Las líneas de lo contratado (§3.3 de
 * `docs/ux/suscripciones-consola-especificacion.md`, tarea W2-B).
 *
 * <p><b>Un contrato es un expediente que crece, no un registro con campos.</b>
 * Dar de baja un módulo no borra la línea: le escribe `effectiveTo`. Por eso aquí
 * no hay ningún `UpdateSubscriptionItemRequest` y no lo habrá: la ruta no existe.
 * Cambiar de cantidad —o de precio— <b>abre una línea sucesora</b> y cierra la
 * anterior, que se queda en el expediente.
 *
 * <p>Los tres enums del catálogo (`ItemType`, `CapacityUnit`, `TaxTreatment`) se
 * importan de `commercial-catalog` en vez de reescribirse: son el mismo enum de
 * Java y el catálogo es su dueño. Es la misma decisión que tomó
 * `quote-catalog.store.ts` con el cliente de API de esa feature.
 */

/** Por qué nació la línea. Es historia del contrato, no un estado que se cambie. */
export type SubscriptionItemOrigin =
  'INITIAL' | 'ADDON' | 'QUANTITY_CHANGE' | 'REMOVAL' | 'MIGRATION'

/**
 * Una línea del contrato, con su tramo de vigencia `[effectiveFrom, effectiveTo)`.
 *
 * <p><b>`unitAmount`, `includedQuantity` y `taxRate` van congelados.</b> Son la
 * copia de lo que decía la tarifa el día en que se firmó la línea, no una
 * referencia viva al catálogo: si mañana sube el precio, esta línea sigue
 * cobrando lo pactado. Esa es la razón de que la consola <b>no ofrezca editar el
 * precio en ninguna parte</b> — la operación no existe; cambiar de precio es
 * cerrar la línea y abrir otra.
 *
 * <p>`effectiveTo` es <b>exclusiva</b>: el día escrito ya NO está cubierto. Lo fija
 * `EffectivePeriod` en el backend, y es lo que permite que la línea que cierra el
 * 30 y la que abre el 30 no se solapen ni dejen hueco. El criterio de vigencia
 * que se deriva de aquí vive en un solo sitio de este repositorio:
 * `composables/subscriptionItemLifecycle.ts`.
 *
 * <p>`billableQuantity` es lo que de verdad se cobra —`quantity` menos lo
 * incluido—, y por eso se pinta al lado de `quantity` en vez de sustituirla: la
 * pregunta «tengo 10 usuarios y me cobran 7» solo se responde viendo las dos.
 */
export interface SubscriptionItemResponse {
  id: number
  companyId: number
  subscriptionId: number
  catalogItemId: number
  itemCode: string
  itemName: string
  itemType: ItemType
  capacityUnit: CapacityUnit | null
  /**
   * Tramo de la tarifa escalonada del que salió la línea (D-66), congelado como el resto.
   * `tierMax` nulo es el último tramo. Es lo que explica dos líneas del mismo artículo a
   * precios distintos dentro del mismo contrato.
   */
  tierMin: number
  tierMax: number | null
  includedQuantity: number
  taxTreatment: TaxTreatment
  quantity: number
  billableQuantity: number
  unitAmount: number
  /**
   * El descuento pactado, congelado con la línea igual que `unitAmount`. Antes solo existía
   * en la oferta y se perdía al firmar: el expediente enseñaba el precio de lista y no había
   * forma de explicar el importe facturado sin volver a la cotización de origen.
   */
  discountPercent: number
  discountAmount: number
  /** D-86: con permanencia el IVA sale de `taxableBase`, no del importe rebajado. */
  discountIsConditional: boolean
  taxRate: number
  /** Base real de liquidación del impuesto. Con `discountIsConditional` NO es el rebajado. */
  taxableBase: number
  effectiveFrom: string
  effectiveTo: string | null
  origin: SubscriptionItemOrigin
  createdAmendmentId: number | null
  endedAmendmentId: number | null
  createdDate: string
  enabled: boolean
}

/**
 * La línea que se firma al añadir un artículo.
 *
 * <p><b>Solo selección: qué artículo, cuánta cantidad y desde cuándo.</b> Hasta la
 * incidencia de dinero que cerró esto, el cuerpo llevaba también `itemCode`,
 * `itemName`, `itemType`, `capacityUnit`, `includedQuantity`, `taxTreatment`,
 * `unitAmount` y `taxRate` — es decir, el precio viajaba en la petición y el
 * servicio lo persistía tal cual. Un cliente que mandara `unitAmount: 0` abría
 * la línea gratis; uno que mandara `includedQuantity: 9999` movía el techo del
 * contador. El servidor ahora <b>resuelve esos siete campos contra la tarifa
 * vigente del propio contrato</b> (`subscription.priceListId` + su ciclo) y
 * <b>rechaza lo que venga en el cuerpo</b> — de ahí que el tipo del campo `line`
 * de {@link AddSubscriptionItemRequest} pasara de `SubscriptionItemLineRequest`
 * (el DTO viejo, con los siete campos) a este `RequestedSubscriptionItemRequest`.
 *
 * <p>La consola sigue enseñando el precio antes de firmar — eso no cambia, es
 * lo que hace que el operador sepa qué está aceptando — pero lo lee de
 * `useSubscriptionItemCatalog().findPrice(...)`, que resuelve contra el mismo
 * catálogo/tarifa que después valida el servidor. No lo compone esta pantalla
 * ni lo manda: es una lectura, no una fuente.
 *
 * <p>`effectiveTo` se declara porque el contrato lo trae, y esta consola
 * <b>no lo envía</b>: una línea nace abierta. Una línea que nace con fecha de fin
 * es una baja programada, y eso se hace con «Dar de baja», que deja su otrosí.
 */
export interface RequestedSubscriptionItemRequest {
  catalogItemId: number
  quantity: number
  effectiveFrom?: string
  effectiveTo?: string
}

/**
 * `POST /subscriptions/{id}/items` — añadir un artículo. Responde <b>201</b>.
 *
 * <p>`clientRequestId` se genera con `crypto.randomUUID()` <b>una vez al abrir el
 * modal</b>, no en cada envío: es la llave de replay que hace que «dos clics en
 * "Añadir" no generen dos cobros». Regenerarla al enviar la anularía justo cuando
 * sirve.
 *
 * <p><b>El cuerpo no lleva importes.</b> `prorationAmount` y `monthlyDeltaAmount` viajaban aquí
 * y el servicio los persistía tal cual, es decir: el importe del expediente lo dictaba quien
 * mandaba la petición, y esta consola —que no los puede calcular— se veía obligada a enviar cero.
 * Desde la incidencia #386 los calcula el servidor con `ProrationCalculator`, sobre el periodo de
 * facturación en curso y la fecha efectiva. Mandarlos ya no es posible, así que el issue B-7 (un
 * endpoint de previsualización de prorrateo solo para poder rellenarlos) deja de hacer falta.
 * El lado de lectura no cambia: `SubscriptionAmendmentResponse` sigue trayendo los dos, ahora con
 * números de verdad en vez de los ceros que escribía esta pantalla.
 */
export interface AddSubscriptionItemRequest {
  clientRequestId: string
  effectiveDate: string
  reason?: string
  quoteId?: number
  line: RequestedSubscriptionItemRequest
}

/**
 * `POST /subscriptions/{id}/items/quantity` — cambiar la cantidad. Responde
 * <b>201</b>, y ese 201 es la enseñanza: <b>no edita la línea, cierra una y abre
 * otra</b>. Lo que vuelve es la línea <i>sucesora</i>, no la que se pidió cambiar.
 *
 * <p>La sucesora arrastra `unitAmount`, `includedQuantity` y `taxRate` intactos.
 * Por eso este cuerpo no los lleva: la cantidad es lo único que cambia.
 */
export interface ChangeSubscriptionItemQuantityRequest {
  subscriptionItemId: number
  newQuantity: number
  clientRequestId: string
  effectiveDate: string
  reason?: string
}

/**
 * `PATCH /subscriptions/{id}/items/remove` — dar de baja.
 *
 * <p><b>El nombre miente y se conserva a propósito</b>, porque es el del contrato
 * (`removeItem`, `RemoveSubscriptionItemRequest`) y quien siga la llamada tiene
 * que encontrarlo. Lo que hace es escribir `effectiveTo`: <b>no borra nada</b>. La
 * línea se queda en el expediente y los datos de la empresa pasan a solo lectura.
 * Todo texto que esta consola le enseña al operador dice «dar de baja», nunca
 * «eliminar».
 */
export interface RemoveSubscriptionItemRequest {
  subscriptionItemId: number
  clientRequestId: string
  effectiveDate: string
  reason?: string
}
