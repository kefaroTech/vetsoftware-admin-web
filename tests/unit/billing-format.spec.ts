import { describe, expect, it } from 'vitest'
import {
  agingText,
  daysSince,
  endOfDayInstant,
  hoursSince,
  isPendingStale,
  startOfDayInstant,
} from '@/features/billing-operations/composables/billingFormat'

/**
 * La antigüedad es el único criterio de urgencia de `/cobranza`: el endpoint no
 * admite orden ni filtro, así que lo único que le dice al operador cuál atender
 * primero es esta columna. Un error de un día aquí reordena su trabajo.
 */
describe('daysSince cuenta días de calendario, no diferencias de instantes', () => {
  it('no cuenta 0 días para algo emitido anteayer por la noche', () => {
    // Consultado hoy a las 00:10; el documento se emitió anteayer.
    const now = new Date(2026, 7, 24, 0, 10)
    expect(daysSince('2026-08-22T23:50:00', now)).toBe(2)
  })

  it('cuenta el día de hoy como 0 sea cual sea la hora', () => {
    expect(daysSince('2026-08-24', new Date(2026, 7, 24, 23, 59))).toBe(0)
  })

  it('no se corre de día por la zona horaria de Bogotá', () => {
    // `new Date('2026-03-03')` se interpreta como UTC y en UTC-5 cae el día 2.
    expect(daysSince('2026-03-03', new Date(2026, 2, 3, 8, 0))).toBe(0)
  })

  it('devuelve null cuando la fecha no es parseable en vez de imprimir «hace 0 días»', () => {
    expect(daysSince(null)).toBeNull()
    expect(daysSince('')).toBeNull()
    expect(daysSince('2026-02-31')).toBeNull()
  })
})

describe('agingText dice la antigüedad en palabras', () => {
  it('distingue el singular del plural', () => {
    expect(agingText(1)).toBe('hace 1 día')
    expect(agingText(14)).toBe('hace 14 días')
  })

  it('dice «hoy» en vez de «hace 0 días»', () => {
    expect(agingText(0)).toBe('hoy')
  })

  it('no esconde una fecha rota detrás de un número', () => {
    expect(agingText(null)).toBe('—')
  })

  it('nombra una fecha futura en vez de imprimir un negativo', () => {
    expect(agingText(-3)).toBe('en el futuro')
  })
})

describe('hoursSince cuenta por diferencia de instantes, no por día de calendario', () => {
  it('distingue 40 minutos de 3 horas aunque caigan en el mismo día', () => {
    const now = new Date(2026, 8, 6, 15, 0)
    expect(hoursSince('2026-09-06T14:20:00', now)).toBeCloseTo(2 / 3, 5)
    expect(hoursSince('2026-09-06T12:00:00', now)).toBeCloseTo(3, 5)
  })

  it('devuelve null cuando la fecha no es parseable', () => {
    expect(hoursSince(null)).toBeNull()
    expect(hoursSince('')).toBeNull()
    expect(hoursSince('no-es-una-fecha')).toBeNull()
  })
})

describe('isPendingStale encuentra el webhook perdido', () => {
  const now = new Date(2026, 8, 6, 15, 0)

  it('marca un PENDING de más de 1 hora', () => {
    expect(isPendingStale('PENDING', '2026-09-06T13:00:00', now)).toBe(true)
  })

  it('no marca un PENDING reciente', () => {
    expect(isPendingStale('PENDING', '2026-09-06T14:30:00', now)).toBe(false)
  })

  it('un pago ya resuelto no envejece, por vieja que sea su fecha', () => {
    expect(isPendingStale('CONFIRMED', '2026-01-01T00:00:00', now)).toBe(false)
  })
})

describe('startOfDayInstant/endOfDayInstant acotan el rango de fechas de C-06', () => {
  it('startOfDayInstant cae en la medianoche local del día elegido', () => {
    const expected = new Date(2026, 8, 6, 0, 0, 0)
    expect(startOfDayInstant('2026-09-06')).toBe(expected.toISOString())
  })

  it('endOfDayInstant no excluye lo recibido el mismo día', () => {
    const expected = new Date(2026, 8, 6, 23, 59, 59, 999)
    expect(endOfDayInstant('2026-09-06')).toBe(expected.toISOString())
  })
})

/*
 * Los importes ya no se prueban aquí: la política de moneda dejó de vivir en
 * esta feature y subió a `src/composables/format.ts`, que es donde una regla que
 * vale para las once features del dinero tiene que estar. Su prueba es
 * `tests/unit/money-format.spec.ts`. Este fichero se queda con el tiempo, que es
 * lo único que de verdad era de cobranza.
 */
