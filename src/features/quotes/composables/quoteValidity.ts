import { parseISODate } from '@/composables/format'

/**
 * `valid_until` — hasta cuándo se respeta el precio ofrecido.
 *
 * <p>El documento de diseño lo justifica sin rodeos: *«sin esto, alguien aparece en 2029 con una
 * cotización de 2026 y tiene razón»*. Por eso la fecha no se pinta como un dato más de la rejilla:
 * la pantalla dice además **en qué punto de su vigencia está**, y lo dice con palabras.
 *
 * <p>Tres estados y ninguno se comunica por color (WCAG 2.2 §1.4.1): cada uno trae su propio
 * `label` textual, y el tono del `AppBadge` solo acompaña.
 */
export type QuoteValidityLevel = 'vigente' | 'porVencer' | 'vencida'

export interface QuoteValidity {
  level: QuoteValidityLevel
  /** Días completos que faltan; negativo si ya pasó. `null` si la fecha no es parseable. */
  days: number | null
  /** El texto que se pinta. Nunca vacío. */
  label: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
}

/** Umbral de «se acerca». Una semana es lo que da margen a rehacer la oferta antes de perderla. */
const SOON_DAYS = 7

/**
 * Días completos entre hoy y `validUntil`, comparando a medianoche local en los dos lados.
 *
 * <p>Comparar `Date` completos daría «vence en 0 días» a las 23:00 de la víspera y «vencida» a las
 * 00:30 del mismo día de vencimiento. `parseISODate` (de `composables/format.ts`, W1-A) ya
 * normaliza la fecha del backend a medianoche local y evita el corrimiento de zona horaria que
 * haría caer una fecha de Bogotá en el día anterior.
 */
export function daysUntil(
  validUntil: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const target = parseISODate(validUntil)
  if (!target) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/**
 * Clasifica la vigencia de una oferta.
 *
 * <p>`EXPIRED` es un estado del propio documento y manda sobre el cálculo: si el backend ya la dio
 * por vencida, la pantalla no puede decir «vigente» porque la fecha aún no haya pasado. Al revés
 * también importa — una `SENT` cuya fecha pasó pero que el barrido nocturno todavía no ha
 * marcado se pinta como vencida, que es lo que el comercial necesita saber al descolgar el
 * teléfono.
 */
export function quoteValidity(
  validUntil: string | null | undefined,
  alreadyExpired = false,
  now: Date = new Date(),
): QuoteValidity {
  const days = daysUntil(validUntil, now)

  if (days === null) {
    return { level: 'vigente', days: null, label: 'Sin fecha de vigencia', variant: 'neutral' }
  }

  if (alreadyExpired || days < 0) {
    const ago = Math.abs(days)
    return {
      level: 'vencida',
      days,
      label: days < 0 ? `Venció hace ${ago} ${ago === 1 ? 'día' : 'días'}` : 'Vencida',
      variant: 'danger',
    }
  }

  if (days === 0) {
    return { level: 'porVencer', days, label: 'Vence hoy', variant: 'warning' }
  }

  if (days <= SOON_DAYS) {
    return {
      level: 'porVencer',
      days,
      label: `Vence en ${days} ${days === 1 ? 'día' : 'días'}`,
      variant: 'warning',
    }
  }

  return { level: 'vigente', days, label: `Vigente ${days} días más`, variant: 'success' }
}
