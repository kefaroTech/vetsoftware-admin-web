import type {
  ConfiguratorEffectResponse,
  ConfiguratorEffectType,
  EffectPriorityRequest,
} from '../types/configurator.types'

/**
 * El orden en que se aplican los efectos, y por qué se puede ver y corregir.
 *
 * ── El defecto que existe hoy ─────────────────────────────────────────────
 *
 * El resolutor del backend aplica los efectos disparados **en orden ascendente
 * de `priority`** y a igualdad desempata el `id`. El último que toca un
 * artículo es el que manda. Con dos efectos sobre el mismo artículo —uno que lo
 * añade porque el prospecto «vende productos» y otro que lo quita porque hace
 * «solo estética»— quien marque **las dos cosas** se queda sin el artículo si el
 * `REMOVE` va detrás.
 *
 * <p>Eso convierte marcar más servicios en un carrito más pequeño, que es
 * exactamente lo contrario de lo que el comercial cree estar configurando. La
 * consola ya recibía `priority` en el contrato y **nadie lo leía**: la lista
 * salía en el orden en que el servidor devolviera las filas, así que ni el
 * orden real se veía ni se podía cambiar sin borrar y recrear los efectos.
 *
 * ── Qué hace este módulo ──────────────────────────────────────────────────
 *
 * Funciones puras, sin Vue y sin red, porque son las que deciden lo que se ve y
 * las que una prueba puede barrer sin montar nada: ordenar, mover, detectar los
 * choques y traducir la lista visible al cuerpo de
 * `PUT /configurator/effects/priorities`.
 */

/** Los efectos que **meten o mantienen** el artículo en el carrito. */
const ADDITIVE: readonly ConfiguratorEffectType[] = [
  'ADD',
  'SET_QUANTITY',
  'QUANTITY_FROM_ANSWER',
] as const

export function isAdditive(effect: ConfiguratorEffectType): boolean {
  return ADDITIVE.includes(effect)
}

/**
 * Lo mínimo que hace falta para ordenar. Se escribe estructural y no como
 * `ConfiguratorEffectResponse` para que las pruebas puedan construir un caso con
 * tres campos en vez de con nueve.
 */
export type OrderableEffect = Pick<
  ConfiguratorEffectResponse,
  'id' | 'priority' | 'catalogItemId' | 'effect'
>

/**
 * El orden **real** de aplicación: prioridad ascendente y, a igualdad, el id.
 *
 * <p>Es el mismo criterio que el backend, escrito una sola vez. Si el servidor
 * cambia el desempate, este es el único punto que hay que tocar — y hasta
 * entonces la pantalla enseña el orden que de verdad se ejecuta, no uno
 * plausible.
 */
export function applicationOrder<T extends OrderableEffect>(effects: readonly T[]): T[] {
  return [...effects].sort((a, b) => a.priority - b.priority || a.id - b.id)
}

/**
 * Mueve un efecto una posición y devuelve **una lista nueva**. Fuera de rango
 * devuelve la misma lista sin tocar, que es lo que deja al componente llamar sin
 * comprobar los bordes.
 */
export function moveByOne<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list]
  const next = [...list]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved as T)
  return next
}

/**
 * El paso entre prioridades consecutivas.
 *
 * <p>No es 1 a propósito: dejar hueco permite que el backend —o una futura
 * pantalla— intercale un efecto entre dos sin renumerar la lista entera. Con
 * paso 10 y el techo de 9999 del contrato caben 1000 efectos, muy por encima de
 * las decenas que tiene el cuestionario. {@link priorityStepFor} baja el paso
 * cuando no cabe, en vez de emitir un número que el servidor rechazaría con un
 * 400 y el operador delante.
 */
export const PRIORITY_STEP = 10

/** El máximo que acepta `EffectPriorityRequest.priority` (`@Max(9999)`). */
export const MAX_PRIORITY = 9999

export function priorityStepFor(count: number): number {
  if (count <= 1) return PRIORITY_STEP
  const step = Math.floor(MAX_PRIORITY / (count - 1))
  return Math.max(1, Math.min(PRIORITY_STEP, step))
}

/**
 * Traduce la lista visible al cuerpo del endpoint.
 *
 * <p><b>Se renumera la lista entera, no solo lo que se movió.</b> Mandar solo el
 * efecto arrastrado deja al resto con los números viejos, y basta con que dos
 * coincidan para que el orden lo decida el desempate por `id` — un orden que
 * nadie eligió y que además cambia al recrear un efecto. Renumerar de una vez es
 * la única forma de que lo que se ve sea lo que queda escrito.
 */
export function toPriorityPayload(ordered: readonly OrderableEffect[]): EffectPriorityRequest[] {
  const step = priorityStepFor(ordered.length)
  return ordered.map((effect, index) => ({ effectId: effect.id, priority: index * step }))
}

/** ¿Difiere el orden que el operador ve del que está guardado? */
export function orderChanged(
  ordered: readonly OrderableEffect[],
  saved: readonly OrderableEffect[],
): boolean {
  const savedOrder = applicationOrder(saved)
  if (savedOrder.length !== ordered.length) return true
  return ordered.some((effect, index) => savedOrder[index]?.id !== effect.id)
}

/**
 * Un artículo que dos o más efectos se disputan, y quién gana hoy.
 *
 * <p>`losesIt` es el caso que importa: hay efectos que lo meten en el carrito y
 * el que se aplica el último lo saca. Ese es el «marcar más servicios produce un
 * carrito más pequeño» del informe, y es el que la pantalla tiene que señalar sin
 * que nadie lo busque.
 */
export interface EffectConflict<T extends OrderableEffect = OrderableEffect> {
  catalogItemId: number
  /** Los efectos en disputa, ya en orden de aplicación. */
  effects: T[]
  /** El último que se aplica: el que decide. */
  winner: T
  /** `true` si gana un `REMOVE` habiendo al menos un efecto que lo añadía. */
  losesIt: boolean
}

/**
 * Los artículos sobre los que mandan dos o más efectos, en el orden en que
 * aparece cada disputa.
 *
 * <p><b>No se filtra por disparador ni se simula el cuestionario.</b> Dos efectos
 * sobre el mismo artículo se pisan **solo si sus dos disparadores se cumplen a la
 * vez**, y saber eso exige resolver el cuestionario entero contra un escenario
 * concreto — que es justo lo que hace la pestaña «Probarlo» y no puede hacerse
 * aquí sin llamar al servidor por cada combinación. Así que esto señala la
 * disputa **posible**, y lo dice con esas palabras: es un aviso para mirar, no un
 * veredicto. Callarla porque a lo mejor no se dan a la vez es como se llegó a
 * tener el defecto suelto durante meses.
 */
export function effectConflicts<T extends OrderableEffect>(
  ordered: readonly T[],
): EffectConflict<T>[] {
  const byItem = new Map<number, T[]>()
  for (const effect of ordered) {
    const list = byItem.get(effect.catalogItemId) ?? []
    list.push(effect)
    byItem.set(effect.catalogItemId, list)
  }

  const conflicts: EffectConflict<T>[] = []
  for (const [catalogItemId, effects] of byItem) {
    if (effects.length < 2) continue
    const winner = effects[effects.length - 1] as T
    conflicts.push({
      catalogItemId,
      effects,
      winner,
      losesIt: winner.effect === 'REMOVE' && effects.some((e) => isAdditive(e.effect)),
    })
  }
  return conflicts
}

/** Los ids de los efectos que participan en alguna disputa, para marcarlos en la lista. */
export function conflictedEffectIds(
  conflicts: readonly EffectConflict<OrderableEffect>[],
): Set<number> {
  const ids = new Set<number>()
  for (const conflict of conflicts) {
    for (const effect of conflict.effects) ids.add(effect.id)
  }
  return ids
}
