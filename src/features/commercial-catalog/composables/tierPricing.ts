/**
 * Aritmética de **tramos acumulativos** (D-66, épica E5).
 *
 * ── El defecto de dinero que esto hace visible ────────────────────────────
 *
 * Un precio por tramos se puede leer de dos maneras, y solo una es la del
 * contrato:
 *
 * - **Acumulativa (la correcta).** Cada unidad se cobra al precio del tramo
 *   **en el que cae esa unidad**. Con dos incluidas y los tramos 1–8 a 12.000
 *   y 9+ a 9.000, quince usuarios son trece facturables: ocho a 12.000 y
 *   cinco a 9.000 = **141.000**.
 * - **Plana (la equivocada).** Se busca el tramo que cubre la cantidad total y
 *   se multiplica todo por su precio: trece a 9.000 = **117.000**.
 *
 * Veinticuatro mil pesos por cliente y mes de diferencia, en el mismo dato y
 * sin que nada falle. Esta pantalla existe para que comercial vea el reparto y
 * no vuelva a confundir «el tramo que cubre la cantidad» con «los tramos
 * acumulados».
 *
 * ── Los tramos se recorren sobre lo FACTURABLE, no sobre lo pedido ────────
 *
 * `includedQuantity` se descuenta **antes** de entrar en la escalera. Es lo que
 * hace que quince usuarios con dos incluidos empiecen a contar en la unidad 1
 * de la escalera y no en la 3, y por eso el primer tramo aporta ocho unidades
 * (1–8) y no seis.
 *
 * ── Sin backend, y sin inventar nada ──────────────────────────────────────
 *
 * Todo esto es front puro sobre las filas de `/catalog-prices` que la pantalla
 * ya tiene. Cuando la escalera está mal sembrada —un hueco entre el 8 y el 10,
 * dos tramos que se pisan, o `includedQuantity` distinto en cada fila— el
 * resultado **no se completa con ceros**: se marca `complete: false` y se
 * nombra el hueco. Un total plausible construido sobre una escalera rota es
 * exactamente el error que esta pantalla vino a impedir (R14).
 */

/** Lo que la escalera necesita de una fila de `/catalog-prices`. */
export interface TierRow {
  tierMin: number
  /** `null` = «en adelante»: el tramo no cierra. */
  tierMax: number | null
  includedQuantity: number
  unitAmount: number
  setupAmount: number
}

/** Un peldaño del desglose: cuántas unidades cayeron aquí y a cuánto. */
export interface TierLine {
  tierMin: number
  tierMax: number | null
  units: number
  unitAmount: number
  subtotal: number
}

/** Un tramo de la escalera que nadie cubre, ya recortado a lo facturable. */
export interface TierGap {
  from: number
  to: number
}

export interface TierSimulation {
  /** La cantidad pedida, ya saneada a entero no negativo. */
  quantity: number
  includedQuantity: number
  /** Lo que de verdad entra en la escalera: `quantity - includedQuantity`, nunca negativo. */
  billableQuantity: number
  lines: TierLine[]
  /** Suma de los subtotales. Solo es el precio completo si `complete`. */
  recurringTotal: number
  /** Pago único de puesta en marcha. Va aparte: no es parte del recurrente. */
  setupTotal: number
  /** Unidades facturables que ningún tramo cubre. */
  uncoveredUnits: number
  gaps: TierGap[]
  /** Los tramos no declaran el mismo `includedQuantity`. */
  inconsistentIncluded: boolean
  /** Los tramos no declaran el mismo `setupAmount`. */
  inconsistentSetup: boolean
  /** Dos tramos se pisan: hay unidades contadas dos veces. */
  overlappingTiers: boolean
  /** `true` solo si el total cubre TODAS las unidades facturables una sola vez. */
  complete: boolean
}

/** Dinero a dos decimales, para que la suma de subtotales no arrastre el error binario. */
function money(value: number): number {
  return Math.round(value * 100) / 100
}

function sanitizeQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.floor(value)
}

const EMPTY: TierSimulation = {
  quantity: 0,
  includedQuantity: 0,
  billableQuantity: 0,
  lines: [],
  recurringTotal: 0,
  setupTotal: 0,
  uncoveredUnits: 0,
  gaps: [],
  inconsistentIncluded: false,
  inconsistentSetup: false,
  overlappingTiers: false,
  complete: false,
}

/**
 * Reparte `quantity` por la escalera de `rows` y devuelve el desglose completo.
 *
 * <p>El resultado trae **las dos cosas** que la pantalla tiene que enseñar: el
 * reparto tramo a tramo (`lines`) y el total (`recurringTotal`). Nunca uno sin
 * el otro — un total sin reparto es justo lo que dejó pasar el defecto de
 * D-66.
 */
export function simulateTiers(rows: readonly TierRow[], quantity: number): TierSimulation {
  const q = sanitizeQuantity(quantity)

  const sorted = [...rows].sort(
    (a, b) => a.tierMin - b.tierMin || (a.tierMax ?? Infinity) - (b.tierMax ?? Infinity),
  )

  // El tramo más bajo manda en lo que no es por-tramo (lo incluido y la puesta
  // en marcha). `noUncheckedIndexedAccess` obliga a mirarlo, y está bien: es la
  // misma comprobación que «no hay escalera que simular».
  const base = sorted[0]
  if (!base) return { ...EMPTY, quantity: q }

  const includedQuantity = base.includedQuantity
  const inconsistentIncluded = new Set(rows.map((row) => row.includedQuantity)).size > 1
  const inconsistentSetup = new Set(rows.map((row) => row.setupAmount)).size > 1

  const billableQuantity = Math.max(0, q - includedQuantity)

  const lines: TierLine[] = []
  const gaps: TierGap[] = []
  let overlappingTiers = false
  // Primera unidad de la escalera todavía sin dueño. Avanza tramo a tramo.
  let cursor = 1

  for (const tier of sorted) {
    const lo = Math.max(1, tier.tierMin)
    const hi = tier.tierMax ?? Infinity

    if (lo > cursor && cursor <= billableQuantity) {
      gaps.push({ from: cursor, to: Math.min(lo - 1, billableQuantity) })
    }
    if (lo < cursor) overlappingTiers = true

    if (billableQuantity >= lo) {
      const units = Math.min(billableQuantity, hi) - lo + 1
      if (units > 0) {
        lines.push({
          tierMin: tier.tierMin,
          tierMax: tier.tierMax,
          units,
          unitAmount: tier.unitAmount,
          subtotal: money(units * tier.unitAmount),
        })
      }
    }

    cursor = Math.max(cursor, hi === Infinity ? Infinity : hi + 1)
  }

  if (cursor <= billableQuantity) gaps.push({ from: cursor, to: billableQuantity })

  const uncoveredUnits = gaps.reduce((sum, gap) => sum + (gap.to - gap.from + 1), 0)
  const recurringTotal = money(lines.reduce((sum, line) => sum + line.subtotal, 0))

  return {
    quantity: q,
    includedQuantity,
    billableQuantity,
    lines,
    recurringTotal,
    setupTotal: base.setupAmount,
    uncoveredUnits,
    gaps,
    inconsistentIncluded,
    inconsistentSetup,
    overlappingTiers,
    complete: uncoveredUnits === 0 && !overlappingTiers,
  }
}

/** «1 – 8» o «9 en adelante»: cómo se nombra un tramo en la tabla y en los avisos. */
export function tierRangeLabel(tierMin: number, tierMax: number | null): string {
  return tierMax === null ? `${tierMin} en adelante` : `${tierMin} – ${tierMax}`
}
