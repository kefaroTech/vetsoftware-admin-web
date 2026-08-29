import { describe, expect, it } from 'vitest'
import { agingText, daysSince } from '@/features/billing-operations/composables/billingFormat'

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

/*
 * Los importes ya no se prueban aquí: la política de moneda dejó de vivir en
 * esta feature y subió a `src/composables/format.ts`, que es donde una regla que
 * vale para las once features del dinero tiene que estar. Su prueba es
 * `tests/unit/money-format.spec.ts`. Este fichero se queda con el tiempo, que es
 * lo único que de verdad era de cobranza.
 */
