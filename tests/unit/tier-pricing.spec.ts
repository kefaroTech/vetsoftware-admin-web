import { describe, it, expect } from 'vitest'
import {
  simulateTiers,
  tierRangeLabel,
  type TierRow,
} from '@/features/commercial-catalog/composables/tierPricing'
import { elemento } from '../helpers/exigir'

/**
 * El simulador de tramos acumulativos (D-66, épica E5).
 *
 * Lo que se afirma aquí es **la aritmética del dinero**, que es el defecto más
 * caro que se cerró en esta campaña: la diferencia entre repartir las unidades
 * por la escalera y multiplicarlo todo por el precio del tramo que cubre el
 * total son veinticuatro mil pesos por cliente y mes, sin que nada falle ni
 * nadie se entere.
 */

/** El caso de la ficha: dos incluidos, 1–8 a 12.000 y 9+ a 9.000. */
const ESCALERA: TierRow[] = [
  { tierMin: 1, tierMax: 8, includedQuantity: 2, unitAmount: 12_000, setupAmount: 0 },
  { tierMin: 9, tierMax: null, includedQuantity: 2, unitAmount: 9_000, setupAmount: 0 },
]

describe('quince usuarios cuestan 141.000 y no 117.000', () => {
  it('reparte las trece unidades facturables por la escalera, tramo a tramo', () => {
    const resultado = simulateTiers(ESCALERA, 15)

    expect(resultado.includedQuantity).toBe(2)
    expect(resultado.billableQuantity).toBe(13)
    expect(resultado.lines).toEqual([
      { tierMin: 1, tierMax: 8, units: 8, unitAmount: 12_000, subtotal: 96_000 },
      { tierMin: 9, tierMax: null, units: 5, unitAmount: 9_000, subtotal: 45_000 },
    ])
    expect(resultado.recurringTotal).toBe(141_000)
    expect(resultado.complete).toBe(true)
  })

  it('no da 117.000, que es lo que sale de multiplicar todo por el tramo que cubre el total', () => {
    // 13 × 9.000 = 117.000 es la aritmética plana. Si esta aserción cae, el
    // simulador volvió a confundir «el tramo que cubre la cantidad» con «los
    // tramos acumulados» y la consola está enseñando 24.000 de menos.
    expect(simulateTiers(ESCALERA, 15).recurringTotal).not.toBe(117_000)
  })

  it('descuenta lo incluido ANTES de entrar en la escalera, no después', () => {
    // Si `includedQuantity` se descontara al final, el primer tramo aportaría
    // seis unidades (3–8) y el total sería 96.000 − 24.000 + 45.000 = 117.000.
    const resultado = simulateTiers(ESCALERA, 15)
    expect(elemento(resultado.lines, 0, 'las líneas simuladas').units).toBe(8)
  })
})

describe('los bordes de la escalera', () => {
  it('con la cantidad justa de lo incluido no factura ninguna unidad', () => {
    const resultado = simulateTiers(ESCALERA, 2)
    expect(resultado.billableQuantity).toBe(0)
    expect(resultado.lines).toEqual([])
    expect(resultado.recurringTotal).toBe(0)
    // El cero es real —no hay nada que cobrar—, así que la escalera sigue sana.
    expect(resultado.complete).toBe(true)
  })

  it('con una sola unidad facturable no se asoma al segundo tramo', () => {
    const resultado = simulateTiers(ESCALERA, 3)
    expect(resultado.lines).toHaveLength(1)
    expect(resultado.recurringTotal).toBe(12_000)
  })

  it('en el primer escalón del segundo tramo cobra ocho al alto y uno al bajo', () => {
    const resultado = simulateTiers(ESCALERA, 11)
    expect(resultado.lines.map((line) => line.units)).toEqual([8, 1])
    expect(resultado.recurringTotal).toBe(105_000)
  })

  it('ordena la escalera aunque las filas lleguen del revés', () => {
    const desordenada = [
      elemento(ESCALERA, 1, 'la escalera de tramos'),
      elemento(ESCALERA, 0, 'la escalera de tramos'),
    ]
    expect(simulateTiers(desordenada, 15).recurringTotal).toBe(141_000)
  })

  it('una cantidad negativa o absurda no factura nada en vez de restar dinero', () => {
    expect(simulateTiers(ESCALERA, -4).recurringTotal).toBe(0)
    expect(simulateTiers(ESCALERA, Number.NaN).quantity).toBe(0)
  })
})

describe('un hueco honesto antes que un total inventado (R14)', () => {
  it('sin tramos no hay simulación, y lo dice en vez de devolver cero como si fuera el precio', () => {
    const resultado = simulateTiers([], 15)
    expect(resultado.recurringTotal).toBe(0)
    expect(resultado.complete).toBe(false)
  })

  it('nombra las unidades que ningún tramo cubre', () => {
    const rota: TierRow[] = [
      { tierMin: 1, tierMax: 8, includedQuantity: 0, unitAmount: 12_000, setupAmount: 0 },
      { tierMin: 12, tierMax: 20, includedQuantity: 0, unitAmount: 9_000, setupAmount: 0 },
    ]
    const resultado = simulateTiers(rota, 15)

    expect(resultado.gaps).toEqual([{ from: 9, to: 11 }])
    expect(resultado.uncoveredUnits).toBe(3)
    expect(resultado.complete).toBe(false)
    // El total sigue sumando lo que sí está cubierto: 8 × 12.000 + 4 × 9.000.
    expect(resultado.recurringTotal).toBe(132_000)
  })

  it('marca el hueco cuando la escalera no empieza en la unidad 1', () => {
    const tardia: TierRow[] = [
      { tierMin: 5, tierMax: null, includedQuantity: 0, unitAmount: 10_000, setupAmount: 0 },
    ]
    const resultado = simulateTiers(tardia, 6)
    expect(resultado.gaps).toEqual([{ from: 1, to: 4 }])
    expect(resultado.complete).toBe(false)
  })

  it('detecta dos tramos que se pisan, porque el total cuenta unidades dos veces', () => {
    const pisados: TierRow[] = [
      { tierMin: 1, tierMax: 10, includedQuantity: 0, unitAmount: 12_000, setupAmount: 0 },
      { tierMin: 8, tierMax: null, includedQuantity: 0, unitAmount: 9_000, setupAmount: 0 },
    ]
    const resultado = simulateTiers(pisados, 12)
    expect(resultado.overlappingTiers).toBe(true)
    expect(resultado.complete).toBe(false)
  })

  it('avisa cuando los tramos declaran cantidades incluidas distintas', () => {
    const incoherente: TierRow[] = [
      { tierMin: 1, tierMax: 8, includedQuantity: 2, unitAmount: 12_000, setupAmount: 0 },
      { tierMin: 9, tierMax: null, includedQuantity: 5, unitAmount: 9_000, setupAmount: 0 },
    ]
    const resultado = simulateTiers(incoherente, 15)
    expect(resultado.inconsistentIncluded).toBe(true)
    // Se usa la del tramo más bajo, y el aviso lo dice: no se elige en silencio.
    expect(resultado.includedQuantity).toBe(2)
  })

  it('avisa cuando los tramos declaran puestas en marcha distintas', () => {
    const incoherente: TierRow[] = [
      { tierMin: 1, tierMax: 8, includedQuantity: 0, unitAmount: 12_000, setupAmount: 50_000 },
      { tierMin: 9, tierMax: null, includedQuantity: 0, unitAmount: 9_000, setupAmount: 80_000 },
    ]
    const resultado = simulateTiers(incoherente, 15)
    expect(resultado.inconsistentSetup).toBe(true)
    expect(resultado.setupTotal).toBe(50_000)
  })
})

describe('el pago único va aparte del recurrente', () => {
  it('no se suma al total del ciclo', () => {
    const conSetup: TierRow[] = [
      { tierMin: 1, tierMax: null, includedQuantity: 0, unitAmount: 10_000, setupAmount: 250_000 },
    ]
    const resultado = simulateTiers(conSetup, 3)
    expect(resultado.recurringTotal).toBe(30_000)
    expect(resultado.setupTotal).toBe(250_000)
  })
})

describe('el reparto se lee sin traducir', () => {
  it('nombra el tramo cerrado con sus dos extremos y el abierto con «en adelante»', () => {
    expect(tierRangeLabel(1, 8)).toBe('1 – 8')
    expect(tierRangeLabel(9, null)).toBe('9 en adelante')
  })
})
