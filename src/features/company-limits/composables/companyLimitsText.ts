import type { ProvenanceSource } from '@/components/ui/ProvenanceLine.vue'
import type { SignedActionReason } from '@/components/ui/SignedActionModal.vue'
import { businessToday } from '@/features/commercial-catalog/composables/priceListValidity'
import type {
  LimitEventType,
  LimitSource,
  SnapshotTriggerReason,
} from '../types/company-limits.types'

/**
 * <b>Todo lo que la pantalla de cupos dice con palabras, y las dos aritméticas
 * que hace.</b> Funciones puras y mapas cerrados: es lo que una prueba unitaria
 * puede barrer sin montar un componente, y lo que hace que el mismo texto no se
 * escriba dos veces con dos matices distintos.
 *
 * <p>Está en un módulo aparte también por el presupuesto de CSS: la pantalla de
 * cupos estaba marcada como candidata a pasar de 500 líneas por SFC, así que se
 * parte desde el primer commit —textos aquí, tabla y tarjeta en sus propios
 * componentes, y la vista como armazón delgado.
 */

/** El día del negocio, reexportado para que la pantalla no importe dos módulos. */
export { businessToday }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

/**
 * `yyyy-MM-dd` desplazado n días, sin construir un `Date` a partir del reloj
 * local. Es una copia deliberada de seis líneas de la que usa `trials`: importar
 * aquella crearía una arista entre dos features que no tienen nada que ver y
 * arrastraría su módulo al chunk de esta pestaña, que es lo que el presupuesto de
 * bundle no perdona. Lo que <b>no</b> se copia es `businessToday`: la zona del
 * negocio es un dato y tiene que cambiarse en un solo sitio.
 */
export function shiftBusinessDay(iso: string, days: number): string | null {
  if (!ISO_DATE.test(iso)) return null
  // Valores por defecto inalcanzables: el `test` ya garantiza las tres piezas.
  // Están por `noUncheckedIndexedAccess`, que tipa el `split` como
  // `(number | undefined)[]`; la alternativa —tres `!`— es un aviso que
  // `--max-warnings=0` convierte en error.
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10)
}

/**
 * La ventana temporal que exige `GET /system/company-limit-events/companies/{id}`.
 *
 * <p><b>Se compone en la zona del negocio y viaja sin zona.</b> Los dos parámetros
 * son `LocalDateTime` del contrato: mandar un instante UTC del navegador haría que
 * a un operador conectado desde otro huso le faltaran las últimas horas del día en
 * Bogotá — justo las que suelen contener el portazo del que viene preguntando.
 *
 * <p>El extremo final es `T23:59:59` del día de hoy, incluido: mismo criterio que
 * el último día de una ventana de prueba, y por el mismo motivo.
 */
export function businessEventRange(
  days: number,
  today: string = businessToday(),
): { from: string; to: string } {
  const start = shiftBusinessDay(today, -Math.abs(days)) ?? today
  return { from: `${start}T00:00:00`, to: `${today}T23:59:59` }
}

/** Cuántos días de bitácora se piden por defecto. Tres meses es un trimestre de reclamaciones. */
export const DEFAULT_EVENT_WINDOW_DAYS = 90

/** De dónde sale el techo, en palabras. */
export const LIMIT_SOURCE_LABEL: Record<LimitSource, string> = {
  COMPANY_OVERRIDE: 'De una excepción negociada con esta empresa',
  SUBSCRIPTION: 'De una línea del contrato vigente',
  CATALOG_DEFAULT: 'Del valor con el que nace el artículo',
  NONE: 'No hay techo declarado',
}

/**
 * El puente entre el vocabulario del backend y el de `ProvenanceLine`, que son
 * dos listas de cuatro que <b>no</b> dicen lo mismo.
 *
 * <p>`NONE` devuelve `null` a propósito: no es un origen, es la ausencia de uno.
 * Pintarlo como «Valor de fábrica» diría que alguien decidió ese cupo cuando lo
 * cierto es que no hay cupo. Un hueco honesto antes que un dato inventado (R14).
 *
 * <p>`SUBSCRIPTION` es `CONTRACT` y no `PLAN`: el techo lo fija una línea del
 * contrato vigente, y ahí es donde se cambia. La diferencia importa —«lo trae el
 * plan» y «se pactó en el contrato» se arreglan en dos pantallas distintas.
 */
export function limitSourceProvenance(source: LimitSource): ProvenanceSource | null {
  switch (source) {
    case 'COMPANY_OVERRIDE':
      return 'NEGOTIATED_EXCEPTION'
    case 'SUBSCRIPTION':
      return 'CONTRACT'
    case 'CATALOG_DEFAULT':
      return 'FACTORY'
    case 'NONE':
      return null
  }
}

/** Qué fue cada hecho de la bitácora. */
export const LIMIT_EVENT_TYPE_LABEL: Record<LimitEventType, string> = {
  THRESHOLD_WARNED: 'Aviso de que quedaba poco',
  LIMIT_BLOCKED: 'Portazo: no pudo crear más',
  LIMIT_RAISED: 'Se le subió el techo',
  USAGE_RECONCILED: 'Recuento del contador',
  USAGE_ADJUSTED: 'Corrección del contador',
  OVER_LIMIT_ON_DOWNGRADE: 'Quedó por encima del techo al bajar el contrato',
}

/**
 * Qué significa cada hecho para el cliente. Se pinta una vez, en la leyenda, y no
 * repetido en cada fila.
 */
export const LIMIT_EVENT_TYPE_MEANING: Record<LimitEventType, string> = {
  THRESHOLD_WARNED: 'Se le avisó dentro de la aplicación de que se acercaba al techo.',
  LIMIT_BLOCKED: 'Intentó crear algo y no se le dejó. Es la señal de venta más limpia que hay.',
  LIMIT_RAISED: 'Alguien le amplió la cantidad: un otrosí del contrato o una excepción negociada.',
  USAGE_RECONCILED: 'Un proceso contó las filas reales y comprobó que el contador cuadraba.',
  USAGE_ADJUSTED: 'Una persona de plataforma corrigió el contador, con motivo y firma.',
  OVER_LIMIT_ON_DOWNGRADE:
    'Bajó el contrato teniendo más de lo que el techo nuevo permite. Conserva lo que ya tenía y no puede crear más: no es un error.',
}

export const LIMIT_EVENT_VARIANT: Record<
  LimitEventType,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  THRESHOLD_WARNED: 'warning',
  LIMIT_BLOCKED: 'danger',
  LIMIT_RAISED: 'success',
  USAGE_RECONCILED: 'neutral',
  USAGE_ADJUSTED: 'neutral',
  OVER_LIMIT_ON_DOWNGRADE: 'warning',
}

/** Por qué se recalculó lo que la empresa puede usar. */
export const SNAPSHOT_TRIGGER_LABEL: Record<SnapshotTriggerReason, string> = {
  CONTRACT_AMENDMENT: 'Un otrosí del contrato',
  TRIAL_EXPIRED: 'Se acabó la prueba',
  DUNNING: 'Cobranza',
  MANUAL: 'Alguien lo pidió a mano',
  REPAIR: 'Una reparación',
}

/**
 * Quién dejó el hecho.
 *
 * <p><b>No se dice «Sistema» cuando no se sabe.</b> El contrato garantiza
 * `actorIsProcess` y deja los dos identificadores opcionales: un hecho de una
 * persona cuyo identificador no llegó es una persona, no un proceso, y
 * confundirlos convierte una corrección firmada en un movimiento automático a
 * ojos de quien audite. Cuando no hay a quién nombrar, se dice que no consta.
 */
export function limitEventActor(event: {
  actorIsProcess: boolean
  actorSystemUserId: number | null
  actorEmployeeId: number | null
}): string {
  if (event.actorIsProcess) return 'Un proceso automático'
  if (event.actorSystemUserId !== null) return `Plataforma #${event.actorSystemUserId}`
  if (event.actorEmployeeId !== null) return `Empleado #${event.actorEmployeeId}`
  return 'No consta quién'
}

/**
 * El movimiento del hecho, con su signo escrito. `+3` y `3` se leen distinto de un
 * vistazo, y en una bitácora de correcciones el signo es la mitad del dato.
 */
export function signedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta)
}

/**
 * <b>Estar por encima del techo está permitido.</b> Pasa al bajar el contrato sin
 * retirar lo que ya había, y no es un fallo que haya que arreglar corrigiendo el
 * contador: el cliente conserva lo suyo y no puede crear más. Decirlo evita
 * exactamente la corrección equivocada.
 *
 * <p>Devuelve `null` cuando no hay desbordamiento o cuando falta algún dato: sin
 * techo declarado no se puede estar por encima de nada.
 */
export function overLimitNote(used: number | null, limit: number | null): string | null {
  if (used == null || limit == null || limit <= 0) return null
  if (used <= limit) return null
  return `Tiene ${used - limit} por encima del techo. Conserva lo que ya tenía y no puede crear más; no es un error y no se arregla corrigiendo el contador.`
}

/**
 * El vocabulario cerrado de la corrección.
 *
 * <p><b>Por qué una lista y no un campo libre.</b> El contrato acepta
 * `reasonCode` como texto de hasta 30 caracteres, así que la lista la impone esta
 * pantalla y no el borde. Se impone igual: la firma existe para que dentro de dos
 * ejercicios se pueda contar cuántas correcciones fueron por migración y cuántas
 * por incidencia, y con texto libre esa cuenta se convierte en cuatrocientas
 * frases que dicen cinco cosas. La nota sigue estando al lado, para lo que el
 * código no captura.
 */
export const USAGE_ADJUSTMENT_REASONS: SignedActionReason[] = [
  { value: 'MIGRATION', label: 'Datos duplicados por una migración' },
  { value: 'DATA_REPAIR', label: 'Se borraron datos y el contador no bajó' },
  { value: 'SUPPORT_INCIDENT', label: 'Incidencia de soporte' },
  { value: 'COUNTER_DRIFT', label: 'El contador se descuadró y no se sabe por qué' },
  { value: 'OTHER', label: 'Otro' },
]

/** Los motivos que no se explican solos: con ellos la nota pasa a ser obligatoria. */
export const USAGE_ADJUSTMENT_NOTE_REQUIRED = ['OTHER', 'COUNTER_DRIFT']

/** `@Size(max = 255)` del DTO. Acompaña al validador, no lo sustituye. */
export const USAGE_ADJUSTMENT_REASON_MAX = 255

/**
 * Lo que se le dice al operador antes de firmar. Nombra lo que queda hecho y lo
 * que no se deshace.
 */
export const USAGE_ADJUSTMENT_CONSEQUENCE =
  'No se sobrescribe el contador: se mueve y queda escrito el hecho que lo compensa, con las dos cifras de antes, tu firma y el motivo. La corrección no se puede borrar después.'

/**
 * El movimiento. <b>Es un delta, no un total</b>: −500 resta quinientos.
 *
 * <p>Se valida como entero porque el contrato lo declara `int32`, se rechaza el
 * cero —mover cero no corrige nada y sí ensucia la bitácora— y se acota al rango
 * del entero de 32 bits, que es donde el servidor lo rechazaría con un 400 sin
 * decir por qué.
 */
export const INT32_MAX = 2_147_483_647

export function parseDelta(raw: string): number {
  const parsed = Number(raw.trim())
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN
}

export function validateDelta(raw: string): string {
  if (!raw.trim()) return 'El movimiento es obligatorio.'
  const delta = parseDelta(raw)
  if (Number.isNaN(delta)) return 'Escribe un número entero. Usa el signo menos para restar.'
  if (delta === 0)
    return 'Mover cero no corrige nada y sí deja un hecho en la bitácora. Escribe la diferencia, con su signo.'
  if (Math.abs(delta) > INT32_MAX) return 'El movimiento es demasiado grande.'
  return ''
}

/**
 * A cuánto quedaría el contador. Se enseña <b>antes</b> de firmar, porque es la
 * cifra sobre la que se decide, y un delta con el signo cambiado es el error más
 * fácil de cometer aquí.
 *
 * <p>Devuelve `null` si no se conoce el consumo actual: preferimos no enseñar
 * ninguna cifra a enseñar una calculada desde un cero inventado.
 */
export function projectedUsage(used: number | null, raw: string): number | null {
  if (used == null) return null
  const delta = parseDelta(raw)
  if (Number.isNaN(delta) || delta === 0) return null
  return used + delta
}
