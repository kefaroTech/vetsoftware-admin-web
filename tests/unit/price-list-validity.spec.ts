import { describe, it, expect } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import {
  businessToday,
  overlappingPriceLists,
  priceListEffectiveness,
  readNotEffectiveWindow,
} from '@/features/commercial-catalog/composables/priceListValidity'
import type {
  PriceListResponse,
  PriceListStatus,
} from '@/features/commercial-catalog/types/commercial-catalog.types'
import { elemento } from '../helpers/exigir'

/**
 * Vigencia por fecha de la lista de precios (D-73, épica E4).
 *
 * Tres propiedades, y las tres son de dinero:
 *
 * 1. **«Hoy» es el día del negocio, no el del navegador.** Un operador en otro
 *    huso no puede ver caducada una tarifa que en Bogotá sigue vigente.
 * 2. **Publicada no es vigente.** Son dos preguntas distintas y la pantalla
 *    tenía respuesta solo para la primera.
 * 3. **Dos publicadas que se pisan son dos precios válidos el mismo día**, que
 *    es cómo dos comerciales firman cifras distintas teniendo los dos razón.
 */

function priceList(
  id: number,
  name: string,
  validFrom: string,
  validTo: string | null,
  status: PriceListStatus = 'PUBLISHED',
  enabled = true,
): PriceListResponse {
  return {
    id,
    code: `PL-${id}`,
    name,
    currency: 'COP',
    validFrom,
    validTo,
    status,
    publishedAt: status === 'PUBLISHED' ? '2026-01-01T00:00:00' : null,
    publishedBySystemUserId: null,
    createdDate: '2026-01-01T00:00:00',
    enabled,
  }
}

function problemDetail(code: string, extra: Record<string, unknown> = {}) {
  const response = {
    status: 409,
    data: { code, title: 'Conflicto', detail: 'La tarifa no está vigente', ...extra },
    statusText: 'Conflict',
    headers: {},
    config: {},
  } as unknown as AxiosResponse
  return new AxiosError('conflict', 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

describe('«hoy» se resuelve en la zona del negocio, no en la del navegador', () => {
  it('a las 02:00 UTC del 27 en Bogotá todavía es el 26', () => {
    // Es la ventana en la que el reloj del navegador de un operador europeo ya
    // pasó de día y el del negocio no: ahí una tarifa que caduca el 26 se vería
    // caducada un día entero antes de tiempo.
    expect(businessToday(new Date('2026-08-27T02:00:00Z'))).toBe('2026-08-26')
  })

  it('a mediodía UTC el día del negocio ya coincide', () => {
    expect(businessToday(new Date('2026-08-27T12:00:00Z'))).toBe('2026-08-27')
  })

  it('devuelve siempre un `yyyy-MM-dd` comparable como texto', () => {
    expect(businessToday(new Date('2026-01-05T18:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('una lista publicada puede no estar vigente', () => {
  it('la que aún no empieza dice cuándo entra en vigor', () => {
    const efecto = priceListEffectiveness({ validFrom: '2026-09-01', validTo: null }, '2026-08-27')
    expect(efecto.level).toBe('futura')
    expect(efecto.label).toBe('Entra en vigor el 01/09/2026')
  })

  it('el primer día de la ventana ya está vigente', () => {
    expect(
      priceListEffectiveness({ validFrom: '2026-08-27', validTo: '2026-12-31' }, '2026-08-27')
        .level,
    ).toBe('vigente')
  })

  it('el último día de la ventana todavía está vigente', () => {
    expect(
      priceListEffectiveness({ validFrom: '2026-01-01', validTo: '2026-08-27' }, '2026-08-27')
        .level,
    ).toBe('vigente')
  })

  it('el día siguiente al cierre ya caducó, y dice cuándo', () => {
    const efecto = priceListEffectiveness(
      { validFrom: '2026-01-01', validTo: '2026-08-26' },
      '2026-08-27',
    )
    expect(efecto.level).toBe('caducada')
    expect(efecto.label).toBe('Caducó el 26/08/2026')
  })

  it('sin fecha final no caduca nunca', () => {
    const efecto = priceListEffectiveness({ validFrom: '2020-01-01', validTo: null }, '2026-08-27')
    expect(efecto.level).toBe('vigente')
    expect(efecto.label).toBe('Vigente, sin fecha final')
  })

  it('con la fecha rota dice que no se sabe, en vez de suponer', () => {
    const efecto = priceListEffectiveness({ validFrom: '', validTo: null }, '2026-08-27')
    expect(efecto.level).toBe('desconocida')
    expect(efecto.variant).toBe('neutral')
  })

  it('cada caso lleva su texto: el tono no es el único portador (WCAG 2.2 §1.4.1)', () => {
    const casos = [
      priceListEffectiveness({ validFrom: '2026-09-01', validTo: null }, '2026-08-27'),
      priceListEffectiveness({ validFrom: '2026-01-01', validTo: null }, '2026-08-27'),
      priceListEffectiveness({ validFrom: '2020-01-01', validTo: '2021-01-01' }, '2026-08-27'),
    ]
    for (const caso of casos) expect(caso.label.length).toBeGreaterThan(0)
  })
})

describe('dos tarifas publicadas que se pisan', () => {
  it('las detecta y devuelve el trozo de calendario compartido', () => {
    const solapes = overlappingPriceLists([
      priceList(1, 'Tarifa 2026', '2026-01-01', '2026-12-31'),
      priceList(2, 'Tarifa 2026 H2', '2026-07-01', '2027-06-30'),
    ])
    expect(solapes).toHaveLength(1)
    expect(elemento(solapes, 0, 'los solapes detectados').from).toBe('2026-07-01')
    expect(elemento(solapes, 0, 'los solapes detectados').to).toBe('2026-12-31')
  })

  it('dos ventanas consecutivas que no se tocan no son un solape', () => {
    expect(
      overlappingPriceLists([
        priceList(1, 'Tarifa 2026', '2026-01-01', '2026-06-30'),
        priceList(2, 'Tarifa 2026 H2', '2026-07-01', '2026-12-31'),
      ]),
    ).toEqual([])
  })

  it('una lista sin fecha final se pisa con todo lo que empiece después', () => {
    const solapes = overlappingPriceLists([
      priceList(1, 'Tarifa base', '2020-01-01', null),
      priceList(2, 'Tarifa 2026', '2026-01-01', '2026-12-31'),
    ])
    expect(solapes).toHaveLength(1)
    expect(elemento(solapes, 0, 'los solapes detectados').to).toBe('2026-12-31')
  })

  it('dos abiertas dan un solape sin fecha final', () => {
    const solapes = overlappingPriceLists([
      priceList(1, 'A', '2020-01-01', null),
      priceList(2, 'B', '2026-01-01', null),
    ])
    expect(elemento(solapes, 0, 'los solapes detectados').to).toBeNull()
  })

  it('los borradores no cuentan: solapar mientras se prepara la subida es lo normal', () => {
    expect(
      overlappingPriceLists([
        priceList(1, 'Tarifa 2026', '2026-01-01', '2026-12-31'),
        priceList(2, 'Borrador 2027', '2026-06-01', '2027-12-31', 'DRAFT'),
      ]),
    ).toEqual([])
  })

  it('las archivadas tampoco: ya no cotizan', () => {
    expect(
      overlappingPriceLists([
        priceList(1, 'Tarifa 2026', '2026-01-01', '2026-12-31'),
        priceList(2, 'Vieja', '2026-06-01', '2027-12-31', 'ARCHIVED'),
      ]),
    ).toEqual([])
  })

  it('una publicada pero deshabilitada no cuenta', () => {
    expect(
      overlappingPriceLists([
        priceList(1, 'Tarifa 2026', '2026-01-01', '2026-12-31'),
        priceList(2, 'Apagada', '2026-06-01', '2027-12-31', 'PUBLISHED', false),
      ]),
    ).toEqual([])
  })
})

describe('el 409 de D-73 se traduce sin parsear la prosa', () => {
  it('lee la ventana de las propiedades del ProblemDetail', () => {
    const ventana = readNotEffectiveWindow(
      problemDetail('PRICE_LIST_NOT_EFFECTIVE', {
        validFrom: '2026-01-01',
        validTo: '2026-06-30',
        effectiveOn: '2026-08-27',
      }),
    )
    expect(ventana).toEqual({
      validFrom: '2026-01-01',
      validTo: '2026-06-30',
      effectiveOn: '2026-08-27',
    })
  })

  it('con el código deja los huecos a null en vez de inventar fechas', () => {
    expect(readNotEffectiveWindow(problemDetail('PRICE_LIST_NOT_EFFECTIVE'))).toEqual({
      validFrom: null,
      validTo: null,
      effectiveOn: null,
    })
  })

  it('descarta una fecha con forma que no es la del contrato', () => {
    const ventana = readNotEffectiveWindow(
      problemDetail('PRICE_LIST_NOT_EFFECTIVE', { validFrom: '01/01/2026' }),
    )
    expect(ventana?.validFrom).toBeNull()
  })

  it('cualquier otro error no es este banner', () => {
    expect(readNotEffectiveWindow(problemDetail('PRICE_LIST_ALREADY_PUBLISHED'))).toBeNull()
    expect(readNotEffectiveWindow(new Error('red caída'))).toBeNull()
    expect(readNotEffectiveWindow(null)).toBeNull()
  })
})
