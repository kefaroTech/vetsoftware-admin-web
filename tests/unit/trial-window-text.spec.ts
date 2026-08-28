import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysLeftInclusive,
  trialGrantState,
  trialGrantTrimmed,
  trialWindowState,
} from '@/features/trials/composables/trialWindowText'
import type {
  CompanyTrialGrantResponse,
  CompanyTrialWindowResponse,
} from '@/features/trials/types/trials.types'

/**
 * La ventana de prueba (§I5 / §C2).
 *
 * Tres propiedades, y las tres deciden si un cliente entra hoy a trabajar:
 *
 * 1. **El último día va incluido.** Una prueba que termina el 30 sigue viva todo
 *    el 30. Un `<` en vez de un `<=` le corta el acceso un día antes.
 * 2. **Un desenlace en blanco no es «abandonada».** Vencida sin desenlace es
 *    trabajo pendiente; abandonada es una venta que alguien dio por perdida.
 * 3. **El recorte contra la ventana se dice.** `daysGranted` es lo que se vendió
 *    y `effectiveDays` lo que el cliente va a tener.
 */

function window(overrides: Partial<CompanyTrialWindowResponse> = {}): CompanyTrialWindowResponse {
  return {
    id: 1,
    companyId: 42,
    startDate: '2026-08-01',
    endDate: '2026-08-30',
    windowDays: 30,
    sourceQuoteId: 900,
    closedAt: null,
    open: true,
    ...overrides,
  }
}

function grant(overrides: Partial<CompanyTrialGrantResponse> = {}): CompanyTrialGrantResponse {
  return {
    id: 7,
    companyId: 42,
    catalogItemId: 15,
    trialWindowId: 1,
    grantedOn: '2026-08-01',
    daysGranted: 30,
    effectiveDays: 30,
    trialEndDate: '2026-08-30',
    policyTrialDays: 30,
    policyTrialOutcome: 'CONVERT_TO_PAID',
    sourceQuoteId: 900,
    grantingAmendmentId: null,
    consumedAt: null,
    outcome: null,
    live: true,
    ...overrides,
  }
}

describe('daysLeftInclusive', () => {
  it('cuenta hoy: el propio último día devuelve 1, no 0', () => {
    expect(daysLeftInclusive('2026-08-30', '2026-08-30')).toBe(1)
  })

  it('devuelve 0 cuando el último día ya pasó', () => {
    expect(daysLeftInclusive('2026-08-30', '2026-08-31')).toBe(0)
  })

  it('cuenta los dos extremos', () => {
    expect(daysLeftInclusive('2026-08-30', '2026-08-28')).toBe(3)
  })

  it('no se cae con una fecha que no es una fecha: devuelve null, no NaN', () => {
    expect(daysLeftInclusive('', '2026-08-28')).toBeNull()
    expect(daysLeftInclusive('30/08/2026', '2026-08-28')).toBeNull()
  })

  it('cruza un cambio de horario de verano sin perder ni ganar un día', () => {
    // 8 de marzo de 2026: cambio de hora en varios husos del norte. Con un `Date`
    // construido en hora local, esta resta sale 1 día desviada.
    expect(daysLeftInclusive('2026-03-10', '2026-03-07')).toBe(4)
  })
})

describe('addDays', () => {
  it('cruza el fin de mes', () => {
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02')
  })

  it('resta con offset negativo', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('devuelve null si la entrada no es una fecha', () => {
    expect(addDays('ayer', 1)).toBeNull()
  })
})

describe('trialWindowState', () => {
  it('el último día sigue vivo y lo dice con esas palabras', () => {
    const state = trialWindowState(window(), '2026-08-30')
    expect(state.level).toBe('ultimo-dia')
    expect(state.daysLeft).toBe(1)
    expect(state.label).toContain('último día')
  })

  it('vence al día siguiente del último, no el propio último', () => {
    expect(trialWindowState(window(), '2026-08-31').level).toBe('vencida')
  })

  it('está vigente en mitad de la ventana y dice cuántos días quedan', () => {
    const state = trialWindowState(window(), '2026-08-28')
    expect(state.level).toBe('vigente')
    expect(state.daysLeft).toBe(3)
  })

  it('es futura antes de empezar', () => {
    expect(trialWindowState(window(), '2026-07-31').level).toBe('futura')
  })

  it('un cierre a mano manda sobre las fechas, aunque la ventana no haya terminado', () => {
    const state = trialWindowState(window({ closedAt: '2026-08-10T09:00:00' }), '2026-08-20')
    expect(state.level).toBe('cerrada')
    expect(state.daysLeft).toBe(0)
  })

  it('una ventana con el último día pasado está VENCIDA aunque el servidor la siga dando por abierta', () => {
    // El proceso que la cierra puede no haber corrido. Decir «vigente» aquí sería
    // prometer un acceso que el backend ya no da.
    expect(trialWindowState(window({ open: true }), '2026-09-05').level).toBe('vencida')
  })

  it('no inventa un estado cuando las fechas no se pueden leer', () => {
    const state = trialWindowState(window({ endDate: '' }), '2026-08-20')
    expect(state.level).toBe('desconocida')
    expect(state.daysLeft).toBeNull()
  })
})

describe('trialGrantState', () => {
  it('con desenlace escrito, lo dice y no calcula nada', () => {
    const state = trialGrantState(grant({ outcome: 'CONVERTED' }), '2026-09-10')
    expect(state.variant).toBe('success')
    expect(state.awaitingOutcome).toBe(false)
  })

  it('vencida sin desenlace NO se rellena con «abandonada»: queda como trabajo pendiente', () => {
    const state = trialGrantState(grant(), '2026-08-31')
    expect(state.awaitingOutcome).toBe(true)
    expect(state.label).not.toContain('abandon')
  })

  it('el último día todavía no espera desenlace', () => {
    const state = trialGrantState(grant(), '2026-08-30')
    expect(state.awaitingOutcome).toBe(false)
    expect(state.label).toContain('último día')
  })
})

describe('trialGrantTrimmed', () => {
  it('avisa cuando la ventana recortó los días vendidos', () => {
    expect(trialGrantTrimmed(grant({ daysGranted: 30, effectiveDays: 12 }))).toContain('12')
  })

  it('calla cuando no hubo recorte', () => {
    expect(trialGrantTrimmed(grant())).toBeNull()
  })
})
