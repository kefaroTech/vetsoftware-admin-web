import type {
  BillingCycle,
  CatalogItemResponse,
  CatalogPriceResponse,
} from '../types/commercial-catalog.types'

/**
 * <b>¿Está completa esta tarifa?</b> — la comprobación que hoy no existe al
 * publicar.
 *
 * ── El defecto ────────────────────────────────────────────────────────────
 *
 * `PATCH /price-lists/{id}/publish` no mira nada: publica el borrador tal y como
 * esté. Una lista a la que le falta el precio de un artículo activo se publica
 * sin una palabra, y el fallo aparece después, en la cotización, con el cliente
 * delante — o peor: <b>si el artículo olvidado es el del núcleo, ninguna empresa
 * puede registrarse</b>, porque el alta cotiza el núcleo y no encuentra precio.
 * Eso es la plataforma entera parada por una fila que faltaba.
 *
 * ── Qué se comprueba, y por qué solo esto ─────────────────────────────────
 *
 * Un artículo <b>debe</b> tener precio si está `ACTIVE` y habilitado: es lo que
 * hoy se puede vender. Los `DRAFT` todavía no se venden y los `DEPRECATED` ya no,
 * así que exigirles precio produciría un aviso permanente que nadie mira —el
 * ruido con el que empiezan a ignorarse todas las alertas de una pantalla.
 *
 * <p>La falta de un <b>ciclo</b> se cuenta aparte y no bloquea: que un artículo
 * tenga precio mensual y no anual es una decisión comercial legítima; que no
 * tenga ninguno no lo es. Mezclar las dos cosas convertiría una elección
 * deliberada en un defecto.
 *
 * <p>Funciones puras, sin Vue y sin red, porque lo que deciden —si se deja
 * publicar y con qué aviso— es exactamente lo que una prueba tiene que poder
 * barrer sin montar una pantalla.
 */

/** Un artículo que hoy se vende y que esta tarifa no sabe cobrar. */
export interface CoverageGap {
  item: CatalogItemResponse
  /** `true` cuando el artículo es del núcleo. Es la diferencia entre un hueco y una parada. */
  core: boolean
}

/** Un artículo con precio en un solo ciclo. Informativo: no bloquea. */
export interface CycleGap {
  item: CatalogItemResponse
  /** El ciclo que sí tiene precio. */
  has: BillingCycle
  /** El que falta. */
  missing: BillingCycle
}

export interface PriceListCoverage {
  /** Artículos activos que debería cubrir. */
  required: number
  /** De esos, los que tienen al menos un precio. */
  covered: number
  /** Los que no tienen ninguno. */
  gaps: CoverageGap[]
  /** El subconjunto de `gaps` que es del núcleo. Publicar con esto parado bloquea las altas. */
  coreGaps: CoverageGap[]
  /** Artículos con precio en un solo ciclo de facturación. */
  cycleGaps: CycleGap[]
  /** `true` si no falta ningún precio. No mira los ciclos: esos no bloquean. */
  complete: boolean
}

/** Los dos ciclos, para poder recorrerlos sin escribirlos dos veces. */
const CYCLES: readonly BillingCycle[] = ['MONTHLY', 'ANNUAL'] as const

/** Lo que hoy se vende: activo y habilitado. Ver la cabecera del módulo. */
export function isSellable(item: CatalogItemResponse): boolean {
  return item.status === 'ACTIVE' && item.enabled
}

/**
 * Cruza el catálogo con los precios de una tarifa.
 *
 * <p><b>`prices` tiene que ser la lista COMPLETA</b>, no una página. Calcular la
 * cobertura sobre las veinte filas visibles diría que faltan cuarenta precios que
 * sí están, y un aviso que miente en la primera pantalla no se cree en la
 * segunda. Quien la trae es `usePriceListCoverage`, que recorre todas las
 * páginas.
 *
 * <p>Los precios dados de baja no cuentan: un precio deshabilitado no cotiza, así
 * que el artículo sigue sin poder venderse con esta tarifa.
 */
export function priceListCoverage(
  items: readonly CatalogItemResponse[],
  prices: readonly CatalogPriceResponse[],
): PriceListCoverage {
  const cyclesByItem = new Map<number, Set<BillingCycle>>()
  for (const price of prices) {
    if (!price.enabled) continue
    const set = cyclesByItem.get(price.catalogItemId) ?? new Set<BillingCycle>()
    set.add(price.billingCycle)
    cyclesByItem.set(price.catalogItemId, set)
  }

  const required = items.filter(isSellable)
  const gaps: CoverageGap[] = []
  const cycleGaps: CycleGap[] = []

  for (const item of required) {
    const cycles = cyclesByItem.get(item.id)
    if (!cycles || cycles.size === 0) {
      gaps.push({ item, core: item.core })
      continue
    }
    const missing = CYCLES.filter((cycle) => !cycles.has(cycle))
    const has = CYCLES.filter((cycle) => cycles.has(cycle))
    const missingCycle = missing[0]
    const hasCycle = has[0]
    if (missing.length === 1 && missingCycle && hasCycle) {
      cycleGaps.push({ item, has: hasCycle, missing: missingCycle })
    }
  }

  return {
    required: required.length,
    covered: required.length - gaps.length,
    gaps,
    coreGaps: gaps.filter((gap) => gap.core),
    cycleGaps,
    complete: gaps.length === 0,
  }
}

/**
 * La frase de la cobertura, para el aviso y para la consecuencia de la
 * confirmación.
 *
 * <p>Dice el número y nombra el caso grave con sus palabras: «ninguna empresa
 * podrá registrarse» no es dramatismo, es literalmente lo que pasa cuando falta
 * el precio del núcleo.
 */
export function coverageSummary(coverage: PriceListCoverage): string {
  if (coverage.required === 0) {
    return 'No hay ningún artículo activo en el catálogo, así que no hay nada que esta tarifa tenga que cubrir.'
  }
  if (coverage.complete) {
    return `Los ${coverage.required} artículos activos del catálogo tienen precio en esta lista.`
  }
  const missing = coverage.gaps.length
  const base = `${coverage.covered} de ${coverage.required} artículos activos tienen precio: ${missing === 1 ? 'falta 1' : `faltan ${missing}`}.`
  if (coverage.coreGaps.length === 0) {
    return `${base} Cotizar uno de los que faltan será rechazado.`
  }
  return `${base} Entre los que faltan hay ${coverage.coreGaps.length === 1 ? 'un artículo del núcleo' : `${coverage.coreGaps.length} artículos del núcleo`}: si se publica así, ninguna empresa podrá registrarse.`
}

/**
 * El texto con el que se dice que publicar no se puede deshacer.
 *
 * <p>Vive aquí, en un solo sitio, porque lo repiten la confirmación y el aviso de
 * la lista publicada, y porque es una <b>afirmación sobre el contrato</b> que hay
 * que poder retirar de golpe el día que exista `unpublish`: el backend expone
 * `publish` y `archive`, y ninguna ruta que devuelva una lista publicada a
 * borrador.
 */
export const PUBLISH_IS_TERMINAL =
  'Publicar no se puede deshacer: el contrato no expone despublicar. Si un precio sale mal, la única salida es archivar la lista y publicar otra corregida — y mientras tanto lo mal publicado ya cotiza.'
