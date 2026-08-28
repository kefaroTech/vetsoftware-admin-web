import { formatDate } from '@/composables/format'
import { getProblemDetailCode } from '@/services/http/http.client'
import type { PriceListResponse } from '../types/commercial-catalog.types'

/**
 * Vigencia **por fecha** de una lista de precios (D-73, épica E4).
 *
 * ── Estado y vigencia son dos cosas distintas ─────────────────────────────
 *
 * `PriceListStatus` responde «¿está firmada?» —`DRAFT` editable, `PUBLISHED`
 * congelada, `ARCHIVED` consultable— y es lo único que la pantalla sabía
 * pintar. La pregunta que decide si se puede cotizar hoy es otra: **¿estamos
 * dentro de su ventana?** Una lista `PUBLISHED` cuyo `validTo` pasó el mes
 * pasado sigue saliendo «Publicada» en verde, y el operador la usa creyendo
 * que sirve. El backend ya no le sigue la corriente: desde D-73 rechaza
 * cotizar con una tarifa fuera de ventana con un 409
 * `PRICE_LIST_NOT_EFFECTIVE`.
 *
 * ── «Hoy» se resuelve en la zona del negocio, no en la del navegador ──────
 *
 * `validFrom` y `validTo` son `LocalDate` del contrato: fechas civiles **sin
 * zona**, escritas por y para el negocio. Compararlas contra el reloj del
 * navegador hace que a un operador conectado desde Madrid (UTC+2) una lista
 * que caduca el día 26 se le vea caducada durante las siete horas en las que
 * en Bogotá todavía es día 26 — y al revés, una que entra en vigor el 27 se
 * le vea vigente antes de tiempo. No es un redondeo: es una tarifa aplicada o
 * negada un día entero de más.
 *
 * Lo que hace el repositorio hoy no cubre este caso: `parseISODate`
 * (`composables/format.ts`) normaliza la fecha del backend a **medianoche
 * local** y `subscriptionDateTime.ts` construye `yyyy-MM-dd` con los
 * componentes **locales** del reloj. Las dos evitan el corrimiento de UTC —el
 * defecto que perseguían— pero las dos anclan el día en el huso del
 * navegador, que es exactamente el que aquí sobra. Así que la comparación no
 * pasa por `Date`: {@link businessToday} produce el `yyyy-MM-dd` de la zona
 * del negocio con `Intl` y se compara **como texto**, que en ISO ordena igual
 * que como fecha. Es el mismo criterio que ya usa `useEntitlements.ts:88`
 * para elegir la marca más reciente sin construir un solo `Date`.
 *
 * <p><b>La zona es una constante y eso es una limitación conocida.</b> No hay
 * en el contrato ningún campo de zona horaria de la plataforma —ni en
 * `/auth/me` ni en la configuración— y la plataforma opera únicamente en
 * Colombia. Poner aquí `America/Bogota` afirma algo verdadero hoy y revisable
 * mañana; inventarse un `timeZone` que el backend no entrega sería peor.
 * Cuando exista el campo, este es el único punto que cambia.
 */
export const BUSINESS_TIME_ZONE = 'America/Bogota'

const businessDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * El día civil que es **ahora mismo en la zona del negocio**, como `yyyy-MM-dd`.
 *
 * <p>Se arma con `formatToParts` y no con `format` a secas porque el orden y
 * los separadores de una configuración regional no son contrato: `en-CA` da
 * hoy `2026-08-27`, pero lo que este módulo necesita es la garantía de las
 * tres piezas, no la de una cadena.
 */
export function businessToday(now: Date = new Date()): string {
  const parts = businessDateParts.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** El fin del mundo en `yyyy-MM-dd`: lo que vale un `validTo` abierto al comparar. */
const OPEN_END = '9999-12-31'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Lo mínimo que hace falta para situar una lista en el calendario. */
export interface PriceListWindow {
  validFrom: string
  validTo: string | null
}

/**
 * Los tres casos de D-73, más el hueco honesto.
 *
 * <p>`desconocida` no es un adorno defensivo: `validFrom` llega como `string`
 * del contrato y una fila con la fecha en blanco o mal formada no puede
 * pintarse ni como vigente ni como caducada sin mentir. Se dice que no se sabe.
 */
export type EffectivenessLevel = 'futura' | 'vigente' | 'caducada' | 'desconocida'

export interface PriceListEffectiveness {
  level: EffectivenessLevel
  /** El texto que se pinta. Nunca vacío y nunca comunicado solo por color (WCAG 2.2 §1.4.1). */
  label: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
}

/** La ventana de una lista, con el extremo abierto ya resuelto para comparar. */
function windowOf(list: PriceListWindow): { from: string; to: string } | null {
  if (!ISO_DATE.test(list.validFrom ?? '')) return null
  if (list.validTo !== null && !ISO_DATE.test(list.validTo)) return null
  return { from: list.validFrom, to: list.validTo ?? OPEN_END }
}

/**
 * ¿Esta lista sirve **hoy**? Comparación textual de fechas ISO; ver la cabecera
 * del módulo para por qué `today` entra por parámetro y sale de
 * {@link businessToday}.
 */
export function priceListEffectiveness(
  list: PriceListWindow,
  today: string = businessToday(),
): PriceListEffectiveness {
  const range = windowOf(list)
  if (!range) {
    return { level: 'desconocida', label: 'Vigencia sin fecha válida', variant: 'neutral' }
  }

  if (today < range.from) {
    return {
      level: 'futura',
      label: `Entra en vigor el ${formatDate(range.from)}`,
      variant: 'neutral',
    }
  }

  if (today > range.to) {
    return { level: 'caducada', label: `Caducó el ${formatDate(list.validTo)}`, variant: 'danger' }
  }

  return {
    level: 'vigente',
    label: list.validTo
      ? `Vigente hasta el ${formatDate(list.validTo)}`
      : 'Vigente, sin fecha final',
    variant: 'success',
  }
}

/** Dos listas publicadas que se pisan, y el trozo de calendario en el que lo hacen. */
export interface PriceListOverlap {
  a: PriceListResponse
  b: PriceListResponse
  /** Primer día en el que las dos valen. */
  from: string
  /** Último día en el que las dos valen; `null` si ninguna de las dos cierra. */
  to: string | null
}

/**
 * Pares de listas **publicadas y activas** cuyas ventanas se solapan.
 *
 * <p>Por qué importa: dos tarifas publicadas y vigentes el mismo día son dos
 * precios igual de válidos para el mismo cliente. El comercial que cotiza por
 * la mañana y el que cotiza por la tarde firman cifras distintas y los dos
 * tienen razón; la diferencia la descubre facturación un mes después.
 *
 * <p>Los borradores y las archivadas quedan fuera a propósito: un borrador
 * todavía no cotiza nada y una archivada ya no. Solapar en borrador es el
 * curso normal de preparar la subida de precios del año que viene.
 *
 * <p>Una lista sin `validTo` no cierra nunca, así que solapa con **todo** lo
 * que empiece después de ella. Eso no es un falso positivo: es exactamente el
 * defecto que hay que ver antes de publicar la siguiente.
 */
export function overlappingPriceLists(lists: readonly PriceListResponse[]): PriceListOverlap[] {
  const live: { list: PriceListResponse; range: { from: string; to: string } }[] = []
  for (const list of lists) {
    if (list.status !== 'PUBLISHED' || !list.enabled) continue
    const range = windowOf(list)
    if (range) live.push({ list, range })
  }

  const found: PriceListOverlap[] = []
  for (const [i, a] of live.entries()) {
    for (const b of live.slice(i + 1)) {
      if (a.range.from > b.range.to || b.range.from > a.range.to) continue
      const to = a.range.to < b.range.to ? a.range.to : b.range.to
      found.push({
        a: a.list,
        b: b.list,
        from: a.range.from > b.range.from ? a.range.from : b.range.from,
        to: to === OPEN_END ? null : to,
      })
    }
  }
  return found
}

/** El código con el que el backend rechaza cotizar con una tarifa fuera de ventana (D-73). */
export const PRICE_LIST_NOT_EFFECTIVE_CODE = 'PRICE_LIST_NOT_EFFECTIVE'

/** La ventana que el 409 adjunta al `ProblemDetail`. Cualquiera de los tres puede faltar. */
export interface NotEffectiveWindow {
  validFrom: string | null
  validTo: string | null
  /** El día para el que se pidió cotizar, si el servidor lo manda. */
  effectiveOn: string | null
}

function isoOrNull(value: unknown): string | null {
  return typeof value === 'string' && ISO_DATE.test(value) ? value : null
}

/**
 * Lee la ventana del 409 `PRICE_LIST_NOT_EFFECTIVE`, sin parsear la prosa.
 *
 * <p>Mismo criterio y misma forma que `readCyclePath` en
 * `useCatalogItemBridges.ts`: se accede a las propiedades del `ProblemDetail`
 * de manera estructural, sin declararlas en el tipo compartido, porque
 * `http.client.ts` es un fichero gemelo TR-02 y estas tres propiedades solo
 * existen en una ruta de esta consola.
 *
 * <p>Devuelve `null` si el error es otro; devuelve el objeto con los huecos a
 * `null` si es este código pero el servidor no mandó las fechas — que la
 * pantalla diga «fuera de vigencia» sin fechas es honesto, inventarlas no.
 */
export function readNotEffectiveWindow(error: unknown): NotEffectiveWindow | null {
  if (getProblemDetailCode(error) !== PRICE_LIST_NOT_EFFECTIVE_CODE) return null
  const data = (
    error as
      | { response?: { data?: { validFrom?: unknown; validTo?: unknown; effectiveOn?: unknown } } }
      | null
      | undefined
  )?.response?.data
  return {
    validFrom: isoOrNull(data?.validFrom),
    validTo: isoOrNull(data?.validTo),
    effectiveOn: isoOrNull(data?.effectiveOn),
  }
}
