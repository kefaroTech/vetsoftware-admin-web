import {
  DUNNING_CHANNEL_LABEL,
  DUNNING_EVENT_LABEL,
} from '@/features/billing-operations/types/billing-operations.types'
import { formatDateTime, parseLocalDateTime } from './entitlementText'
import type {
  DunningChannel,
  DunningEventDraft,
  DunningEventResponse,
  DunningEventType,
  RecordDunningEventRequest,
} from '../types/dunning-record.types'

/**
 * <b>Todo el vocabulario y toda la lectura de `/cobranza`, en funciones puras y
 * en un solo sitio</b> (§4.4.2, tarea W2-F).
 *
 * <p>Vive aparte del SFC por el mismo motivo que `entitlementText.ts`: es lo que
 * la prueba unitaria puede barrer. La política de §3.4 —no existe ni existirá un
 * estado que le quite a una empresa la consulta de su propia información— no es
 * una preferencia de estilo, es riesgo legal, y <b>esta es literalmente la
 * pantalla de la cobranza</b>: es donde más fácil se cuela la palabra
 * equivocada. Con los rótulos aquí, `tests/unit/subscription-dunning.spec.ts`
 * los recorre todos —y además el fuente en crudo de la vista y de sus tres
 * componentes, que es donde acaban las frases que nadie exportó— y rompe el
 * build antes de que lleguen a la pantalla de un operador.
 *
 * <p><b>Los rótulos de los cinco hitos y de los cinco canales NO se declaran
 * aquí.</b> Se importan de `billing-operations`, que es donde W1-E los dejó: dos
 * pantallas del mismo dominio que se leyeran distinto es el defecto que este
 * diseño trata de evitar, y la única forma de que no deriven nunca es que sean
 * literalmente la misma constante. Lo que sí es propio de esta pantalla es la
 * <b>lectura de la secuencia</b>, que el feed global no puede dar porque allí
 * cada fila es de una empresa distinta.
 */

const DAY_MS = 86_400_000

/** Tope duro del servidor (`Pages.MAX_SIZE`). Ver `useDunningRecord`. */
export const DUNNING_PAGE_SIZE = 200

/** Lo que el dominio admite en `detail` (`DunningEvent.MAX_DETAIL_LENGTH`). */
export const MAX_DETAIL_LENGTH = 255

/** Mínimo de la interfaz: un detalle de tres letras no prueba nada. */
export const MIN_DETAIL_LENGTH = 10

/**
 * El sello de la bitácora. Es la primera frase de la pantalla porque explica por
 * qué no hay ni un solo campo editable en ella.
 */
export const LEDGER_SEAL =
  'Esto es una bitácora: los hitos se anotan y no se editan ni se borran. Un aviso mal anotado se corrige anotando otro, y los dos quedan. Por eso esta pantalla no tiene ningún campo que se pueda cambiar.'

/** Para qué existe la tabla, en las dos cosas prácticas que dice el modelo. */
export const PURPOSE_NOTE =
  'El expediente sirve para dos cosas: demostrar que se avisó antes de restringir la cuenta, y ver qué recordatorio funciona.'

/**
 * Los cuatro hitos que se pueden anotar desde el formulario normal.
 *
 * <p><b>`WRITTEN_OFF` no está, y esa ausencia es el diseño.</b> Declarar una
 * deuda incobrable es una decisión con consecuencias contables, no un valor más
 * de un desplegable: tiene su propio bloque, su propio formulario y su propia
 * confirmación, y no queda a un clic de distancia de anotar una llamada.
 */
export const ANNOTATABLE_EVENT_TYPES = [
  'REMINDER_SENT',
  'GRACE_STARTED',
  'READ_ONLY_APPLIED',
  'REACTIVATED',
] as const satisfies readonly DunningEventType[]

/**
 * Qué significa cada hito, con la política escrita donde se decide.
 *
 * <p>`READ_ONLY_APPLIED` es el que importa: el operador que lo anota es el mismo
 * que se lo va a explicar al cliente por teléfono, y esta frase es la que impide
 * que se lo cuente como otra cosa.
 */
export const EVENT_TYPE_MEANING: Record<DunningEventType, string> = {
  REMINDER_SENT:
    'Se le avisó al cliente. Es el hito que prueba que se avisó, y por eso el canal es obligatorio: un recordatorio sin canal no demuestra nada ante una reclamación.',
  GRACE_STARTED:
    'Empezaron los días de cortesía pactados. La empresa sigue trabajando con normalidad durante ese plazo.',
  READ_ONLY_APPLIED:
    'La empresa pasó a solo lectura: conserva la consulta y la impresión de toda su información —incluida la historia clínica— y deja de poder crear y modificar. Es el máximo grado de restricción que existe.',
  REACTIVATED: 'La cuenta volvió a la normalidad y recuperó el uso completo.',
  WRITTEN_OFF:
    'Se declaró que esta deuda no se va a cobrar. Es una decisión contable y no cambia lo que la empresa puede usar.',
}

/** Opciones del desplegable de hitos, en el orden en que ocurren de verdad. */
export const ANNOTATABLE_EVENT_OPTIONS: { value: string; label: string }[] =
  ANNOTATABLE_EVENT_TYPES.map((value) => ({ value, label: DUNNING_EVENT_LABEL[value] }))

/** «Sin canal» es una opción con nombre, no un hueco: se elige, no se olvida. */
export const NO_CHANNEL_LABEL = 'Sin canal'

export const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: NO_CHANNEL_LABEL },
  ...(Object.keys(DUNNING_CHANNEL_LABEL) as DunningChannel[]).map((value) => ({
    value: value as string,
    label: DUNNING_CHANNEL_LABEL[value],
  })),
]

// --- Dar de baja contable ------------------------------------------------

export const WRITE_OFF_TITLE = 'Dar de baja contable'

export const WRITE_OFF_MEANING =
  'Dar de baja contable declara que esta deuda no se va a cobrar. Es una decisión de contabilidad, y como todo lo de esta pantalla queda anotada para siempre: no se puede borrar ni corregir.'

/**
 * La frase que impide el malentendido más caro de esta pantalla. Quien declara
 * una deuda incobrable puede creer que con eso «cierra» la cuenta del cliente, y
 * no es así ni puede serlo.
 */
export const WRITE_OFF_ACCESS_NOTE =
  'No cambia nada de lo que la empresa puede usar: no le quita nada y no le devuelve nada. Su nivel de uso lo decide el contrato, no esta anotación, y conserva en todo caso la consulta e impresión de toda su información.'

export const WRITE_OFF_RECOVERY_NOTE =
  'Si la deuda se cobra más adelante, se anota una reactivación encima. Esta anotación no se retira.'

/** Rótulo del botón: nombra la acción, no dice «Confirmar» (WCAG §3.3.4). */
export const WRITE_OFF_CONFIRM_LABEL = 'Dar de baja contable'

// --- La lectura de la secuencia ------------------------------------------

/**
 * Días de calendario entre dos marcas de tiempo del backend.
 *
 * <p>Se compara a medianoche local y no por diferencia de instantes: contar por
 * instantes daría «0 días» entre un aviso de anteayer a las 23:50 y una
 * restricción de ayer a las 00:10, y esa cifra es justo la que hay que poder
 * leerle a un cliente que reclama.
 */
export function daysBetween(fromIso: string | null, toIso: string | null): number | null {
  const from = parseLocalDateTime(fromIso)
  const to = parseLocalDateTime(toIso)
  if (!from || !to) return null
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

/**
 * El hueco entre un hito y el anterior. <b>Es contenido, no adorno</b>: la
 * pregunta que responde esta pantalla no es «qué pasó» sino «cuánto margen se le
 * dio», y eso vive entre dos filas, no dentro de una.
 */
export function gapText(previousIso: string | null, currentIso: string | null): string | null {
  const days = daysBetween(previousIso, currentIso)
  if (days === null || days < 0) return null
  if (days === 0) return 'el mismo día'
  return days === 1 ? '1 día después' : `${days} días después`
}

/** Los días de mora de un hito, dichos con palabras y nunca como un número suelto. */
export function overdueText(days: number | null): string {
  if (days == null) return 'Días de mora no anotados'
  if (days === 0) return 'El mismo día del vencimiento'
  return days === 1 ? 'Con 1 día de mora' : `Con ${days} días de mora`
}

export type DunningEvidenceState = 'empty' | 'no-restriction' | 'warned' | 'unwarned'

export interface DunningEvidence {
  state: DunningEvidenceState
  /** Rótulo textual del distintivo. Nunca se comunica solo por color (§5.2). */
  badgeLabel: string | null
  headline: string
  detail: string
}

/**
 * <b>La respuesta a la pregunta por la que se entra aquí</b>, calculada y escrita
 * en vez de dejada para que el lector la arme fila a fila.
 *
 * <p>«¿Se le avisó antes de restringirle la cuenta?» es una pregunta con
 * respuesta binaria y con consecuencias, y una tabla no la responde: la insinúa.
 * Por eso encabeza la pantalla.
 *
 * <p><b>Por qué se puede confiar en el recuento aunque el expediente venga
 * paginado.</b> El servidor ordena `occurredAt ASC` con un desempate total, así
 * que lo primero que llega es siempre el <b>principio</b> de la historia: si el
 * paso a solo lectura está entre lo cargado, todo lo anterior a él también lo
 * está, y el recuento de avisos previos es exacto. Lo que puede quedar fuera es
 * lo posterior, y eso no cambia esta respuesta.
 */
export function dunningEvidence(events: DunningEventResponse[]): DunningEvidence {
  if (events.length === 0) {
    return {
      state: 'empty',
      badgeLabel: 'Sin ningún hito',
      headline: 'Este contrato no tiene ningún hito de cobranza anotado.',
      detail:
        'Si alguien llamó o escribió al cliente por fuera del sistema, anótalo aquí: este expediente es la única prueba de que se avisó.',
    }
  }

  const restrictionIndex = events.findIndex((event) => event.eventType === 'READ_ONLY_APPLIED')
  const restriction = restrictionIndex === -1 ? null : events[restrictionIndex]
  const before = restrictionIndex === -1 ? events : events.slice(0, restrictionIndex)
  const reminders = before.filter((event) => event.eventType === 'REMINDER_SENT')

  if (!restriction) {
    return {
      state: 'no-restriction',
      badgeLabel: null,
      headline: 'Esta cuenta nunca ha pasado a solo lectura.',
      detail:
        reminders.length === 0
          ? 'No hay ningún recordatorio anotado todavía.'
          : `Lleva ${countText(reminders.length, 'recordatorio anotado', 'recordatorios anotados')}.`,
    }
  }

  // El primer aviso previo, si lo hay. Su ausencia ES el caso `unwarned`: el
  // recuento y el guardia son la misma comprobación, así que van juntos.
  const first = reminders[0]

  if (!first) {
    return {
      state: 'unwarned',
      badgeLabel: 'Sin aviso previo',
      headline: `Pasó a solo lectura el ${formatDateTime(restriction.occurredAt)} y no hay ningún aviso anotado antes de esa fecha.`,
      detail:
        'Si el cliente reclama, la prueba de que se le avisó es este expediente, y para esa fecha está vacío. Anota los avisos que se hicieran por fuera del sistema.',
    }
  }

  const margin = daysBetween(first.occurredAt, restriction.occurredAt)
  const marginText =
    margin === null
      ? ''
      : margin === 0
        ? ' — el mismo día'
        : ` — ${margin === 1 ? '1 día' : `${margin} días`} después`

  return {
    state: 'warned',
    badgeLabel: null,
    headline: `Se avisó ${countText(reminders.length, 'vez', 'veces')} antes de pasar a solo lectura.`,
    detail: `El primer aviso fue el ${formatDateTime(first.occurredAt)} y la restricción se aplicó el ${formatDateTime(restriction.occurredAt)}${marginText}.`,
  }
}

/**
 * La segunda razón de ser de la tabla: <b>medir qué recordatorio funciona</b>.
 *
 * <p>Solo cuenta los `REMINDER_SENT`, que son los que salen hacia el cliente; los
 * demás hitos son estados de la cuenta y contarlos aquí inflaría el canal del
 * último aviso. Vacío si no hay ninguno: una cuenta de ceros no es una medida.
 */
export function channelTally(events: DunningEventResponse[]): string {
  const counts = new Map<DunningChannel, number>()
  for (const event of events) {
    if (event.eventType !== 'REMINDER_SENT' || !event.channel) continue
    counts.set(event.channel, (counts.get(event.channel) ?? 0) + 1)
  }
  if (counts.size === 0) return ''
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([channel, count]) => `${DUNNING_CHANNEL_LABEL[channel]} ${count}`)
    .join(' · ')
}

/**
 * Qué aviso precedió a la última vez que la cuenta se puso al día.
 *
 * <p>Es la única señal de eficacia que estos datos permiten sacar sin inventar
 * nada, y se dice como lo que es —<b>un caso, no una estadística</b>—: con un
 * contrato y un puñado de hitos, cualquier porcentaje tendría más autoridad de
 * la que le corresponde.
 */
export function reactivationSignal(events: DunningEventResponse[]): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const reactivation = events[i]
    if (reactivation?.eventType !== 'REACTIVATED') continue
    for (let j = i - 1; j >= 0; j -= 1) {
      const previous = events[j]
      if (previous?.eventType !== 'REMINDER_SENT' || !previous.channel) continue
      const days = daysBetween(previous.occurredAt, reactivation.occurredAt)
      const when =
        days === null
          ? ''
          : days === 0
            ? ', el mismo día'
            : `, ${days === 1 ? '1 día' : `${days} días`} antes`
      return `La última vez que esta cuenta se puso al día, el recordatorio anterior más cercano fue por ${DUNNING_CHANNEL_LABEL[previous.channel]}${when}.`
    }
    return 'La última vez que esta cuenta se puso al día no había ningún recordatorio anotado antes.'
  }
  return null
}

/** Cuándo se declaró incobrable, si se declaró. La última anotación manda. */
export function writtenOffAt(events: DunningEventResponse[]): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]
    if (event?.eventType === 'WRITTEN_OFF') return event.occurredAt
  }
  return null
}

/**
 * «Ocurrió el 3, anotado el 10». Solo se pinta cuando las dos fechas caen en días
 * distintos: un hito anotado a toro pasado es un dato del expediente —dice cuánto
 * se tardó en dejar constancia— y esconderlo debilitaría la prueba.
 */
export function annotatedLateText(event: DunningEventResponse): string | null {
  const days = daysBetween(event.occurredAt, event.createdDate)
  if (days === null || days <= 0) return null
  return `Anotado el ${formatDateTime(event.createdDate)}, ${days === 1 ? '1 día' : `${days} días`} después de ocurrir.`
}

// --- El formulario -------------------------------------------------------

/** `yyyy-MM-ddTHH:mm` en hora local, que es lo que come `<input type="datetime-local">`. */
export function toDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function validateOccurredAt(raw: string, now: Date = new Date()): string {
  if (!raw.trim())
    return 'Indica cuándo ocurrió. Si fue una llamada de ayer, pon la fecha y la hora de ayer, no las de ahora.'
  const parsed = parseLocalDateTime(raw.length === 16 ? `${raw}:00` : raw)
  if (!parsed) return 'Escribe una fecha y una hora válidas, con día, mes, año y hora.'
  if (parsed.getTime() > now.getTime())
    return 'La fecha no puede estar en el futuro: aquí se anota lo que ya ocurrió, no lo que se va a hacer.'
  return ''
}

/**
 * Espejo en la interfaz de `chk_dunning_events_reminder_channel`. El operador
 * tiene que descubrir la regla aquí y no con un 400 delante y el cliente al
 * teléfono, y el mensaje dice qué hacer (§5.6, WCAG §3.3.3).
 */
export function validateChannel(eventType: DunningEventType, channel: DunningChannel | ''): string {
  if (eventType === 'REMINDER_SENT' && !channel)
    return 'Elige por dónde se avisó. Un recordatorio sin canal no sirve como prueba de que se avisó.'
  return ''
}

export function validateDaysOverdue(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (!/^\d+$/.test(value))
    return 'Escribe solo el número de días, sin letras ni signos. Ejemplo: 12.'
  if (Number(value) > 3650)
    return 'Revisa los días de mora: el máximo que admite el campo son 3650, diez años.'
  return ''
}

/**
 * `detail` es obligatorio en la interfaz aunque el contrato lo permita vacío
 * (§4.4.2: «el formulario pide `detail` y no lo deja vacío»). Un aviso sin
 * detalle es una fila que dice que pasó algo y no qué: no prueba nada.
 */
export function validateDetail(raw: string): string {
  const value = raw.trim()
  if (!value)
    return 'Escribe qué se dijo y a quién. Es lo que se lee cuando alguien pregunta seis meses después.'
  if (value.length < MIN_DETAIL_LENGTH)
    return `Escribe al menos ${MIN_DETAIL_LENGTH} caracteres. Ejemplo: llamada a Ana, se compromete a pagar el viernes.`
  if (value.length > MAX_DETAIL_LENGTH)
    return `El detalle no puede pasar de ${MAX_DETAIL_LENGTH} caracteres.`
  return ''
}

/** Misma regla, distinta pregunta: aquí lo que se pide es la justificación contable. */
export function validateWriteOffReason(raw: string): string {
  const value = raw.trim()
  if (!value)
    return 'Escribe por qué se declara incobrable. Es la justificación contable, y no se puede corregir después.'
  if (value.length < MIN_DETAIL_LENGTH)
    return `Escribe al menos ${MIN_DETAIL_LENGTH} caracteres. Ejemplo: empresa liquidada, deuda irrecuperable.`
  if (value.length > MAX_DETAIL_LENGTH)
    return `La justificación no puede pasar de ${MAX_DETAIL_LENGTH} caracteres.`
  return ''
}

/**
 * Del borrador al cuerpo de la petición. <b>Una sola conversión y después de
 * validar</b>: convertir antes es lo que manda un `NaN` sin que nadie se entere.
 *
 * <p>`billingDocumentId` va siempre `null` desde esta pantalla — el porqué está
 * en `RecordDunningEventModal.vue`.
 */
export function toRecordRequest(
  subscriptionId: number,
  draft: DunningEventDraft,
): RecordDunningEventRequest {
  const days = draft.daysOverdue.trim()
  const detail = draft.detail.trim()
  return {
    subscriptionId,
    billingDocumentId: null,
    eventType: draft.eventType,
    daysOverdue: days ? Number(days) : null,
    channel: draft.channel === '' ? null : draft.channel,
    detail: detail || null,
    occurredAt: draft.occurredAt.length === 16 ? `${draft.occurredAt}:00` : draft.occurredAt,
  }
}

function countText(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
