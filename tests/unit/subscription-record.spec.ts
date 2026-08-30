import { describe, expect, it } from 'vitest'
import {
  BILLING_CYCLE_LABEL,
  READ_ONLY_POLICY_NOTE,
  SUBSCRIPTION_STATUS_CHANGE_REASON_LABEL,
  SUBSCRIPTION_STATUS_CHANGE_REASON_OPTIONS,
  SUBSCRIPTION_STATUS_TRANSITIONS,
  canRequestCancellation,
  graceDaysLeft,
  statusBannerTone,
  statusSupportText,
} from '@/features/subscriptions-admin/composables/subscriptionStatusText'
import {
  nowLocalDateTime,
  todayISODate,
} from '@/features/subscriptions-admin/composables/subscriptionDateTime'
import {
  SUBSCRIPTION_RECORD_ROUTE_NAMES,
  subscriptionRecordTabs,
} from '@/router/routes/subscriptions-admin.routes'
import type {
  SubscriptionResponse,
  SubscriptionStatus,
} from '@/features/subscriptions-admin/types/subscriptions-admin.types'

function subscription(overrides: Partial<SubscriptionResponse> = {}): SubscriptionResponse {
  return {
    id: 184,
    subscriptionNumber: 'SUS-2026-00184',
    companyId: 42,
    quoteId: null,
    priceListId: 3,
    billingCycle: 'MONTHLY',
    status: 'ACTIVE',
    current: true,
    startDate: '2026-01-01',
    trialEndDate: null,
    currentPeriodStart: '2026-03-01',
    currentPeriodEnd: '2026-03-31',
    nextBillingDate: '2026-04-01',
    commitmentEndDate: null,
    graceDays: 10,
    pastDueSince: null,
    autoRenew: true,
    cancelRequestedAt: null,
    cancelEffectiveDate: null,
    cancelReason: null,
    createdDate: '2026-01-01T08:00:00',
    enabled: true,
    ...overrides,
  }
}

const ALL_STATUSES: SubscriptionStatus[] = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'READ_ONLY',
  'CANCELLED',
  'EXPIRED',
]

/**
 * La política es innegociable y no vive en un documento: vive aquí, donde rompe
 * el build. No existe ni existirá un estado de corte total de acceso, y un
 * moroso nunca pierde la consulta de su propia historia clínica. Si alguien
 * escribe «bloquear la cuenta» en un rótulo, en una consecuencia o en una frase
 * de apoyo, esta prueba lo para antes de que llegue a la pantalla de un operador
 * —que es quien se lo repetiría al cliente por teléfono—.
 */
describe('el vocabulario del estado no sugiere un corte de acceso que no existe', () => {
  const PROHIBIDAS = [
    'bloquear',
    'bloquead',
    'suspender el acceso',
    'cortar',
    'desactivar la cuenta',
    'inhabilitar',
  ]

  function textosDelEstado(): string[] {
    const textos: string[] = [READ_ONLY_POLICY_NOTE]
    for (const status of ALL_STATUSES) {
      textos.push(statusSupportText(subscription({ status, pastDueSince: '2026-03-04' })))
      for (const transition of SUBSCRIPTION_STATUS_TRANSITIONS[status]) {
        textos.push(transition.label, transition.consequence, transition.policyNote ?? '')
      }
    }
    return textos
  }

  it.each(PROHIBIDAS)('ninguna frase del expediente dice «%s»', (palabra) => {
    for (const texto of textosDelEstado()) {
      expect(texto.toLowerCase()).not.toContain(palabra)
    }
  })

  it('solo lectura promete por escrito la consulta y la historia clínica', () => {
    const texto = statusSupportText(subscription({ status: 'READ_ONLY' }))
    expect(texto).toContain('Consulta e impresión activas')
    expect(texto).toContain('historia clínica')
    expect(READ_ONLY_POLICY_NOTE).toContain('historia clínica')
  })

  it('el pago vencido dice que la empresa sigue trabajando', () => {
    const texto = statusSupportText(
      subscription({ status: 'PAST_DUE', pastDueSince: '2026-03-04' }),
    )
    expect(texto).toContain('Sigue trabajando con normalidad')
  })
})

describe('las transiciones son las que tienen sentido desde el estado actual', () => {
  it('no ofrece ninguna sobre un contrato terminado', () => {
    expect(SUBSCRIPTION_STATUS_TRANSITIONS.CANCELLED).toHaveLength(0)
    expect(SUBSCRIPTION_STATUS_TRANSITIONS.EXPIRED).toHaveLength(0)
    expect(canRequestCancellation('CANCELLED')).toBe(false)
    expect(canRequestCancellation('EXPIRED')).toBe(false)
  })

  it('nunca ofrece una transición al estado en el que ya se está', () => {
    for (const status of ALL_STATUSES) {
      for (const transition of SUBSCRIPTION_STATUS_TRANSITIONS[status]) {
        expect(transition.to).not.toBe(status)
      }
    }
  })

  it('el paso a solo lectura es el único que lleva el aviso de política', () => {
    const conAviso = ALL_STATUSES.flatMap((status) =>
      SUBSCRIPTION_STATUS_TRANSITIONS[status].filter((t) => t.policyNote),
    )
    expect(conAviso).toHaveLength(1)
    expect(conAviso[0]?.to).toBe('READ_ONLY')
  })

  it('ofrece como mucho una acción primaria por estado', () => {
    for (const status of ALL_STATUSES) {
      const primarias = SUBSCRIPTION_STATUS_TRANSITIONS[status].filter((t) => t.primary)
      expect(primarias.length).toBeLessThanOrEqual(1)
    }
  })

  it('solo pone banner permanente en los dos estados que lo piden', () => {
    expect(statusBannerTone('PAST_DUE')).toBe('warning')
    expect(statusBannerTone('READ_ONLY')).toBe('error')
    expect(statusBannerTone('ACTIVE')).toBeNull()
    expect(statusBannerTone('TRIALING')).toBeNull()
    expect(statusBannerTone('CANCELLED')).toBeNull()
    expect(statusBannerTone('EXPIRED')).toBeNull()
  })
})

describe('los días de cortesía no se inventan ni salen en negativo', () => {
  it('cuenta desde el vencimiento y no desde hoy', () => {
    const cuenta = subscription({ status: 'PAST_DUE', pastDueSince: '2026-03-04', graceDays: 10 })
    expect(graceDaysLeft(cuenta, new Date(2026, 2, 11))).toBe(3)
  })

  it('no baja de cero cuando la cortesía ya se agotó', () => {
    const cuenta = subscription({ status: 'PAST_DUE', pastDueSince: '2026-03-04', graceDays: 10 })
    expect(graceDaysLeft(cuenta, new Date(2026, 2, 30))).toBe(0)
    expect(statusSupportText(cuenta, new Date(2026, 2, 30))).toContain(
      'Se agotaron los días de cortesía',
    )
  })

  it('devuelve null si no hay fecha de vencimiento, en vez de un número falso', () => {
    expect(graceDaysLeft(subscription({ pastDueSince: null }))).toBeNull()
  })

  it('la frase de apoyo dice desde cuándo debe y concuerda en número', () => {
    const cuenta = subscription({ status: 'PAST_DUE', pastDueSince: '2026-03-04', graceDays: 10 })
    expect(statusSupportText(cuenta, new Date(2026, 2, 11))).toContain('Debe desde el 04/03/2026')
    expect(statusSupportText(cuenta, new Date(2026, 2, 13))).toContain('Le queda 1 día de cortesía')
    expect(statusSupportText(cuenta, new Date(2026, 2, 11))).toContain(
      'Le quedan 3 días de cortesía',
    )
  })
})

/**
 * `requestedAt` viaja a un `LocalDateTime` de Java y `effectiveDate` a un
 * `LocalDate`: dos tipos sin zona horaria. `toISOString()` los mandaría en UTC, y
 * una baja pedida a las 20:00 en Bogotá se registraría al día siguiente.
 */
describe('las marcas de tiempo que se envían no se corren de día', () => {
  it('usa la fecha local aunque en UTC ya sea mañana', () => {
    const nocheEnBogota = new Date(2026, 2, 10, 20, 30, 15)
    expect(todayISODate(nocheEnBogota)).toBe('2026-03-10')
    expect(nowLocalDateTime(nocheEnBogota)).toBe('2026-03-10T20:30:15')
  })

  it('no lleva sufijo Z ni desplazamiento de zona', () => {
    const valor = nowLocalDateTime(new Date(2026, 0, 5, 9, 5, 3))
    expect(valor).toBe('2026-01-05T09:05:03')
    expect(valor).not.toContain('Z')
    expect(valor).not.toContain('+')
  })
})

describe('el expediente descubre sus sub-vistas', () => {
  it('registra «Resumen» como la primera pestaña', () => {
    expect(subscriptionRecordTabs.length).toBeGreaterThan(0)
    expect(subscriptionRecordTabs[0]?.segment).toBe('resumen')
    expect(subscriptionRecordTabs[0]?.routeName).toBe('subscription-record-resumen')
  })

  it('mantiene los segmentos y los nombres de ruta únicos', () => {
    const segmentos = subscriptionRecordTabs.map((tab) => tab.segment)
    const nombres = subscriptionRecordTabs.map((tab) => tab.routeName)
    expect(new Set(segmentos).size).toBe(segmentos.length)
    expect(new Set(nombres).size).toBe(nombres.length)
  })

  it('ordena por `order` y no por nombre de fichero', () => {
    const orders = subscriptionRecordTabs.map((tab) => tab.order)
    expect([...orders].sort((a, b) => a - b)).toEqual(orders)
  })

  it('expone el nombre de la ruta padre para que la lista pueda enlazarla', () => {
    expect(SUBSCRIPTION_RECORD_ROUTE_NAMES.RECORD).toBe('subscription-record')
  })
})

describe('el ciclo de facturación se lee en castellano', () => {
  it('no deja escapar el valor crudo del enum', () => {
    expect(BILLING_CYCLE_LABEL.MONTHLY).toBe('Mensual')
    expect(BILLING_CYCLE_LABEL.ANNUAL).toBe('Anual')
  })
})

/**
 * `reason` dejó de ser texto libre: es el vocabulario cerrado de
 * `SubscriptionStatusChangeReason` (backend), y viaja por HTTP con el nombre
 * del enum en mayúsculas — igual que `status`.
 *
 * <p><b>Los dos conjuntos ya no coinciden, y esa es la prueba.</b> El mapa de
 * rótulos tiene los SIETE códigos del enum, porque el expediente tiene que poder
 * pintar cualquiera que llegue del servidor. El desplegable ofrece SEIS: a
 * `REPLACED_BY_NEW_CONTRACT` lo escribe el sistema cuando el cliente acepta una
 * cotización (DC-2), y dejar que una persona lo eligiera permitiría atribuirle a
 * esa causa una transición que decidió ella — sobre una columna que es prueba en
 * una disputa de cobro.
 */
describe('el motivo del cambio de estado es vocabulario cerrado, no texto libre', () => {
  /** Los siete del enum de dominio, en su mismo orden. */
  const CODIGOS_BACKEND = [
    'OVERDUE_BALANCE',
    'PAYMENT_RECEIVED',
    'TRIAL_ENDED',
    'CANCELLATION_EFFECTIVE',
    'PERIOD_EXPIRED',
    'MANUAL',
    'REPLACED_BY_NEW_CONTRACT',
  ]

  /** El que escribe el sistema y NINGUNA persona puede elegir. */
  const SOLO_DEL_SISTEMA = 'REPLACED_BY_NEW_CONTRACT'

  it('el mapa de rótulos cubre los siete códigos del enum, en su mismo orden', () => {
    expect(Object.keys(SUBSCRIPTION_STATUS_CHANGE_REASON_LABEL)).toEqual(CODIGOS_BACKEND)
  })

  it('el desplegable ofrece los seis que elige una persona, y NO el del sistema', () => {
    const ofrecidos = SUBSCRIPTION_STATUS_CHANGE_REASON_OPTIONS.map((o) => o.value)

    expect(ofrecidos).toEqual(CODIGOS_BACKEND.filter((c) => c !== SOLO_DEL_SISTEMA))
    expect(
      ofrecidos,
      'el operador puede firmar a mano una sustitución que decide el sistema',
    ).not.toContain(SOLO_DEL_SISTEMA)
    // Y sigue teniendo rótulo: el expediente tiene que poder PINTARLO aunque el
    // desplegable no deje ESCRIBIRLO.
    expect(SUBSCRIPTION_STATUS_CHANGE_REASON_LABEL[SOLO_DEL_SISTEMA]).toBe(
      'Sustituido por un contrato nuevo',
    )
  })

  it('cada opción trae una etiqueta en español y no el código crudo', () => {
    for (const opcion of SUBSCRIPTION_STATUS_CHANGE_REASON_OPTIONS) {
      expect(opcion.label).not.toBe(opcion.value)
      expect(opcion.label.length).toBeGreaterThan(0)
      expect(opcion.label).not.toMatch(/^[A-Z_]+$/)
    }
  })
})
