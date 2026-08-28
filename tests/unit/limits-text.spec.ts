import { describe, expect, it } from 'vitest'
import {
  actorLabel,
  defaultEventRange,
  effectiveLimitText,
  eventTypeTone,
  isoDay,
  limitSourceLabel,
  measureKindLabel,
  MEASURE_KIND_OPTIONS,
  OVERRIDE_NOTE_REQUIRED,
  OVERRIDE_REASON_OPTIONS,
  provenanceOf,
} from '@/features/limits/composables/limitText'
import type {
  CompanyLimitEventResponse,
  EffectiveLimitResponse,
} from '@/features/limits/types/limits.types'

function evento(patch: Partial<CompanyLimitEventResponse> = {}): CompanyLimitEventResponse {
  return {
    id: 1,
    companyId: 42,
    limitDimensionId: 7,
    eventType: 'THRESHOLD_WARNED',
    limitQuantity: 100,
    usedQuantity: 80,
    requestedDelta: 1,
    limitSource: 'SUBSCRIPTION',
    overrideId: null,
    actorEmployeeId: null,
    actorSystemUserId: null,
    actorIsProcess: false,
    reasonCode: null,
    reason: null,
    occurredAt: '2026-03-14T10:30:00',
    ...patch,
  }
}

function techo(patch: Partial<EffectiveLimitResponse> = {}): EffectiveLimitResponse {
  return {
    companyId: 42,
    limitDimensionId: 7,
    limitQuantity: 100,
    source: 'SUBSCRIPTION',
    overrideId: null,
    unlimited: false,
    ...patch,
  }
}

describe('procedencia del techo', () => {
  it('traduce los tres orígenes que sí tienen procedencia', () => {
    expect(provenanceOf('COMPANY_OVERRIDE')).toBe('NEGOTIATED_EXCEPTION')
    expect(provenanceOf('SUBSCRIPTION')).toBe('CONTRACT')
    expect(provenanceOf('CATALOG_DEFAULT')).toBe('PLAN')
  })

  /**
   * El caso que este módulo existe para no equivocar. `FACTORY` afirma «nadie lo
   * ha cambiado, el producto nace así», que es MÁS fuerte que «nadie ha fijado
   * techo». Mapear `NONE` ahí pintaría una procedencia inventada justo donde se
   * decide si un techo se puede tocar.
   */
  it('NONE no tiene procedencia: devuelve null en vez de inventar FACTORY', () => {
    expect(provenanceOf('NONE')).toBeNull()
  })

  it('el rótulo de tabla sale del mismo mapa que ProvenanceLine', () => {
    expect(limitSourceLabel('COMPANY_OVERRIDE')).toBe('Excepción negociada')
    expect(limitSourceLabel('SUBSCRIPTION')).toBe('Viene del contrato')
    expect(limitSourceLabel('CATALOG_DEFAULT')).toBe('Viene del plan')
    expect(limitSourceLabel('NONE')).toBe('Sin techo fijado')
  })
})

describe('texto del techo efectivo', () => {
  it('dice la cifra cuando hay techo', () => {
    expect(effectiveLimitText(techo({ limitQuantity: 250 }), 'mascotas')).toBe(
      'Techo de 250 mascotas',
    )
  })

  /** Un techo ausente NO es un techo de cero: son estados opuestos. */
  it('un techo ausente se dice «sin techo», nunca como cero', () => {
    const sinTecho = techo({ limitQuantity: null, unlimited: true, source: 'NONE' })
    expect(effectiveLimitText(sinTecho, 'mascotas')).toBe('Sin techo: mascotas sin tope')
  })

  it('unlimited manda aunque llegue una cifra', () => {
    const raro = techo({ limitQuantity: 100, unlimited: true })
    expect(effectiveLimitText(raro, 'citas')).toBe('Sin techo: citas sin tope')
  })
})

describe('hechos de la bitácora', () => {
  it('solo lo que ya frenó a alguien va en tono de peligro', () => {
    expect(eventTypeTone('LIMIT_BLOCKED')).toBe('danger')
    expect(eventTypeTone('OVER_LIMIT_ON_DOWNGRADE')).toBe('danger')
    expect(eventTypeTone('THRESHOLD_WARNED')).toBe('warning')
    expect(eventTypeTone('LIMIT_RAISED')).toBe('success')
    expect(eventTypeTone('USAGE_RECONCILED')).toBe('neutral')
    expect(eventTypeTone('USAGE_ADJUSTED')).toBe('neutral')
  })

  it('el proceso automático manda sobre cualquier identificador de persona', () => {
    expect(actorLabel(evento({ actorIsProcess: true, actorSystemUserId: 9 }))).toBe(
      'Proceso automático',
    )
  })

  it('distingue al operador de plataforma del empleado de la empresa', () => {
    expect(actorLabel(evento({ actorSystemUserId: 9 }))).toBe('Operador de plataforma #9')
    expect(actorLabel(evento({ actorEmployeeId: 3 }))).toBe('Empleado de la empresa #3')
  })

  /** El contrato permite un hecho sin actor. No se inventa un culpable. */
  it('sin actor ni proceso lo dice, en vez de atribuirlo a alguien', () => {
    expect(actorLabel(evento())).toBe('Sin actor registrado')
  })
})

describe('vocabulario y listas cerradas', () => {
  it('los tres tipos de medida tienen rótulo y ninguno es el valor crudo', () => {
    expect(MEASURE_KIND_OPTIONS.map((o) => o.value)).toEqual(['STOCK', 'CUMULATIVE', 'FLOW'])
    for (const opcion of MEASURE_KIND_OPTIONS) {
      expect(opcion.label).not.toBe(opcion.value)
      expect(measureKindLabel(opcion.value)).toBe(opcion.label)
    }
  })

  it('los cinco motivos del contrato están en la lista cerrada, sin sobrar ninguno', () => {
    expect([...OVERRIDE_REASON_OPTIONS.map((o) => o.value)].sort()).toEqual([
      'COMMERCIAL_AGREEMENT',
      'MIGRATION',
      'OTHER',
      'RETENTION',
      'SUPPORT_INCIDENT',
    ])
  })

  /**
   * Si un motivo que exige nota dejara de estar en la lista, el modal nunca
   * pediría la nota y la firma quedaría sin explicación: la comprobación es que
   * los dos conjuntos no se separen.
   */
  it('todo motivo que exige nota es un motivo ofrecible', () => {
    const ofrecibles = new Set(OVERRIDE_REASON_OPTIONS.map((o) => o.value))
    for (const motivo of OVERRIDE_NOTE_REQUIRED) expect(ofrecibles.has(motivo)).toBe(true)
  })
})

describe('ventana de fechas', () => {
  /**
   * El corrimiento de zona horaria es el defecto concreto: con `toISOString()`
   * en Bogotá (UTC-5) un 1 de marzo a las 20:00 se convierte en el día 2.
   */
  it('el día se calcula en hora local, no en UTC', () => {
    expect(isoDay(new Date(2026, 2, 1, 20, 0, 0))).toBe('2026-03-01')
    expect(isoDay(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('la ventana por defecto abarca noventa días y termina hoy', () => {
    const { from, to } = defaultEventRange(new Date(2026, 5, 30))
    expect(to).toBe('2026-06-30')
    expect(from).toBe('2026-04-01')
  })
})
