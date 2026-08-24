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
  includedQuantity: number
  taxTreatment: TaxTreatment
  quantity: number
  billableQuantity: number
  unitAmount: number
  taxRate: number
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
 * <p><b>Ninguno de estos campos lo teclea el operador.</b> `itemCode`, `itemName`,
 * `itemType` y `capacityUnit` salen del artículo del catálogo; `unitAmount`,
 * `taxRate`, `taxTreatment` e `includedQuantity` salen del precio publicado de la
 * tarifa que el contrato tiene aplicada (`subscription.priceListId`). Lo único que
 * se elige es <b>qué artículo</b>, <b>cuánta cantidad</b> y <b>desde cuándo</b>.
 *
 * <p>Es la consecuencia directa de que el precio vaya congelado: un campo de
 * importe editable aquí sería exactamente la operación «editar el precio» que
 * §3.3 dice que no existe, colada por la puerta del alta.
 *
 * <p>`effectiveTo` se declara porque el contrato lo trae, y esta consola
 * <b>no lo envía</b>: una línea nace abierta. Una línea que nace con fecha de fin
 * es una baja programada, y eso se hace con «Dar de baja», que deja su otrosí.
 */
export interface SubscriptionItemLineRequest {
  catalogItemId: number
  itemCode: string
  itemName: string
  itemType: ItemType
  capacityUnit?: CapacityUnit | null
  includedQuantity: number
  taxTreatment: TaxTreatment
  quantity: number
  unitAmount: number
  taxRate: number
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
  line: SubscriptionItemLineRequest
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
