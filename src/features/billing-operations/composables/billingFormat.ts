import { formatDate, parseISODate } from '@/composables/format'

/**
 * Lo que la cobranza necesita mostrar y `src/composables/format.ts` no puede dar
 * por sí solo: la **antigüedad** y el **plazo** de un documento atascado.
 *
 * <p>Todo lo demás —fecha `dd/mm/aaaa`, dinero— sale del módulo transversal y no
 * se reimplementa aquí. Este fichero existe por el tiempo, no por el dinero.
 *
 * <p><b>Ya no vive aquí el formateo de importes.</b> `formatDocumentAmount` (sin
 * símbolo) y `formatPaymentAmount` (con la divisa del pago) subieron a
 * `src/composables/format.ts` como `formatAmount` y `formatMoney`, que son las
 * dos únicas funciones de dinero del producto. Tener la política de moneda
 * dentro de una feature era justo lo que permitió que se bifurcara en tres:
 * cobranza aplicaba la regla honesta, conciliación y catálogo no, y ninguna de
 * las tres podía ver a las otras. La regla, con su razonamiento, está escrita en
 * el módulo transversal.
 */

/** Milisegundos de un día. Se compara a medianoche local, no por diferencia de instantes. */
const DAY_MS = 86_400_000

/**
 * Días completos transcurridos desde una fecha ISO hasta `now`, contando por
 * días de calendario locales.
 *
 * <p>Contar por diferencia de instantes daría «0 días» a un documento emitido
 * anteayer a las 23:50 y consultado hoy a las 00:10. En una lista cuyo único
 * criterio de urgencia es la antigüedad, ese error convierte lo más viejo en lo
 * más nuevo. `parseISODate` normaliza a medianoche local y de paso evita el
 * corrimiento de zona horaria de `new Date('2026-03-03')`.
 *
 * <p>Devuelve `null` si la fecha no es parseable: un dato roto tiene que cantar,
 * no imprimirse como «hace 0 días».
 */
export function daysSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  const from = parseISODate(iso)
  if (!from) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today.getTime() - from.getTime()) / DAY_MS)
}

/**
 * La antigüedad **en texto**, que es como se lee una lista de trabajo: «hace 14
 * días» dice lo que «03/08/2026» obliga a calcular.
 *
 * <p>El valor absoluto no se pierde: va en el `title` de la celda
 * (`agingTitle`), para quien necesite la fecha exacta.
 */
export function agingText(days: number | null): string {
  if (days === null) return '—'
  if (days < 0) return 'en el futuro'
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  return `hace ${days} días`
}

/** La fecha exacta detrás del texto relativo. Vacío si no hay fecha: un `title` vacío no se pinta. */
export function agingTitle(iso: string | null | undefined): string {
  return formatDate(iso, '')
}

/**
 * Días completos que faltan hasta una fecha ISO, contando por días de calendario
 * locales. Negativo si ya pasó.
 *
 * <p>Es el espejo de `daysSince` y existe por el mismo motivo, aplicado al otro
 * lado del tiempo: el circuito del dinero tiene tres listas cuyo criterio de
 * urgencia es <b>cuánto queda</b> —el plazo de una reversión, la fecha del próximo
 * reintento, la caducidad de un lote de saldo—. Contar por diferencia de instantes
 * daría «0 días» a algo que vence esta noche y a algo que venció ayer, y en las
 * tres listas eso es la diferencia entre llegar a tiempo y no llegar.
 *
 * <p>Devuelve `null` si la fecha no es parseable: un dato roto tiene que cantar, no
 * imprimirse como «vence hoy».
 */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  const days = daysSince(iso, now)
  return days === null ? null : -days
}

/**
 * El plazo <b>en texto</b>, con el signo dicho y no deducido: «venció hace 2 días»
 * no es lo mismo que «vence en 2 días», y en una pantalla que ordena por urgencia
 * los dos casos caen uno al lado del otro.
 */
export function deadlineText(days: number | null): string {
  if (days === null) return '—'
  if (days < -1) return `venció hace ${Math.abs(days)} días`
  if (days === -1) return 'venció ayer'
  if (days === 0) return 'vence hoy'
  if (days === 1) return 'vence mañana'
  return `vence en ${days} días`
}
