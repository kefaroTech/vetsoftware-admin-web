import { describe, expect, it } from 'vitest'
import {
  AMENDMENT_TYPE_LABEL,
  AMENDMENT_TYPE_SUMMARY,
  amendmentSignature,
  buildHistoryTimeline,
  formatDateTime,
  isScheduled,
  monthlyDeltaReading,
  prorationReading,
  timelineAnnouncement,
} from '@/features/subscriptions-admin/composables/subscriptionHistoryText'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import type {
  SubscriptionAmendmentResponse,
  SubscriptionAmendmentType,
  SubscriptionStatusChangeResponse,
} from '@/features/subscriptions-admin/types/subscription-history.types'

function amendment(
  overrides: Partial<SubscriptionAmendmentResponse> = {},
): SubscriptionAmendmentResponse {
  return {
    id: 42,
    companyId: 42,
    subscriptionId: 184,
    amendmentNumber: 'OTR-2026-00042',
    amendmentType: 'ADD_ITEM',
    effectiveDate: '2026-03-14',
    reason: 'La clínica pidió historia clínica',
    requestedByEmployeeId: null,
    requestedBySystemUserId: 3,
    prorationAmount: 34_000,
    monthlyDeltaAmount: 34_000,
    quoteId: null,
    clientRequestId: 'e5b1…',
    createdDate: '2026-03-14T10:22:31',
    ...overrides,
  }
}

function statusChange(
  overrides: Partial<SubscriptionStatusChangeResponse> = {},
): SubscriptionStatusChangeResponse {
  return {
    id: 7,
    companyId: 42,
    subscriptionId: 184,
    fromStatus: 'PAST_DUE',
    toStatus: 'READ_ONLY',
    reason: 'Se agotaron los días de cortesía',
    occurredAt: '2026-03-20T09:00:00',
    actor: 'soporte@vetsoftware',
    createdDate: '2026-03-20T09:00:00',
    ...overrides,
  }
}

const ALL_TYPES: SubscriptionAmendmentType[] = [
  'ADD_ITEM',
  'REMOVE_ITEM',
  'CHANGE_QUANTITY',
  'CHANGE_CYCLE',
  'SUSPEND',
  'REACTIVATE',
  'CANCEL',
  'PRICE_LIST_MIGRATION',
]

/**
 * La misma barrera que `subscription-record.spec.ts` levanta sobre el vocabulario
 * del estado, aplicada a la bitácora — que es donde más fácil se cuelan estas
 * palabras, porque un histórico de estados invita a resumir «pasó a solo lectura»
 * como «se le bloqueó la cuenta». No existe ni existirá un corte total de acceso.
 */
describe('el vocabulario de la historia no sugiere un corte de acceso que no existe', () => {
  const PROHIBIDAS = [
    'bloquear',
    'bloquead',
    'suspender el acceso',
    'cortar',
    'desactivar la cuenta',
    'inhabilitar',
  ]

  function todosLosTextos(): string[] {
    const textos: string[] = []
    for (const type of ALL_TYPES) {
      textos.push(AMENDMENT_TYPE_LABEL[type], AMENDMENT_TYPE_SUMMARY[type])
    }
    for (const firma of [
      amendmentSignature(amendment({ requestedByEmployeeId: 12, requestedBySystemUserId: null })),
      amendmentSignature(amendment({ requestedByEmployeeId: null, requestedBySystemUserId: 3 })),
      amendmentSignature(amendment({ requestedByEmployeeId: null, requestedBySystemUserId: null })),
      amendmentSignature(amendment({ requestedByEmployeeId: 12, requestedBySystemUserId: 3 })),
    ]) {
      textos.push(firma.text, firma.detail)
    }
    for (const valor of [34_000, -34_000, 0, null]) {
      textos.push(monthlyDeltaReading(valor).sentence, prorationReading(valor).sentence)
    }
    return textos
  }

  it.each(PROHIBIDAS)('ningún texto de la historia dice «%s»', (palabra) => {
    for (const texto of todosLosTextos()) {
      expect(texto.toLowerCase()).not.toContain(palabra)
    }
  })

  it('SUSPEND se rotula como lo que hace —parar la facturación— y no como un corte de cuenta', () => {
    expect(AMENDMENT_TYPE_LABEL.SUSPEND).toBe('Suspensión de facturación')
    expect(AMENDMENT_TYPE_SUMMARY.SUSPEND).toContain('consulta y la impresión')
  })

  it('los ocho tipos tienen rótulo y resumen: ninguno se pinta con su valor crudo', () => {
    for (const type of ALL_TYPES) {
      expect(AMENDMENT_TYPE_LABEL[type]).not.toBe(type)
      expect(AMENDMENT_TYPE_LABEL[type].length).toBeGreaterThan(0)
      expect(AMENDMENT_TYPE_SUMMARY[type].length).toBeGreaterThan(0)
    }
  })
})

/**
 * El modelo separa las dos firmas porque la responsabilidad es distinta: no es lo
 * mismo que la clínica pida un cambio sobre su propio contrato que la plataforma
 * actuando sobre el contrato de un tercero. La pantalla tiene que decir cuál fue,
 * con palabras.
 */
describe('quién pidió el cambio se lee, no se interpreta', () => {
  it('distingue a la clínica de la plataforma con frases distintas', () => {
    const clinica = amendmentSignature(
      amendment({ requestedByEmployeeId: 12, requestedBySystemUserId: null }),
    )
    const plataforma = amendmentSignature(
      amendment({ requestedByEmployeeId: null, requestedBySystemUserId: 3 }),
    )

    expect(clinica.kind).toBe('employee')
    expect(plataforma.kind).toBe('system-user')
    expect(clinica.text).not.toBe(plataforma.text)
    expect(clinica.detail).toContain('12')
    expect(plataforma.detail).toContain('3')
    expect(clinica.broken).toBe(false)
    expect(plataforma.broken).toBe(false)
  })

  it('sin ninguna de las dos, lo dice en vez de inventarse un autor', () => {
    const firma = amendmentSignature(
      amendment({ requestedByEmployeeId: null, requestedBySystemUserId: null }),
    )
    expect(firma.kind).toBe('none')
    expect(firma.text).toBe('Sin firma registrada')
    expect(firma.broken).toBe(false)
  })

  it('con las dos a la vez marca el dato como roto en vez de elegir una', () => {
    const firma = amendmentSignature(
      amendment({ requestedByEmployeeId: 12, requestedBySystemUserId: 3 }),
    )
    expect(firma.kind).toBe('ambiguous')
    expect(firma.broken).toBe(true)
    expect(firma.detail).toContain('12')
    expect(firma.detail).toContain('3')
  })
})

/**
 * `monthlyDeltaAmount` es lo que le importa al cliente —cuánto sube o baja su
 * factura recurrente— y `prorationAmount` es lo que se cobró una sola vez. Son
 * cosas distintas y no se pueden colapsar en «importe».
 */
describe('los dos importes de un otrosí no se confunden', () => {
  it('el cambio en la factura mensual habla del mes y lleva signo', () => {
    expect(monthlyDeltaReading(34_000).amount.startsWith('+')).toBe(true)
    expect(monthlyDeltaReading(34_000).sentence).toContain('sube')
    expect(monthlyDeltaReading(34_000).sentence).toContain('al mes')

    expect(monthlyDeltaReading(-34_000).amount.startsWith('−')).toBe(true)
    expect(monthlyDeltaReading(-34_000).sentence).toContain('baja')
    expect(monthlyDeltaReading(-34_000).sentence).toContain('al mes')
  })

  it('el cero es un caso con nombre, no un hueco', () => {
    expect(monthlyDeltaReading(0).sentence).toBe('La factura recurrente no cambia.')
    expect(prorationReading(0).sentence).toBe('No hubo cobro puntual por el periodo en curso.')
    expect(monthlyDeltaReading(0).amount).not.toBe('—')
  })

  it('el prorrateo habla de una sola vez y del periodo, nunca del mes', () => {
    const cobro = prorationReading(34_000)
    expect(cobro.sentence).toContain('una sola vez')
    expect(cobro.sentence).toContain('periodo')
    expect(cobro.sentence).not.toContain('al mes')

    const credito = prorationReading(-34_000)
    expect(credito.sentence).toContain('acreditó')
    expect(credito.amount.startsWith('−')).toBe(true)
  })

  it('las dos frases del mismo importe son distintas: no hay «importe» a secas', () => {
    expect(monthlyDeltaReading(34_000).sentence).not.toBe(prorationReading(34_000).sentence)
  })

  it('un importe ausente se dice, y dice cuál de los dos falta', () => {
    expect(monthlyDeltaReading(null).amount).toBe('—')
    expect(monthlyDeltaReading(null).sentence).toContain('factura recurrente')
    expect(prorationReading(undefined).sentence).toContain('periodo en curso')
  })
})

/**
 * Los dos endpoints ordenan en sentidos opuestos y ninguno acepta parámetro de
 * orden, así que la única cronología honesta es la del conjunto completo.
 */
describe('la línea de tiempo fusiona las dos fuentes en orden', () => {
  it('pone lo más reciente arriba, vengan como vengan las dos listas', () => {
    const entries = buildHistoryTimeline(
      [
        amendment({ id: 1, createdDate: '2026-01-10T08:00:00' }),
        amendment({ id: 2, createdDate: '2026-03-14T10:22:31' }),
      ],
      [
        statusChange({ id: 9, occurredAt: '2026-03-20T09:00:00' }),
        statusChange({ id: 8, occurredAt: '2026-02-01T09:00:00' }),
      ],
    )

    expect(entries.map((entry) => entry.key)).toEqual([
      'status-9',
      'amendment-2',
      'status-8',
      'amendment-1',
    ])
  })

  it('a la misma marca de tiempo, la causa antes que su consecuencia', () => {
    const entries = buildHistoryTimeline(
      [amendment({ id: 5, createdDate: '2026-03-20T09:00:00' })],
      [statusChange({ id: 9, occurredAt: '2026-03-20T09:00:00' })],
    )
    expect(entries.map((entry) => entry.key)).toEqual(['amendment-5', 'status-9'])
  })

  it('una fecha ilegible cae al final en vez de reordenar el resto', () => {
    const entries = buildHistoryTimeline(
      [amendment({ id: 3, createdDate: 'no-es-una-fecha' })],
      [statusChange({ id: 9, occurredAt: '2026-02-01T09:00:00' })],
    )
    expect(entries.map((entry) => entry.key)).toEqual(['status-9', 'amendment-3'])
  })

  it('sin movimientos devuelve una lista vacía, no una entrada de relleno', () => {
    expect(buildHistoryTimeline([], [])).toEqual([])
  })
})

describe('lo que se anuncia al lector de pantalla', () => {
  it('cuenta las dos cosas por separado y en singular cuando toca', () => {
    const entries = buildHistoryTimeline([amendment()], [statusChange()])
    expect(timelineAnnouncement(entries)).toBe('1 otrosí y 1 cambio de estado en el expediente.')
  })

  it('en plural cuando hay varias', () => {
    const entries = buildHistoryTimeline(
      [amendment({ id: 1 }), amendment({ id: 2 })],
      [statusChange({ id: 8 }), statusChange({ id: 9 })],
    )
    expect(timelineAnnouncement(entries)).toBe('2 otrosíes y 2 cambios de estado en el expediente.')
  })

  it('sin movimientos lo dice en vez de anunciar un cero', () => {
    expect(timelineAnnouncement([])).toBe('El contrato no tiene movimientos registrados.')
  })
})

describe('las fechas de la película', () => {
  it('lleva la hora: dos transiciones del mismo día tienen que poder distinguirse', () => {
    expect(formatDateTime('2026-03-14T10:22:31')).toBe('14/03/2026 · 10:22')
  })

  it('sin hora en la cadena no inventa las 00:00', () => {
    expect(formatDateTime('2026-03-14')).toBe('14/03/2026')
  })

  it('sin fecha imprime el guion del sistema de diseño', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('un otrosí con efecto futuro se marca como programado', () => {
    const hoy = new Date(2026, 2, 14)
    expect(isScheduled(amendment({ effectiveDate: '2026-04-01' }), hoy)).toBe(true)
    expect(isScheduled(amendment({ effectiveDate: '2026-03-14' }), hoy)).toBe(false)
    expect(isScheduled(amendment({ effectiveDate: '2026-01-01' }), hoy)).toBe(false)
  })
})

/**
 * La pestaña se auto-descubre: si este registro se rompe, `/historia` desaparece
 * de la barra sin que nada más falle, que es justo el fallo silencioso que un
 * expediente de auditoría no se puede permitir.
 */
describe('la sub-vista queda registrada en el expediente', () => {
  it('aparece en la barra con su segmento, su nombre de ruta y su orden', () => {
    const tab = subscriptionRecordTabs.find((candidate) => candidate.segment === 'historia')
    expect(tab).toBeDefined()
    expect(tab?.routeName).toBe('subscription-record-historia')
    expect(tab?.label).toBe('Historia')
    expect(tab?.order).toBe(3)
  })
})
