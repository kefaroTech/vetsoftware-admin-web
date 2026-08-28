import { describe, expect, it } from 'vitest'
import {
  needsAttention,
  overLimitHeadline,
  overLimitState,
  summarizeOverLimit,
} from '@/features/limits/composables/overLimitAccounts'
import type { CompanyLimitEventResponse } from '@/features/limits/types/limits.types'

function evento(patch: Partial<CompanyLimitEventResponse> = {}): CompanyLimitEventResponse {
  return {
    id: 1,
    companyId: 42,
    limitDimensionId: 7,
    eventType: 'THRESHOLD_WARNED',
    limitQuantity: 100,
    usedQuantity: 50,
    requestedDelta: 1,
    limitSource: 'SUBSCRIPTION',
    overrideId: null,
    actorEmployeeId: null,
    actorSystemUserId: null,
    actorIsProcess: false,
    reasonCode: null,
    reason: null,
    occurredAt: '2026-03-01T10:00:00',
    ...patch,
  }
}

describe('el veredicto de un eje', () => {
  /**
   * El caso del enunciado: 400 mascotas con techo de 100. No es un error, es una
   * cuenta desbordada y congelada — y por eso tiene un estado propio.
   */
  it('un consumo por encima del techo es «desbordada», no un fallo', () => {
    expect(overLimitState(400, 100)).toBe('OVER')
  })

  it('justo en el techo es agotado, no desbordado', () => {
    expect(overLimitState(100, 100)).toBe('EXHAUSTED')
  })

  it('a partir del 80 % del techo se considera cerca', () => {
    expect(overLimitState(80, 100)).toBe('NEAR')
    expect(overLimitState(79, 100)).toBe('CLEAR')
  })

  /**
   * Un techo de cero o negativo se lee como ausencia de techo, igual que en
   * `CapacityMeter`: casi siempre es un dato que el backend no calculó. Tratarlo
   * como cupo agotado diría «no puede crear nada» sobre una cuenta sin tope.
   */
  it('cero, negativo y nulo son «sin techo», nunca cupo agotado', () => {
    expect(overLimitState(5, 0)).toBe('UNCAPPED')
    expect(overLimitState(5, -3)).toBe('UNCAPPED')
    expect(overLimitState(5, null)).toBe('UNCAPPED')
  })

  it('solo piden atención el desborde, el agotado y el que se acerca', () => {
    expect(needsAttention('OVER')).toBe(true)
    expect(needsAttention('EXHAUSTED')).toBe(true)
    expect(needsAttention('NEAR')).toBe(true)
    expect(needsAttention('CLEAR')).toBe(false)
    expect(needsAttention('UNCAPPED')).toBe(false)
  })
})

describe('reducir la bitácora al último estado conocido', () => {
  it('deja una sola fila por eje: la del hecho más reciente', () => {
    const filas = summarizeOverLimit([
      evento({ id: 1, limitDimensionId: 7, usedQuantity: 10, occurredAt: '2026-03-01T10:00:00' }),
      evento({ id: 2, limitDimensionId: 7, usedQuantity: 95, occurredAt: '2026-03-09T10:00:00' }),
    ])
    expect(filas).toHaveLength(1)
    expect(filas[0]!.usedQuantity).toBe(95)
    expect(filas[0]!.state).toBe('NEAR')
  })

  /**
   * Dos hechos del mismo instante —un aviso y el portazo que lo sigue dentro de
   * la misma transacción— llegan con idéntica marca de tiempo. Sin desempate por
   * `id`, el que mandara lo decidiría el orden del array, que es el del servidor
   * y no está garantizado.
   */
  it('desempata por id cuando dos hechos comparten la marca de tiempo', () => {
    const mismoInstante = '2026-03-09T10:00:00'
    const filas = summarizeOverLimit([
      evento({ id: 9, limitDimensionId: 7, usedQuantity: 100, occurredAt: mismoInstante }),
      evento({ id: 4, limitDimensionId: 7, usedQuantity: 99, occurredAt: mismoInstante }),
    ])
    expect(filas[0]!.usedQuantity).toBe(100)

    // Y con el array al revés, el resultado es el mismo.
    const alReves = summarizeOverLimit([
      evento({ id: 4, limitDimensionId: 7, usedQuantity: 99, occurredAt: mismoInstante }),
      evento({ id: 9, limitDimensionId: 7, usedQuantity: 100, occurredAt: mismoInstante }),
    ])
    expect(alReves[0]!.usedQuantity).toBe(100)
  })

  it('ordena por urgencia: primero lo desbordado, al final lo que no pide nada', () => {
    const filas = summarizeOverLimit([
      evento({ id: 1, limitDimensionId: 1, usedQuantity: 10, limitQuantity: 100 }),
      evento({ id: 2, limitDimensionId: 2, usedQuantity: 400, limitQuantity: 100 }),
      evento({ id: 3, limitDimensionId: 3, usedQuantity: 90, limitQuantity: 100 }),
      evento({ id: 4, limitDimensionId: 4, usedQuantity: 100, limitQuantity: 100 }),
      evento({ id: 5, limitDimensionId: 5, usedQuantity: 7, limitQuantity: 0 }),
    ])
    expect(filas.map((f) => f.state)).toEqual(['OVER', 'EXHAUSTED', 'NEAR', 'CLEAR', 'UNCAPPED'])
  })

  /** Un eje sin hechos no aparece: no se pinta «0 de 50» sobre lo que nadie contó. */
  it('un feed vacío no fabrica filas', () => {
    expect(summarizeOverLimit([])).toEqual([])
  })

  it('el techo cero llega a la fila como ausencia de techo, no como 0', () => {
    const [fila] = summarizeOverLimit([evento({ limitQuantity: 0, usedQuantity: 7 })])
    expect(fila!.limitQuantity).toBeNull()
  })
})

describe('el titular de cuentas desbordadas', () => {
  it('cuando no hay nada que atender lo dice, sin celebrarlo como un logro', () => {
    const filas = summarizeOverLimit([
      evento({ limitDimensionId: 1, usedQuantity: 10, limitQuantity: 100 }),
    ])
    expect(overLimitHeadline(filas)).toBe('Ningún eje pide atención en esta ventana')
  })

  it('enumera los tres grupos y concuerda en singular y plural', () => {
    const filas = summarizeOverLimit([
      evento({ id: 1, limitDimensionId: 1, usedQuantity: 400, limitQuantity: 100 }),
      evento({ id: 2, limitDimensionId: 2, usedQuantity: 300, limitQuantity: 100 }),
      evento({ id: 3, limitDimensionId: 3, usedQuantity: 100, limitQuantity: 100 }),
      evento({ id: 4, limitDimensionId: 4, usedQuantity: 90, limitQuantity: 100 }),
    ])
    expect(overLimitHeadline(filas)).toBe(
      '2 ejes desbordados · 1 eje agotado · 1 eje cerca del techo',
    )
  })
})
