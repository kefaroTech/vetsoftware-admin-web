import { formatDate } from '@/composables/format'
import { businessToday } from '@/features/commercial-catalog/composables/priceListValidity'
import type {
  CompanyTrialGrantResponse,
  CompanyTrialWindowResponse,
  TrialOutcome,
  TrialPolicyOutcome,
} from '../types/trials.types'

/**
 * <b>Situar una prueba en el calendario, y decirlo sin mentir.</b> Todo lo que
 * esta feature sabe de fechas está aquí, en funciones puras: es lo que una
 * prueba unitaria puede barrer sin montar un componente, y lo que hace que la
 * regla del último día esté escrita una sola vez.
 *
 * ── «Hoy» se resuelve en la zona del negocio ─────────────────────────────────
 *
 * `startDate`, `endDate` y `trialEndDate` son `LocalDate` del contrato: fechas
 * civiles sin zona. Compararlas contra el reloj del navegador hace que a un
 * operador conectado desde Madrid (UTC+2) una prueba que termina el 30 se le vea
 * vencida durante las siete horas en las que en Bogotá todavía es día 30 — y al
 * revés. No es un redondeo: es un cliente al que se le corta el acceso un día
 * antes, o un comercial que da por perdida una conversión que aún estaba viva.
 *
 * Por eso no se construye ni un solo `Date` a partir del reloj local: se reusa
 * {@link businessToday} de `commercial-catalog/composables/priceListValidity.ts`,
 * que produce el `yyyy-MM-dd` de `America/Bogota` con `Intl`, y se compara
 * <b>como texto</b> — en ISO, el orden alfabético y el cronológico son el mismo.
 *
 * <b>Se importa y no se copia, a propósito.</b> La zona del negocio es hoy una
 * constante y una limitación conocida (el contrato no publica ningún campo de
 * huso). El día que exista, tiene que haber un solo sitio que cambiar; dos
 * copias de `businessToday` es exactamente cómo el velo de carga acabó durando
 * 300 ms en un front y 420 en el otro. Lo importado es una función pura sin
 * estado: no arrastra store, ni petición, ni ciclo.
 *
 * ── El último día va incluido ────────────────────────────────────────────────
 *
 * El contrato lo dice de `endDate`: «Último día en prueba, incluido». Así que la
 * comparación que decide si una prueba sigue viva es `today <= endDate`, nunca
 * `today < endDate`. Es un `=` y es un día entero de servicio.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Milisegundos de un día. Solo se usa sobre fechas normalizadas a UTC. */
const DAY_MS = 86_400_000

/**
 * `yyyy-MM-dd` → instante UTC de esa medianoche. Es el único `Date` que se
 * construye aquí, y se construye con `Date.UTC` a partir de las tres piezas: sin
 * eso, `new Date('2026-03-08')` en un huso con horario de verano puede caer en
 * el día anterior y la resta de días sale con un día de más o de menos.
 */
function utcMidnight(iso: string): number | null {
  if (!ISO_DATE.test(iso)) return null
  // Los valores por defecto son inalcanzables: el `test` de arriba ya garantiza
  // las tres piezas. Están porque `noUncheckedIndexedAccess` tipa el resultado
  // del `split` como `(number | undefined)[]`, y la alternativa —tres `!`— es un
  // aviso que `--max-warnings=0` convierte en error.
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/**
 * Días que le quedan a una prueba, <b>contando hoy</b>. Una que termina hoy
 * devuelve 1, no 0: hoy todavía se puede trabajar. Una ya vencida devuelve 0.
 *
 * <p>Devuelve `null` si alguna de las dos fechas no es una fecha: un hueco
 * honesto antes que un número inventado.
 */
export function daysLeftInclusive(endDate: string, today: string = businessToday()): number | null {
  const end = utcMidnight(endDate)
  const now = utcMidnight(today)
  if (end == null || now == null) return null
  return Math.max(0, Math.round((end - now) / DAY_MS) + 1)
}

/** `yyyy-MM-dd` + n días, en la misma forma. `null` si la entrada no es una fecha. */
export function addDays(iso: string, days: number): string | null {
  const base = utcMidnight(iso)
  if (base == null) return null
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10)
}

/**
 * En qué punto está una ventana. Son seis y no hay un séptimo; `desconocida` no
 * es un adorno defensivo, es lo que se pinta cuando las fechas no se pueden leer
 * y ni «vigente» ni «vencida» serían ciertas.
 */
export type TrialWindowLevel =
  'futura' | 'vigente' | 'ultimo-dia' | 'vencida' | 'cerrada' | 'desconocida'

export interface TrialWindowState {
  level: TrialWindowLevel
  /** El texto que se pinta. Nunca vacío y nunca comunicado solo por color (WCAG 2.2 §1.4.1). */
  label: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
  /** Días restantes contando hoy. `null` cuando no se puede saber. */
  daysLeft: number | null
}

/**
 * Dónde está esta ventana hoy.
 *
 * <p><b>El orden de las ramas es la regla.</b> Una ventana cerrada a mano lo
 * está aunque sus fechas aún no hayan llegado —cerrar es una decisión y las
 * fechas no la borran—; una ventana cuyo último día ya pasó está vencida aunque
 * el servidor siga diciendo `open`, porque el proceso que la cierra puede no
 * haber corrido todavía y decir «vigente» en esa franja sería prometer un acceso
 * que el backend ya no da.
 */
export function trialWindowState(
  window: CompanyTrialWindowResponse,
  today: string = businessToday(),
): TrialWindowState {
  const start = window.startDate
  const end = window.endDate
  if (!ISO_DATE.test(start ?? '') || !ISO_DATE.test(end ?? '')) {
    return {
      level: 'desconocida',
      label: 'Ventana sin fechas válidas',
      variant: 'neutral',
      daysLeft: null,
    }
  }

  if (window.closedAt !== null) {
    return {
      level: 'cerrada',
      label: `Cerrada antes de tiempo el ${formatDate(window.closedAt)}`,
      variant: 'neutral',
      daysLeft: 0,
    }
  }

  if (today > end) {
    return {
      level: 'vencida',
      label: `Terminó el ${formatDate(end)}, que fue su último día`,
      variant: 'danger',
      daysLeft: 0,
    }
  }

  if (!window.open) {
    return { level: 'cerrada', label: 'Cerrada', variant: 'neutral', daysLeft: 0 }
  }

  if (today < start) {
    return {
      level: 'futura',
      label: `Empieza el ${formatDate(start)}`,
      variant: 'neutral',
      daysLeft: daysLeftInclusive(end, today),
    }
  }

  const left = daysLeftInclusive(end, today)
  if (today === end) {
    return {
      level: 'ultimo-dia',
      label: `Hoy es el último día, y cuenta entero: la prueba sigue viva hasta el final del ${formatDate(end)}`,
      variant: 'warning',
      daysLeft: left,
    }
  }

  return {
    level: 'vigente',
    label: `Quedan ${left} días, contando hoy. El último, incluido, es el ${formatDate(end)}`,
    variant: 'success',
    daysLeft: left,
  }
}

/** Lo que la política dice que debe pasar al terminar. Intención, no resultado. */
export const TRIAL_POLICY_OUTCOME_LABEL: Record<TrialPolicyOutcome, string> = {
  CONVERT_TO_PAID: 'Pasa a facturarse',
  LIMITED: 'Queda limitado',
  READ_ONLY: 'Queda en solo consulta',
}

/** Lo que de verdad pasó. Es el desenlace. */
export const TRIAL_OUTCOME_LABEL: Record<TrialOutcome, string> = {
  CONVERTED: 'Se convirtió: hoy se factura',
  LIMITED: 'Quedó limitado',
  READ_ONLY: 'Quedó en solo consulta',
  ABANDONED: 'Se abandonó',
}

export const TRIAL_OUTCOME_VARIANT: Record<TrialOutcome, 'success' | 'warning' | 'danger'> = {
  CONVERTED: 'success',
  LIMITED: 'warning',
  READ_ONLY: 'warning',
  ABANDONED: 'danger',
}

export interface TrialGrantState {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
  /**
   * `true` cuando la prueba ya terminó y nadie ha escrito su desenlace. Es el
   * caso que el barrido de vencimientos existe para encontrar.
   */
  awaitingOutcome: boolean
}

/**
 * El desenlace de una concesión, o la constancia de que todavía no lo hay.
 *
 * <p><b>Un `outcome` nulo no se rellena con `ABANDONED`.</b> «Vencida sin
 * desenlace» y «abandonada» se ven igual en una tabla y solo una de las dos es
 * una decisión de alguien. La primera es trabajo pendiente; la segunda es una
 * venta perdida ya asumida, y confundirlas hace que nadie llame al cliente.
 */
export function trialGrantState(
  grant: CompanyTrialGrantResponse,
  today: string = businessToday(),
): TrialGrantState {
  if (grant.outcome !== null) {
    return {
      label: TRIAL_OUTCOME_LABEL[grant.outcome],
      variant: TRIAL_OUTCOME_VARIANT[grant.outcome],
      awaitingOutcome: false,
    }
  }

  const end = grant.trialEndDate
  if (!ISO_DATE.test(end ?? '')) {
    return { label: 'Sin fecha de fin válida', variant: 'neutral', awaitingOutcome: false }
  }

  if (today > end) {
    return {
      label: `Terminó el ${formatDate(end)} y todavía no tiene desenlace`,
      variant: 'warning',
      awaitingOutcome: true,
    }
  }

  const left = daysLeftInclusive(end, today)
  return {
    label:
      today === end
        ? 'En prueba · hoy es su último día'
        : `En prueba · quedan ${left} días, contando hoy`,
    variant: 'success',
    awaitingOutcome: false,
  }
}

/**
 * ¿Se recortó lo concedido contra la ventana? Cuando `daysGranted` y
 * `effectiveDays` no coinciden, el cliente tiene menos días de los que alguien
 * le vendió, y eso hay que decirlo en la fila y no dejarlo en dos números que
 * nadie compara.
 */
export function trialGrantTrimmed(grant: CompanyTrialGrantResponse): string | null {
  if (grant.effectiveDays >= grant.daysGranted) return null
  return `Se concedieron ${grant.daysGranted} días y quedaron ${grant.effectiveDays}: la ventana terminaba antes.`
}

/**
 * La frase que explica por qué no hay botón de «ampliar». Va escrita en la
 * pantalla, no solo en este código: quien busca el botón tiene que encontrar el
 * motivo de que no exista, o lo pedirá por soporte una vez al mes.
 */
export const TRIAL_WINDOW_NOT_EXTENDABLE =
  'La ventana no se amplía. No existe operación que le añada días, y es deliberado: una prueba que se estira deja de ser una prueba. Si hace falta más tiempo, se acuerda comercialmente y se abre una nueva.'

/** La otra ausencia deliberada, en la tabla de concesiones. */
export const TRIAL_GRANT_NOT_REVOCABLE =
  'Una concesión no se desconcede. Lo único que le llega es su desenlace al vencer.'

/* ─────────────────────────────────────────────────────────────────────────────
 * Conceder a mano: la lista cerrada, y qué exige cada motivo
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * <b>Los motivos por los que se concede un artículo a mano.</b>
 *
 * <p><b>Esta lista no es decorativa, y esa es toda la diferencia.</b>
 * `GrantTrialRequest` no tiene ningún campo de motivo —compárese con
 * `AdjustCompanyUsageRequest`, que sí lleva `reasonCode` y `reason`—, así que un
 * desplegable de motivos que solo se leyera aquí sería exactamente el patrón que
 * `OpenTrialWindowModal.vue` rechaza por escrito: pedirle al operador una
 * justificación que el borde tira, haciéndole creer que quedó registrada.
 *
 * <p>Lo que se hace en su lugar: el motivo <b>decide qué campo del cuerpo pasa a
 * ser obligatorio</b>. `sourceQuoteId` y `grantingAmendmentId` son los dos únicos
 * campos de este cuerpo que apuntan a un documento auditable, y los dos son
 * opcionales en el contrato. Al atarlos al motivo, la elección del operador deja
 * de morir en el navegador: se convierte en un número que el servidor guarda y
 * que mañana se puede contar.
 *
 * @see TRIAL_GRANT_REASON_REQUIRES
 */
export const TRIAL_GRANT_REASONS = [
  { value: 'SOLD_IN_QUOTE', label: 'Se vendió en una cotización' },
  { value: 'CONTRACT_AMENDMENT', label: 'Lo ordena una enmienda del contrato' },
  { value: 'GOODWILL', label: 'Gesto comercial, sin documento detrás' },
  { value: 'INCIDENT_COMPENSATION', label: 'Compensación por una incidencia nuestra' },
] as const

export type TrialGrantReason = (typeof TRIAL_GRANT_REASONS)[number]['value']

/**
 * El documento al que puede apuntar una concesión. Son exactamente los dos
 * campos opcionales de `GrantTrialRequest` más la ausencia declarada de ambos.
 */
export type TrialGrantBacking = 'QUOTE' | 'AMENDMENT' | 'NONE'

/** El desplegable del respaldo. «Sin documento» va el último y nombrado, no en blanco. */
export const TRIAL_GRANT_BACKING_OPTIONS: { value: TrialGrantBacking; label: string }[] = [
  { value: 'QUOTE', label: 'Una cotización' },
  { value: 'AMENDMENT', label: 'Una enmienda del contrato' },
  { value: 'NONE', label: 'Sin documento detrás' },
]

/**
 * Qué respaldo exige cada motivo. `null` significa que ese motivo no tiene
 * ninguno que pedir — y eso es un hueco real, no una comodidad: ver
 * {@link TRIAL_GRANT_NO_DURABLE_TRACE}.
 */
export const TRIAL_GRANT_REASON_REQUIRES: Record<TrialGrantReason, TrialGrantBacking | null> = {
  SOLD_IN_QUOTE: 'QUOTE',
  CONTRACT_AMENDMENT: 'AMENDMENT',
  GOODWILL: null,
  INCIDENT_COMPENSATION: null,
}

const BACKING_LABEL: Record<TrialGrantBacking, string> = {
  QUOTE: 'una cotización',
  AMENDMENT: 'una enmienda del contrato',
  NONE: 'sin documento detrás',
}

const REASON_LABEL: Record<TrialGrantReason, string> = {
  SOLD_IN_QUOTE: 'Se vendió en una cotización',
  CONTRACT_AMENDMENT: 'Lo ordena una enmienda del contrato',
  GOODWILL: 'Gesto comercial, sin documento detrás',
  INCIDENT_COMPENSATION: 'Compensación por una incidencia nuestra',
}

/**
 * <b>¿Se contradicen el motivo firmado y el respaldo elegido?</b> Devuelve el
 * texto del error, o cadena vacía si cuadran.
 *
 * <p>Es la comprobación que convierte el motivo en algo más que un adorno: un
 * motivo que dice «se vendió en una cotización» acompañado de una enmienda
 * describe dos hechos distintos, y el que quede guardado será el segundo. Quien
 * audite la concesión dentro de dos ejercicios solo verá el número, así que la
 * contradicción hay que pararla aquí — después ya no se distingue.
 *
 * <p>Los motivos sin documento admiten `NONE` y <b>también</b> un documento: un
 * gesto comercial puede haberse recogido igualmente en una cotización, y
 * prohibirlo obligaría a mentir en el motivo para poder dejar el rastro. Lo que
 * no se admite es lo contrario: decir que hay documento y no aportarlo.
 */
export function grantBackingMismatch(reason: TrialGrantReason, backing: TrialGrantBacking): string {
  const required = TRIAL_GRANT_REASON_REQUIRES[reason]
  if (required === null) return ''
  if (required === backing) return ''
  return `El motivo «${REASON_LABEL[reason]}» exige ${BACKING_LABEL[required]}, y has elegido ${BACKING_LABEL[backing]}. Cambia uno de los dos: lo que queda guardado es el documento, así que tienen que decir lo mismo.`
}

export const TRIAL_GRANT_NO_DURABLE_TRACE =
  'Este motivo no deja rastro en el servidor: el cuerpo de la concesión solo sabe apuntar a una cotización o a una enmienda, y con este motivo no va ninguna de las dos. La concesión quedará registrada, pero sin nada que explique por qué. Escribe la nota igualmente y deja constancia por el canal que corresponda.'

/**
 * La consecuencia que se pinta sobre el formulario de conceder. Es la razón de
 * que esta operación se firme y no se haga con un botón suelto.
 */
export const TRIAL_GRANT_CONSEQUENCE =
  'Da acceso a este artículo sin contrato y sin cargo. No se desconcede: no existe operación que la retire, y lo único que se le puede escribir después es su desenlace al vencer. Caduca sí o sí — los días son obligatorios.'

/**
 * Por qué los días no pueden ser 0 dicho para quien lo lee en el campo, no en un
 * comentario. `@NotNull` del borde acepta el cero; el cero es lo peligroso.
 */
export function validateGrantedDays(value: string): string {
  if (!value.trim()) return 'Los días son obligatorios: una concesión tiene que caducar.'
  const parsed = Number(value.trim())
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1)
    return 'Tienen que ser un número entero de 1 o más. Con 0 días la concesión no caduca nunca y ningún recálculo la retira.'
  if (parsed > 365)
    return 'Más de 365 días no es una prueba. Si hace falta tanto, es una línea de contrato.'
  return ''
}

/* ─────────────────────────────────────────────────────────────────────────────
 * El desenlace
 * ────────────────────────────────────────────────────────────────────────── */

/** El desplegable de desenlaces, en el orden en que se decide, no alfabético. */
export const TRIAL_OUTCOME_OPTIONS: { value: TrialOutcome; label: string }[] = [
  { value: 'CONVERTED', label: 'Se convirtió: hoy se factura' },
  { value: 'LIMITED', label: 'Quedó limitado' },
  { value: 'READ_ONLY', label: 'Quedó en solo consulta' },
  { value: 'ABANDONED', label: 'Se abandonó' },
]

/**
 * La consecuencia de escribir un desenlace. Se dice que no se corrige porque no
 * hay endpoint que lo corrija: el contrato publica `consumptions` una vez.
 */
export const TRIAL_OUTCOME_CONSEQUENCE =
  'Cierra la concesión con ese desenlace. No borra nada —la concesión sigue probando que esta empresa tuvo el artículo en esas fechas— pero no hay operación que reescriba el desenlace después: elígelo con el dato delante.'

/** Lo que la política decía que iba a pasar, para poder contrastarlo al cerrar. */
export function outcomeMatchesPolicy(
  policy: TrialPolicyOutcome,
  outcome: TrialOutcome,
): boolean | null {
  if (outcome === 'ABANDONED') return null
  const expected: Record<TrialPolicyOutcome, TrialOutcome> = {
    CONVERT_TO_PAID: 'CONVERTED',
    LIMITED: 'LIMITED',
    READ_ONLY: 'READ_ONLY',
  }
  return expected[policy] === outcome
}

export { businessToday }
