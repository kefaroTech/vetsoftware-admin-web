import { declaredLimit } from '@/components/ui/CapacityMeter.vue'
import type { CompanyLimitEventResponse, LimitSource } from '../types/limits.types'

/**
 * **Quién está por encima de su techo, y quién cerca**, deducido del único sitio
 * del contrato donde el consumo y el techo viajan juntos.
 *
 * <p><b>Por qué de la bitácora y no de un endpoint de estado.</b> El contrato no
 * expone ninguno: `EffectiveLimitResponse` da el techo pero **no** el consumo, y
 * `/entitlements/access` cuenta por artículo del catálogo, no por eje de límite.
 * Lo que sí trae las dos cifras a la vez es `CompanyLimitEventResponse`, porque
 * cada hecho las congela en el instante en que ocurrió.
 *
 * <p><b>Y por eso esto es un «último estado conocido», no una medición en vivo.</b>
 * La pantalla lo dice con esas palabras y fecha cada fila. Un eje sobre el que
 * no ha ocurrido nada en la ventana consultada sencillamente **no aparece**: no
 * se pinta «0 de 50» sobre algo que nadie ha contado (R14 · un hueco honesto
 * antes que un dato inventado).
 */

/**
 * El veredicto de una fila.
 *
 * <p><b>`OVER` no es un error.</b> Una clínica con 400 mascotas y un techo de 100
 * es un cliente **desbordado y congelado**: conserva todo lo suyo y no puede
 * crear más. Pasa siempre que se baja un plan sin retirar lo que ya había, y es
 * el comportamiento pactado, no una avería. Por eso hay un estado propio para
 * él y no un «error».
 */
export type OverLimitState = 'OVER' | 'EXHAUSTED' | 'NEAR' | 'CLEAR' | 'UNCAPPED'

/** A partir de esta fracción del techo, la cuenta se considera «cerca». */
export const NEAR_THRESHOLD = 0.8

/** El último estado conocido de un eje para una empresa. */
export interface OverLimitRow {
  companyId: number
  limitDimensionId: number
  usedQuantity: number
  /** `null` = sin techo declarado. Un cero o un negativo se leen así, no como cupo agotado. */
  limitQuantity: number | null
  state: OverLimitState
  /** De dónde salía el techo en ese momento. Puede haber cambiado desde entonces. */
  limitSource: LimitSource
  /** Cuándo se supo. Es lo que impide leer esta tabla como si fuera de ahora mismo. */
  occurredAt: string
}

/**
 * El veredicto, con el límite ya normalizado por `declaredLimit`.
 *
 * <p>Se reutiliza esa función —la del propio `CapacityMeter`— en vez de repetir
 * la regla: «cero o negativo se trata como ausencia de techo» tiene que
 * significar lo mismo en la tabla y en la barra, o la pantalla dirá «agotado»
 * donde el medidor dice «sin límite».
 */
export function overLimitState(usedQuantity: number, limitQuantity: number | null): OverLimitState {
  const limit = declaredLimit(limitQuantity)
  if (limit === null) return 'UNCAPPED'
  if (usedQuantity > limit) return 'OVER'
  if (usedQuantity === limit) return 'EXHAUSTED'
  if (usedQuantity >= limit * NEAR_THRESHOLD) return 'NEAR'
  return 'CLEAR'
}

/** Lo que se atiende primero. `UNCAPPED` y `CLEAR` no piden nada de nadie. */
const ORDEN: Record<OverLimitState, number> = {
  OVER: 0,
  EXHAUSTED: 1,
  NEAR: 2,
  CLEAR: 3,
  UNCAPPED: 4,
}

/**
 * `true` si esta fila requiere que alguien haga algo. Es el filtro de la
 * pantalla: sin él, el eje holgado del que hubo un aviso hace dos meses
 * competiría por el sitio con el cliente que hoy no puede facturar.
 */
export function needsAttention(state: OverLimitState): boolean {
  return state === 'OVER' || state === 'EXHAUSTED' || state === 'NEAR'
}

/**
 * ¿Qué hecho manda dentro de un eje? El más reciente.
 *
 * <p>Se compara por `occurredAt` y se desempata por `id`. El desempate no es
 * cosmético: dos hechos del mismo instante —un aviso y el portazo que lo sigue
 * dentro de la misma transacción— llegan con la misma marca de tiempo, y sin él
 * el orden lo decidiría el del array, que es el del servidor y no está
 * garantizado.
 */
function esMasReciente(
  candidato: CompanyLimitEventResponse,
  actual: CompanyLimitEventResponse,
): boolean {
  if (candidato.occurredAt !== actual.occurredAt) return candidato.occurredAt > actual.occurredAt
  return candidato.id > actual.id
}

/**
 * Reduce el feed a **una fila por eje**: la del hecho más reciente.
 *
 * <p>Devuelve las filas ordenadas por urgencia (desbordado, agotado, cerca, y
 * después lo demás) y, dentro de cada grupo, por fecha descendente.
 */
export function summarizeOverLimit(events: CompanyLimitEventResponse[]): OverLimitRow[] {
  const ultimoPorEje = new Map<number, CompanyLimitEventResponse>()

  for (const event of events) {
    const actual = ultimoPorEje.get(event.limitDimensionId)
    if (actual === undefined || esMasReciente(event, actual)) {
      ultimoPorEje.set(event.limitDimensionId, event)
    }
  }

  return [...ultimoPorEje.values()]
    .map<OverLimitRow>((event) => ({
      companyId: event.companyId,
      limitDimensionId: event.limitDimensionId,
      usedQuantity: event.usedQuantity,
      limitQuantity: declaredLimit(event.limitQuantity),
      state: overLimitState(event.usedQuantity, event.limitQuantity),
      limitSource: event.limitSource,
      occurredAt: event.occurredAt,
    }))
    .sort((a, b) => {
      const porEstado = ORDEN[a.state] - ORDEN[b.state]
      if (porEstado !== 0) return porEstado
      return a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0
    })
}

/**
 * El titular de la pantalla, en una frase que se pueda leer en voz alta.
 *
 * <p>Distingue los tres casos que no se pueden pintar igual: no se ha preguntado
 * todavía, se preguntó y no hay nada que atender, y hay cuentas que atender.
 */
export function overLimitHeadline(rows: OverLimitRow[]): string {
  const desbordadas = rows.filter((r) => r.state === 'OVER').length
  const agotadas = rows.filter((r) => r.state === 'EXHAUSTED').length
  const cerca = rows.filter((r) => r.state === 'NEAR').length

  if (desbordadas + agotadas + cerca === 0) {
    return 'Ningún eje pide atención en esta ventana'
  }

  const partes: string[] = []
  if (desbordadas > 0)
    partes.push(desbordadas === 1 ? '1 eje desbordado' : `${desbordadas} ejes desbordados`)
  if (agotadas > 0) partes.push(agotadas === 1 ? '1 eje agotado' : `${agotadas} ejes agotados`)
  if (cerca > 0)
    partes.push(cerca === 1 ? '1 eje cerca del techo' : `${cerca} ejes cerca del techo`)
  return partes.join(' · ')
}
