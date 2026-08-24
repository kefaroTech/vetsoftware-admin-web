/**
 * Formateo transversal de dinero y fechas para la consola de plataforma.
 *
 * Sustituye a los tres formatos que llegaron a convivir sin que ninguno fuera
 * el canónico (docs/ux/suscripciones-consola-especificacion.md §4, tarea
 * W1-A, issue B-9):
 *
 * - `BillingDocumentsTable.vue:29-32` formatea importes sin símbolo de
 *   moneda con un `Intl.NumberFormat` propio.
 * - `CommercialCatalogView.vue:115-121` los formatea con divisa variable
 *   (la de la lista de precios seleccionada) con otro `Intl.NumberFormat`.
 * - `SubscriptionsAdminView.vue:38-40` no formatea la fecha en absoluto —
 *   `formatDate` devuelve el ISO crudo (`2026-03-03`) tal cual.
 *
 * Un importe mal formateado en una pantalla de cobranza no es cosmética: es
 * la lista de trabajo con la que se cierra el mes. §4 fija el vocabulario:
 * dinero con `Intl.NumberFormat('es-CO', { style: 'currency', currency:
 * 'COP' })` + clase `.ds-num` en el marcado, fecha `dd/mm/aaaa`, nulo → `—`.
 *
 * Migrar los tres puntos de arriba a este módulo queda **fuera** de esta
 * tarea (W1-A no toca `src/features/**`: las cinco tareas de la onda 1
 * escriben ahí en paralelo) — ver el issue de seguimiento.
 *
 * Este módulo NO es el gemelo TR-02 de `VetSoftwarePublicFront/src/
 * composables/format.ts`: no figura en la tabla de archivos idénticos de
 * `CLAUDE.md`, y su forma es distinta a propósito. El del tenant cubre
 * fechas cortas/largas para historia clínica y no tiene formateo de dinero
 * (eso vive en `features/tienda/composables/pricing.ts`, con reglas propias
 * del punto de venta). Esta consola solo necesita pesos colombianos y una
 * fecha numérica para tablas contables — el vocabulario que fija §4 — así
 * que se escribe su propia versión, más pequeña, en vez de forzar un
 * gemelo que tendría que cargar con casos que aquí no existen.
 */

/** Marcador de "sin dato" del sistema de diseño. */
const EMPTY = '—'

/**
 * Parsea la parte de fecha de un ISO (`yyyy-MM-dd` o con hora,
 * `yyyy-MM-ddTHH:mm:ss`) a medianoche LOCAL.
 *
 * El `T00:00:00` explícito es lo que evita el corrimiento de zona horaria:
 * `new Date('2026-03-03')` se interpreta como UTC y en Bogotá (UTC-5) cae el
 * día 2 — que es exactamente la clase de error que una pantalla de cobranza
 * no se puede permitir en una fecha de vencimiento.
 *
 * Devuelve `null` si la cadena no empieza por una fecha ISO válida o si el
 * calendario desborda (`2026-02-31` no es `Invalid Date`, es el 3 de marzo,
 * y hay que detectarlo a mano): una fecha que el backend no pudo haber
 * emitido tiene que cantar como dato roto, no imprimirse como otro día.
 */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const [, y, mo, day] = m
  const d = new Date(`${y}-${mo}-${day}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  if (d.getMonth() !== Number(mo) - 1 || d.getDate() !== Number(day)) return null
  return d
}

/**
 * Fecha numérica `dd/mm/aaaa` — el único formato de fecha que fija §4 de la
 * especificación de suscripciones para las tablas de esta consola.
 *
 * `empty` es lo que se imprime cuando no hay fecha; por defecto el guion
 * largo del sistema de diseño. Pásale `''` si el hueco debe quedar vacío.
 *
 * Si la cadena no es un ISO parseable, se devuelve tal cual: es preferible
 * mostrar un dato crudo pero visible a esconder un valor real detrás de un
 * guion, que es justo el defecto que este módulo reemplaza
 * (`SubscriptionsAdminView.vue:38-40` hoy hace lo contrario: nunca formatea,
 * ni siquiera cuando sí podría).
 */
export function formatDate(iso: string | null | undefined, empty: string = EMPTY): string {
  if (!iso) return empty
  const d = parseISODate(iso)
  if (!d) return iso
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${d.getFullYear()}`
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 2,
})

/**
 * Importe en pesos colombianos, con símbolo de moneda: `$ 179.000,00`. En el
 * marcado se combina con la clase `.ds-num` (`primitives.css:1296`) para
 * alinear a la derecha con cifras tabulares — este formateador solo produce
 * el texto, no añade esa clase.
 *
 * `value` acepta `null`/`undefined` (campo opcional del DTO) y también una
 * cadena numérica, porque algún DTO de este contrato serializa un
 * `BigDecimal` como string; `NaN` cae en `empty`, igual que un valor
 * ausente.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  empty: string = EMPTY,
): string {
  if (value == null) return empty
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return empty
  return currencyFormatter.format(n)
}
