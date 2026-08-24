import type { SubscriptionStatus } from './subscriptions-admin.types'

/**
 * Los dos documentos inmutables de `/historia` (§3.3 y §4.4.2, tarea W2-C).
 *
 * <p><b>Ninguno de los dos tiene ruta de escritura desde esta consola.</b> Un
 * otrosí lo emite el backend como efecto de una operación sobre el contrato
 * —añadir una línea, cambiar una cantidad, dar de baja— y una fila de bitácora
 * solo se inserta. No hay `PUT`, no hay `DELETE` y no hay `PATCH`: por eso aquí
 * no vive ningún tipo de petición, y por eso la pantalla que los pinta no tiene
 * un solo control de formulario.
 *
 * <p><b>La atadura al contrato (TR-01) vive en `src/types/api.contract.ts`</b>,
 * con los otros noventa tipos. Se intentó declararla aquí —`MatchesContract` y
 * `Schemas` están exportados, así que compila igual— para no tocar un fichero que
 * las cinco sub-vistas de la onda 2 necesitan a la vez; no vale:
 * `tests/unit/api-contract.spec.ts` lee <b>solo</b> ese fichero para comprobar la
 * cobertura, y una atadura escrita en otro sitio le resulta invisible. La
 * conclusión práctica es que `api.contract.ts` es un punto de serialización
 * inevitable de esta onda y queda anotado como issue.
 *
 * <p>Importa especialmente en una pantalla de auditoría: aquí no se escribe nada,
 * así que un campo renombrado en el backend no daría un 400 con el operador
 * delante — daría un `undefined` pintado como `—`, y una firma o un importe que
 * desaparecen en silencio de la película del contrato son peores que un error.
 */

/**
 * Los ocho tipos de otrosí del contrato.
 *
 * <p>⚠️ `SUSPEND` es <b>una suspensión de facturación</b>, no un corte de acceso.
 * El rótulo está fijado en §3.4.1 y no se improvisa: no existe ni existirá un
 * estado de corte total de acceso, así que ninguna palabra de esta pantalla puede
 * sugerir que sí. El mapa de rótulos vive en `subscriptionHistoryText.ts` y una
 * prueba unitaria barre las palabras prohibidas sobre él.
 */
export type SubscriptionAmendmentType =
  | 'ADD_ITEM'
  | 'REMOVE_ITEM'
  | 'CHANGE_QUANTITY'
  | 'CHANGE_CYCLE'
  | 'SUSPEND'
  | 'REACTIVATE'
  | 'CANCEL'
  | 'PRICE_LIST_MIGRATION'

/**
 * Un otrosí: el documento que registra <b>un</b> cambio del contrato.
 * `GET /subscriptions/{id}/amendments`.
 *
 * <p><b>Las dos firmas son excluyentes y el modelo las separa a propósito.</b>
 * `requestedByEmployeeId` es un empleado de la clínica pidiendo un cambio sobre
 * su propio contrato; `requestedBySystemUserId` es alguien de la plataforma
 * actuando sobre el contrato de un tercero. La responsabilidad es distinta y por
 * eso son dos columnas y no una con un discriminador. El controller las deriva
 * del principal (`authz.currentEmployeeIdOrNull()` /
 * `authz.currentSystemUserIdOrNull()`), así que para un mismo otrosí una de las
 * dos es siempre `null`. Que las dos vengan rellenas es un defecto de datos, no
 * un caso de negocio, y la pantalla lo dice en vez de elegir una.
 *
 * <p><b>`prorationAmount` y `monthlyDeltaAmount` no son el mismo número.</b>
 * `monthlyDeltaAmount` es cuánto sube o baja la factura recurrente a partir de
 * ahora; `prorationAmount` es lo que se cobró o acreditó <b>una sola vez</b> por
 * los días que quedaban del periodo. Colapsarlos en un «importe» hace
 * inexplicable la factura del mes siguiente, que es exactamente la pregunta que
 * esta pantalla existe para responder. Se declaran no nulables porque son
 * `@NotNull` en los tres cuerpos que los escriben; aun así, las funciones que los
 * leen toleran `null` — es una pantalla de auditoría y un hueco tiene que
 * cantar como hueco, no reventar la vista.
 *
 * <p>`clientRequestId` es la llave antiduplicados con la que el backend resuelve
 * el doble clic. Se pinta: en una auditoría, poder ver que dos otrosíes distintos
 * comparten origen —o que no lo comparten— es parte de la respuesta.
 */
export interface SubscriptionAmendmentResponse {
  id: number
  companyId: number
  subscriptionId: number
  /** El número del documento, p. ej. `OTR-2026-00042`. Es el titular de la ficha. */
  amendmentNumber: string
  amendmentType: SubscriptionAmendmentType
  /** Cuándo surte efecto. Puede ser futura: un otrosí emitido hoy con efecto el día 1. */
  effectiveDate: string
  reason: string | null
  /** Lo pidió la clínica. Excluyente con `requestedBySystemUserId`. */
  requestedByEmployeeId: number | null
  /** Lo hizo la plataforma. Excluyente con `requestedByEmployeeId`. */
  requestedBySystemUserId: number | null
  /** Lo que se cobró o acreditó **una vez** por el periodo en curso. */
  prorationAmount: number
  /** Cuánto sube (+) o baja (−) la factura **recurrente** a partir de ahora. */
  monthlyDeltaAmount: number
  quoteId: number | null
  clientRequestId: string | null
  /** Cuándo quedó registrado en el expediente. Es el eje de la línea de tiempo. */
  createdDate: string
}

/**
 * Una fila de la bitácora de estados: `GET /subscriptions/{id}/status-history`.
 *
 * <p>Es la que responde en un segundo la pregunta que si no hay que deducir de
 * los pagos: <i>«¿por qué esta cuenta está en solo lectura?»</i>. Solo se inserta
 * —el propio adaptador del backend lo dice: «Solo anade y lee. La bitacora no se
 * actualiza ni se borra»—, así que se pinta como hecho y nunca como campo.
 *
 * <p>`fromStatus` es nulable: la primera fila de un contrato no viene de ningún
 * estado anterior. `reason` es el único sitio donde queda escrito <b>por qué</b>
 * se movió la cuenta, y por eso la interfaz lo exige al provocar la transición
 * aunque el contrato lo permita vacío.
 */
export interface SubscriptionStatusChangeResponse {
  id: number
  companyId: number
  subscriptionId: number
  /** `null` en el alta del contrato: no venía de ningún estado. */
  fromStatus: SubscriptionStatus | null
  toStatus: SubscriptionStatus
  reason: string | null
  /** Cuándo ocurrió la transición. Es el eje de la línea de tiempo para esta entrada. */
  occurredAt: string
  /** Texto libre que el backend guarda tal cual; puede venir vacío. */
  actor: string | null
  createdDate: string
}
