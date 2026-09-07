import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaymentsTable from '@/features/billing-operations/components/PaymentsTable.vue'
import type { SubscriptionPaymentResponse } from '@/features/billing-operations/types/billing-operations.types'

/**
 * Un pago-reserva («WOMPI» sin número mientras la pasarela no
 * confirma) se leía como un dato incompleto. El badge y el guion con `title`
 * son la diferencia entre eso y una reserva normal.
 */
function pago(overrides: Partial<SubscriptionPaymentResponse> = {}): SubscriptionPaymentResponse {
  return {
    id: 501,
    companyId: 42,
    amount: 150000,
    currency: 'COP',
    paymentMethod: 'CARD',
    gateway: 'WOMPI',
    gatewayReference: null,
    receivedAt: '2026-09-06T10:00:00',
    status: 'PENDING',
    reconciledAt: null,
    feeAmount: null,
    netAmount: null,
    settlementReference: null,
    settledOn: null,
    refundedAmount: null,
    clientRequestId: null,
    reservation: false,
    createdDate: '2026-09-06T10:00:00',
    version: 1,
    ...overrides,
  }
}

// El stub por defecto (`true`) no pinta el slot; aquí sí hace falta el texto
// del enlace, así que se sustituye por uno mínimo que lo conserva.
const stubs = { CompanyRef: true, RouterLink: { template: '<a><slot /></a>' } }

function montar(payments: SubscriptionPaymentResponse[]) {
  return mount(PaymentsTable, {
    global: { stubs },
    props: {
      payments,
      page: 1,
      pageSize: 20,
      total: payments.length,
      pageCount: 1,
      loading: false,
      error: null,
      errorTraceId: null,
    },
  })
}

describe('PaymentsTable rotula la reserva en vez de dejar «WOMPI» sin número', () => {
  it('un pago con reservation=true lleva el badge informativo y la pasarela en guion con title', () => {
    const w = montar([pago({ reservation: true, gatewayReference: null })])

    expect(w.text()).toContain('Reserva en espera de confirmación')
    const pasarela = w.get('td.pasarela')
    expect(pasarela.text()).toContain('—')
    expect(pasarela.find('[title]').attributes('title')).toBe(
      'Reservado; Wompi todavía no confirmó la referencia.',
    )
  })

  it('un pago normal con referencia no lleva el badge y enlaza a sus eventos', () => {
    const w = montar([pago({ reservation: false, gatewayReference: 'REF-123' })])

    expect(w.text()).not.toContain('Reserva en espera de confirmación')
    expect(w.text()).toContain('WOMPI')
    expect(w.text()).toContain('REF-123')
    expect(w.text()).toContain('Ver eventos')
  })

  it('muestra clientRequestId como referencia interna', () => {
    const w = montar([pago({ clientRequestId: 'req-abc-123' })])
    expect(w.text()).toContain('req-abc-123')
  })
})
