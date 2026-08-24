import { formatCurrency, formatDate, parseISODate } from '@/composables/format'

/**
 * Lo que la cobranza necesita mostrar y `src/composables/format.ts` no puede dar
 * por sí solo: la **antigüedad** de un documento atascado y el importe de un
 * documento **que no trae moneda**.
 *
 * <p>Todo lo demás —fecha `dd/mm/aaaa`, dinero en pesos— sale del módulo
 * transversal y no se reimplementa aquí. Este fichero existe por dos huecos
 * concretos del contrato, no por gusto de tener un formateador propio.
 */

const documentAmountFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Importe de un documento de cobro, **sin símbolo de moneda**.
 *
 * <p>No es un descuido ni una tercera convención de formato: `BillingDocumentResponse`
 * no expone `currency` (`SubscriptionPaymentResponse` sí), y rotular «$» sobre un
 * documento cuya divisa el contrato no declara es inventar un dato en una
 * pantalla contable. Los pagos usan `formatCurrency()` del módulo transversal
 * porque ahí la divisa sí viene del servidor. Cuando el contrato añada `currency`
 * al documento, esta función se borra y su llamada pasa a `formatCurrency`.
 */
export function formatDocumentAmount(value: number | null | undefined, empty = '—'): string {
  if (value == null || Number.isNaN(value)) return empty
  return documentAmountFormatter.format(value)
}

/**
 * Importe de un pago, **con la divisa que declara el propio pago**.
 *
 * <p>`formatCurrency` del módulo transversal fija `COP`, que es lo correcto para
 * el 100 % de la plataforma hoy. Pero `SubscriptionPaymentResponse.currency`
 * existe y puede traer otra cosa, y pintar «$ 1.200,00» sobre un pago en dólares
 * sería un error de 4.000 pesos por dólar en una pantalla de conciliación. Así
 * que la divisa esperada se formatea con el módulo transversal y cualquier otra
 * se imprime con su código al lado, sin símbolo inventado.
 */
export function formatPaymentAmount(value: number, currency: string): string {
  if (currency === 'COP') return formatCurrency(value)
  return `${documentAmountFormatter.format(value)} ${currency}`
}

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
