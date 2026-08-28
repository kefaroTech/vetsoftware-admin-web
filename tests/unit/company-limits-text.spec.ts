import { describe, expect, it } from 'vitest'
import {
  businessEventRange,
  limitEventActor,
  limitSourceProvenance,
  overLimitNote,
  parseDelta,
  projectedUsage,
  shiftBusinessDay,
  signedDelta,
  validateDelta,
} from '@/features/company-limits/composables/companyLimitsText'

/**
 * Los cupos de una empresa (§I4 / §B8).
 *
 * Cuatro propiedades, y las cuatro evitan una corrección equivocada:
 *
 * 1. **Sin techo declarado no hay origen que nombrar.** `NONE` no es «valor de
 *    fábrica»: es que no hay cupo, y decir lo contrario afirma que alguien lo
 *    decidió.
 * 2. **Estar por encima del techo está permitido.** Pasa al bajar el contrato; el
 *    cliente conserva lo suyo y no puede crear más. No se arregla corrigiendo el
 *    contador, y la pantalla tiene que decirlo o alguien lo «arreglará».
 * 3. **Mover cero no es una corrección**, y un delta con el signo cambiado es el
 *    error más fácil de cometer: la proyección se enseña antes de firmar.
 * 4. **La ventana de la bitácora se compone en la zona del negocio**, con el
 *    último día incluido hasta las 23:59:59.
 */

describe('limitSourceProvenance', () => {
  it('traduce cada origen del backend al vocabulario de ProvenanceLine', () => {
    expect(limitSourceProvenance('COMPANY_OVERRIDE')).toBe('NEGOTIATED_EXCEPTION')
    expect(limitSourceProvenance('SUBSCRIPTION')).toBe('CONTRACT')
    expect(limitSourceProvenance('CATALOG_DEFAULT')).toBe('FACTORY')
  })

  it('«sin techo» NO es «valor de fábrica»: devuelve null y la pantalla pinta el hueco', () => {
    expect(limitSourceProvenance('NONE')).toBeNull()
  })
})

describe('overLimitNote', () => {
  it('dice cuánto sobra y que no es un error', () => {
    const note = overLimitNote(12, 10)
    expect(note).toContain('2')
    expect(note).toContain('no es un error')
  })

  it('calla cuando está dentro del techo', () => {
    expect(overLimitNote(10, 10)).toBeNull()
  })

  it('sin techo declarado no se puede estar por encima de nada', () => {
    expect(overLimitNote(99, null)).toBeNull()
    expect(overLimitNote(99, 0)).toBeNull()
  })

  it('sin consumo conocido no inventa un desbordamiento', () => {
    expect(overLimitNote(null, 10)).toBeNull()
  })
})

describe('validateDelta', () => {
  it('exige un movimiento', () => {
    expect(validateDelta('')).not.toBe('')
  })

  it('rechaza el cero: no corrige nada y sí ensucia la bitácora', () => {
    expect(validateDelta('0')).toContain('Mover cero')
  })

  it('acepta un negativo, que es el caso normal de una corrección', () => {
    expect(validateDelta('-500')).toBe('')
  })

  it('rechaza lo que no es un número', () => {
    expect(validateDelta('quinientos')).not.toBe('')
  })

  it('acota al entero de 32 bits, que es donde el servidor devolvería un 400 mudo', () => {
    expect(validateDelta('3000000000')).not.toBe('')
  })
})

describe('parseDelta y signedDelta', () => {
  it('trunca los decimales: el contrato declara int32', () => {
    expect(parseDelta('3.9')).toBe(3)
  })

  it('escribe el signo del positivo, que si no se lee igual que un total', () => {
    expect(signedDelta(3)).toBe('+3')
    expect(signedDelta(-3)).toBe('-3')
  })
})

describe('projectedUsage', () => {
  it('anticipa en cuánto quedaría el contador', () => {
    expect(projectedUsage(1200, '-500')).toBe(700)
  })

  it('no proyecta desde un consumo que no se conoce: null, no cero + delta', () => {
    expect(projectedUsage(null, '-500')).toBeNull()
  })

  it('no proyecta con un movimiento vacío o cero', () => {
    expect(projectedUsage(1200, '')).toBeNull()
    expect(projectedUsage(1200, '0')).toBeNull()
  })
})

describe('businessEventRange', () => {
  it('cubre desde el inicio del primer día hasta el final del último, incluido', () => {
    const range = businessEventRange(90, '2026-08-27')
    expect(range.from).toBe('2026-05-29T00:00:00')
    expect(range.to).toBe('2026-08-27T23:59:59')
  })

  it('viaja sin zona: son LocalDateTime del contrato, no instantes UTC', () => {
    const range = businessEventRange(7, '2026-08-27')
    expect(range.from).not.toContain('Z')
    expect(range.to).not.toContain('+')
  })
})

describe('shiftBusinessDay', () => {
  it('cruza el fin de mes hacia atrás', () => {
    expect(shiftBusinessDay('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('devuelve null si la entrada no es una fecha', () => {
    expect(shiftBusinessDay('hoy', -1)).toBeNull()
  })
})

describe('limitEventActor', () => {
  it('nombra al proceso cuando lo fue', () => {
    expect(
      limitEventActor({ actorIsProcess: true, actorSystemUserId: null, actorEmployeeId: null }),
    ).toContain('proceso')
  })

  it('nombra a la persona de plataforma que firmó', () => {
    expect(
      limitEventActor({ actorIsProcess: false, actorSystemUserId: 8, actorEmployeeId: null }),
    ).toBe('Plataforma #8')
  })

  it('una persona sin identificador NO se convierte en un proceso', () => {
    expect(
      limitEventActor({ actorIsProcess: false, actorSystemUserId: null, actorEmployeeId: null }),
    ).toBe('No consta quién')
  })
})
