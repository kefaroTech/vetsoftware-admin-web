import type { RouteRecordRaw } from 'vue-router'
import type { SubscriptionStatus } from './subscriptions-admin.types'

/**
 * El expediente del contrato (§4.4.2 de
 * `docs/ux/suscripciones-consola-especificacion.md`, tarea W2-A).
 *
 * <p>Los dos cuerpos de escritura viven aquí y no en el cliente de API, con el
 * nombre exacto del esquema del contrato, para que `MatchesContract` los ate en
 * `src/types/api.contract.ts` (TR-01): si el backend renombra un campo, esto
 * deja de compilar en vez de mandar un cuerpo que el servidor rechaza.
 */

/**
 * `PATCH /subscriptions/{id}/status`.
 *
 * <p>`status` es un enum de seis valores, pero <b>la interfaz no expone un
 * desplegable con los seis</b> (§3.4.2): expone transiciones con nombre según
 * el estado actual. Ver `SUBSCRIPTION_STATUS_TRANSITIONS`.
 *
 * <p>`reason` es opcional en el contrato y <b>obligatorio en la interfaz</b>:
 * el modelo lo describe como «información de negocio, no burocracia», y es la
 * única fuente que explica por qué una cuenta cambió de estado.
 *
 * <p>`actor` NO lo escribe el operador. El controller ya deriva del principal
 * quién firma la enmienda (`authz.currentSystemUserIdOrNull()`); un campo de
 * autoría que rellena quien actúa no prueba nada. Se declara porque el contrato
 * lo tiene, y esta consola no lo envía.
 */
export interface ChangeSubscriptionStatusRequest {
  status: SubscriptionStatus
  reason?: string
  actor?: string
}

/**
 * `PATCH /subscriptions/{id}/cancel`, con sus <b>dos</b> fechas (§3.4.4).
 *
 * <p>`requestedAt` es cuándo se pidió y `effectiveDate` cuándo surte efecto: el
 * cliente cancela el 10 y se va el 30, que es lo que ya pagó. El backend no
 * cambia el estado al recibirla —el contrato sigue vigente hasta la fecha
 * efectiva— y por eso el texto del modal las separa en vez de fundirlas.
 *
 * <p>`clientRequestId` se genera con `crypto.randomUUID()` <b>una vez al abrir
 * el modal</b>, no en cada envío: es lo que hace que un doble clic no emita dos
 * otrosíes de baja (`CancelSubscriptionService` lo usa como llave de replay).
 *
 * <p><b>El cuerpo no lleva importes.</b> `prorationAmount` y `monthlyDeltaAmount` eran
 * `@NotNull` y el servicio guardaba literalmente lo que se le mandara, así que esta consola
 * —que no tenía con qué calcularlos— enviaba cero en un dato de dinero del expediente. Desde la
 * incidencia #386 el abono por los días que quedaban sin devengar lo calcula
 * `ProrationCalculator` sobre las líneas vigentes del contrato, y la petición ya no los admite.
 * El lado de lectura no cambia: el otrosí de baja sigue exponiéndolos, ahora con el importe real.
 */
export interface CancelSubscriptionRequest {
  requestedAt: string
  effectiveDate: string
  reason?: string
  clientRequestId: string
}

/**
 * Una transición con nombre, no un valor de enum en un `<select>` (§3.4.2).
 *
 * <p>Cada una lleva escrita su consecuencia porque es lo que se lee antes de
 * confirmar. `policyNote` solo lo llevan las transiciones que tocan la política
 * innegociable —no existe corte total de acceso— y su texto es literal.
 */
export interface SubscriptionStatusTransition {
  to: SubscriptionStatus
  /** El verbo, tal como lo ve el operador. Fijado por §3.4.2: no se improvisa. */
  label: string
  /** Qué cambia para la empresa. Se pinta en el modal antes del campo de motivo. */
  consequence: string
  /** Aviso de política, literal, en `ds-banner--info`. */
  policyNote?: string
  /** Jerarquía visual: una primaria por estado, el resto en `ds-btn--ghost`. */
  primary?: boolean
}

/**
 * Contrato de una sub-vista del expediente — <b>el punto de extensión de las
 * tareas W2-B … W2-F</b>.
 *
 * <p>Cada sub-vista se declara en su propio fichero
 * `views/record/<segmento>.tab.ts` y el módulo de rutas los descubre solo (ver
 * `src/router/routes/subscriptions-admin.routes.ts`). Así cinco instancias
 * pueden trabajar a la vez sin que ninguna edite el fichero de otra: nadie toca
 * `router/index.ts`, nadie toca el módulo de rutas, nadie toca la barra de
 * pestañas.
 */
export interface SubscriptionRecordTab {
  /** Último segmento de la ruta: `resumen`, `contratado`, `historia`… */
  segment: string
  /** Nombre de la ruta hija. Convención: `subscription-record-<segmento>`. */
  routeName: string
  /** Rótulo de la pestaña. Es también el que entra en `document.title`. */
  label: string
  /** Orden en la barra. Los de §4.4.2: 1 resumen … 6 cobranza. */
  order: number
  /**
   * Carga diferida de la vista. Un SFC por sub-vista (§2.2, techo de 500 líneas).
   *
   * <p>`NonNullable` y no `RouteRecordRaw['component']` a secas: esa propiedad
   * admite `null`/`undefined` —hay rutas que solo agrupan hijas— y una pestaña sin
   * componente no es una pestaña. Sin el `NonNullable`, el objeto de ruta que se
   * construye con esto no encaja en `RouteRecordRaw` y `vue-tsc` lo rechaza.
   */
  component: NonNullable<RouteRecordRaw['component']>
}
