import { PROVENANCE_LABEL, type ProvenanceSource } from '@/components/ui/ProvenanceLine.vue'
import type {
  CompanyLimitEventResponse,
  EffectiveLimitResponse,
  LimitEventType,
  LimitMeasureKind,
  LimitOverrideReasonCode,
  LimitSource,
} from '../types/limits.types'

/**
 * **El vocabulario de cupo, escrito una sola vez.**
 *
 * <p>Cinco pantallas nombran los mismos cuatro enumerados. Con el rótulo escrito
 * en cada plantilla, «Techo alcanzado» y «Cupo agotado» acabarían conviviendo en
 * la misma sesión y nadie sabría si son dos estados o dos redacciones. Aquí son
 * funciones puras, así que además una prueba las barre sin montar nada.
 *
 * <p><b>Ningún valor crudo del enumerado llega a la pantalla.</b> `LIMIT_BLOCKED`
 * no significa nada para quien atiende a un cliente por teléfono.
 */

// ── Tipo de medida ───────────────────────────────────────────────────

export const MEASURE_KIND_LABEL: Record<LimitMeasureKind, string> = {
  STOCK: 'Existencias',
  CUMULATIVE: 'Acumulado',
  FLOW: 'Por periodo',
}

/**
 * Qué implica cada tipo, en una frase. No es adorno: decide si el consumo puede
 * bajar, y por tanto si una cuenta desbordada puede salir sola del desborde.
 */
export const MEASURE_KIND_MEANING: Record<LimitMeasureKind, string> = {
  STOCK: 'Cuenta lo que existe ahora. Sube y baja: al dar de baja un registro, el cupo se libera.',
  CUMULATIVE: 'Cuenta todo lo creado desde el principio. Solo sube: borrar no devuelve cupo.',
  FLOW: 'Cuenta lo consumido dentro del periodo. Se reinicia al empezar el siguiente.',
}

export function measureKindLabel(kind: LimitMeasureKind): string {
  return MEASURE_KIND_LABEL[kind]
}

export const MEASURE_KIND_OPTIONS: { value: LimitMeasureKind; label: string }[] = (
  ['STOCK', 'CUMULATIVE', 'FLOW'] as const
).map((value) => ({ value, label: MEASURE_KIND_LABEL[value] }))

// ── Motivos de la firma ──────────────────────────────────────────────

export const OVERRIDE_REASON_LABEL: Record<LimitOverrideReasonCode, string> = {
  RETENTION: 'Retención de un cliente en riesgo',
  MIGRATION: 'Migración desde otro sistema',
  COMMERCIAL_AGREEMENT: 'Acuerdo comercial',
  SUPPORT_INCIDENT: 'Incidencia de soporte',
  OTHER: 'Otro',
}

/** La lista cerrada que consume `SignedActionModal`. El orden es el de frecuencia esperada. */
export const OVERRIDE_REASON_OPTIONS: { value: LimitOverrideReasonCode; label: string }[] = (
  ['COMMERCIAL_AGREEMENT', 'RETENTION', 'MIGRATION', 'SUPPORT_INCIDENT', 'OTHER'] as const
).map((value) => ({ value, label: OVERRIDE_REASON_LABEL[value] }))

/**
 * Los dos motivos que no se explican solos: con ellos la nota es obligatoria.
 *
 * <p>«Otro» sin nota es exactamente el registro que no sirve para nada dentro de
 * dos ejercicios, y «Incidencia de soporte» sin el número del ticket obliga a
 * reconstruir a mano qué pasó.
 */
export const OVERRIDE_NOTE_REQUIRED: LimitOverrideReasonCode[] = ['OTHER', 'SUPPORT_INCIDENT']

export function overrideReasonLabel(code: LimitOverrideReasonCode): string {
  return OVERRIDE_REASON_LABEL[code]
}

// ── Hechos de la bitácora ────────────────────────────────────────────

export const EVENT_TYPE_LABEL: Record<LimitEventType, string> = {
  THRESHOLD_WARNED: 'Aviso de umbral',
  LIMIT_BLOCKED: 'Portazo',
  LIMIT_RAISED: 'Techo ampliado',
  USAGE_RECONCILED: 'Consumo reconciliado',
  USAGE_ADJUSTED: 'Consumo corregido a mano',
  OVER_LIMIT_ON_DOWNGRADE: 'Quedó por encima al bajar el plan',
}

/**
 * Qué significa cada hecho para quien atiende al cliente. La bitácora existe
 * para poder decir «se te avisó el día 3 y se te bloqueó el 9»: sin esto, la
 * tabla es una lista de mayúsculas.
 */
export const EVENT_TYPE_MEANING: Record<LimitEventType, string> = {
  THRESHOLD_WARNED: 'Se avisó al cliente de que se acercaba a su techo. Todavía podía crear.',
  LIMIT_BLOCKED: 'Se rechazó la operación: el cupo estaba agotado. Lo que ya existía siguió igual.',
  LIMIT_RAISED: 'Alguien subió el techo. La cuenta volvió a poder crear.',
  USAGE_RECONCILED: 'Un proceso recontó lo consumido y ajustó el contador a la realidad.',
  USAGE_ADJUSTED: 'Una persona corrigió el contador a mano, con motivo escrito.',
  OVER_LIMIT_ON_DOWNGRADE:
    'Se bajó el plan por debajo de lo que la cuenta ya tenía. Conserva lo suyo y no puede crear más.',
}

/**
 * El tono de la insignia. `danger` solo para lo que ya frenó a alguien.
 *
 * <p>El tono **acompaña** al rótulo, nunca lo sustituye: nada se comunica solo
 * por color (§5.2), y la tabla se lee por teléfono.
 */
export function eventTypeTone(type: LimitEventType): 'success' | 'warning' | 'danger' | 'neutral' {
  if (type === 'LIMIT_BLOCKED' || type === 'OVER_LIMIT_ON_DOWNGRADE') return 'danger'
  if (type === 'THRESHOLD_WARNED') return 'warning'
  if (type === 'LIMIT_RAISED') return 'success'
  return 'neutral'
}

export function eventTypeLabel(type: LimitEventType): string {
  return EVENT_TYPE_LABEL[type]
}

/** Quién lo hizo. El contrato da identificadores, no nombres: se dicen como tales. */
export function actorLabel(event: CompanyLimitEventResponse): string {
  if (event.actorIsProcess) return 'Proceso automático'
  if (event.actorSystemUserId != null) return `Operador de plataforma #${event.actorSystemUserId}`
  if (event.actorEmployeeId != null) return `Empleado de la empresa #${event.actorEmployeeId}`
  // Ni proceso ni actor: el contrato lo permite y no se inventa un culpable.
  return 'Sin actor registrado'
}

// ── Procedencia del techo ────────────────────────────────────────────

/**
 * Traduce el origen del techo al vocabulario de `ProvenanceLine`, que es el que
 * ya usan las pantallas de contratos y de empresa.
 *
 * <p><b>`NONE` devuelve `null` a propósito.</b> `ProvenanceLine` tiene cuatro
 * orígenes y ninguno significa «no hay origen». El cuarto, `FACTORY`, quiere
 * decir «nadie lo ha cambiado, es el valor con el que nace el producto», que es
 * una afirmación **distinta** y más fuerte que «nadie ha fijado techo». Mapear
 * `NONE` a `FACTORY` pintaría una procedencia inventada justo en el sitio donde
 * se decide si un techo se puede tocar (R14).
 */
export function provenanceOf(source: LimitSource): ProvenanceSource | null {
  switch (source) {
    case 'COMPANY_OVERRIDE':
      return 'NEGOTIATED_EXCEPTION'
    case 'SUBSCRIPTION':
      return 'CONTRACT'
    case 'CATALOG_DEFAULT':
      return 'PLAN'
    case 'NONE':
      return null
  }
}

/**
 * El rótulo del origen para una celda de tabla, donde no cabe la línea entera.
 * Sale del MISMO mapa que `ProvenanceLine`, para que las dos pantallas no
 * acaben llamando de dos maneras a lo mismo.
 */
export function limitSourceLabel(source: LimitSource): string {
  const provenance = provenanceOf(source)
  return provenance === null ? 'Sin techo fijado' : PROVENANCE_LABEL[provenance]
}

/**
 * El techo, en palabras. **Un techo ausente no es un techo de cero**, y esta es
 * la frase que lo dice: `EffectiveLimitResponse.limitQuantity` llega vacío
 * cuando no hay ninguno, y pintar «0» convertiría «puede crear lo que quiera» en
 * «no puede crear nada».
 */
export function effectiveLimitText(limit: EffectiveLimitResponse, unit: string): string {
  if (limit.unlimited || limit.limitQuantity == null) return `Sin techo: ${unit} sin tope`
  return `Techo de ${limit.limitQuantity} ${unit}`
}

// ── Ventanas de fecha ────────────────────────────────────────────────

/** `aaaa-mm-dd` en hora **local**, que es el día que ve el operador. */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Días que abarca la ventana por defecto de las dos pantallas de bitácora. */
export const DEFAULT_EVENT_WINDOW_DAYS = 90

/**
 * La ventana por defecto: los últimos noventa días.
 *
 * <p>El endpoint exige `from` y `to`, así que **alguna** ventana hay que
 * proponer. Noventa días es un trimestre: cubre el ciclo de facturación completo
 * en el que se decide si una cuenta desbordada es un caso puntual o el estado
 * normal del cliente. La pantalla la enseña escrita y deja cambiarla — un rango
 * implícito es un filtro que nadie sabe que está aplicado.
 */
export function defaultEventRange(today: Date = new Date()): { from: string; to: string } {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  from.setDate(from.getDate() - DEFAULT_EVENT_WINDOW_DAYS)
  return { from: isoDay(from), to: isoDay(today) }
}
