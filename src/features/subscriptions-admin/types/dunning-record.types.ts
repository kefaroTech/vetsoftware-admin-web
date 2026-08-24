import type {
  DunningChannel,
  DunningEventType,
} from '@/features/billing-operations/types/billing-operations.types'

/**
 * `/cobranza` — el expediente de mora de <b>un</b> contrato (§4.4.2, tarea W2-F).
 *
 * <p><b>Los tipos de la respuesta no se reescriben aquí: se reexportan.</b>
 * `DunningEventResponse` y sus dos resúmenes ya existen en
 * `features/billing-operations/types` desde W1-E, ya están atados al contrato en
 * `api.contract.ts` y ya tienen sus rótulos en castellano. Declarar una segunda
 * copia sería exactamente el defecto que esta pantalla trata de evitar: que dos
 * pantallas del mismo dominio se lean distinto. Se comparte el tipo <b>y el
 * vocabulario</b>; lo que no se comparte es la forma de leerlos, y eso se explica
 * en `DunningTimeline.vue`.
 *
 * <p>Lo único propio de esta tarea es el <b>cuerpo de escritura</b>: W1-E no lo
 * declaró porque `POST /dunning-events` resuelve la empresa con
 * `authz.currentCompanyId()` y por tanto exige la cabecera `X-Company-Id` (§1.1).
 * Su sitio es el expediente, donde la empresa está a la vista, y no el feed
 * global.
 */
export type {
  DunningBillingDocumentSummary,
  DunningChannel,
  DunningEventResponse,
  DunningEventType,
  DunningSubscriptionSummary,
} from '@/features/billing-operations/types/billing-operations.types'

/**
 * Anotar un hito del expediente. Es la <b>única</b> escritura de la pantalla, y
 * es un alta: la bitácora no tiene `PUT` ni `DELETE`, y esa ausencia es la
 * política — `DunningEventController` lo dice por escrito.
 *
 * <p>Invariantes que el dominio comprueba y que este formulario tiene que
 * comprobar antes, para que el operador no descubra la regla con un 400 delante:
 *
 * <ul>
 *   <li>`channel` es <b>obligatorio</b> cuando `eventType` es `REMINDER_SENT`
 *       (espejo de `chk_dunning_events_reminder_channel`). Un recordatorio sin
 *       canal no demuestra nada ante una reclamación, que es justo para lo que
 *       existe la tabla.</li>
 *   <li>`daysOverdue` no puede ser negativo.</li>
 *   <li>`detail` no pasa de 255 caracteres.</li>
 * </ul>
 *
 * <p>`occurredAt` es opcional en el contrato —el servidor pone la hora actual si
 * llega vacío— pero este formulario lo manda siempre: se anota una llamada de
 * ayer, y dejar que el servidor ponga «ahora» convertiría la prueba en una
 * fecha equivocada.
 *
 * <p>`billingDocumentId` viaja como `null` desde esta pantalla; el porqué está en
 * `RecordDunningEventModal.vue`.
 */
export interface RecordDunningEventRequest {
  subscriptionId: number
  billingDocumentId: number | null
  eventType: DunningEventType
  daysOverdue: number | null
  channel: DunningChannel | null
  detail: string | null
  /** `yyyy-MM-ddTHH:mm:ss` — `LocalDateTime` de Java, sin zona. */
  occurredAt: string | null
}

/**
 * Lo que el operador teclea, antes de convertirse en el cuerpo de la petición.
 *
 * <p>Todo `string` a propósito: son los valores crudos de los controles, y
 * convertirlos antes de validarlos es lo que hace que un «12a» se mande como
 * `NaN` o se pierda en silencio. La conversión vive en `toRecordRequest`, una
 * sola vez y después de validar.
 */
export interface DunningEventDraft {
  eventType: DunningEventType
  /** `yyyy-MM-ddTHH:mm`, tal cual lo devuelve `<input type="datetime-local">`. */
  occurredAt: string
  channel: DunningChannel | ''
  daysOverdue: string
  detail: string
}
