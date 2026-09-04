import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DocumentIdentityCard from '@/features/billing-documents/components/DocumentIdentityCard.vue'
import ExternalInvoiceRecord from '@/features/billing-operations/components/ExternalInvoiceRecord.vue'
import type { BillingDocumentResponse } from '@/features/billing-operations/types/billing-operations.types'

/**
 * <b>El titular del documento es el `&lt;h1&gt;` de su pantalla.</b>
 *
 * <p>`/documentos/:companyId/:id` se quedó sin titular de primer nivel, y no es
 * solo un problema de esquema de encabezados: `useModalFocus` y `useNavDrawer`
 * resuelven el foco buscando el `h1` de la región principal, y sin él anuncian
 * «región principal» en vez del documento que se acaba de abrir.
 *
 * <p><b>Y exactamente uno.</b> `ExternalInvoiceRecord` se monta anidado en esa
 * misma pantalla sobre el mismo chasis: si heredara el `h1`, la pantalla tendría
 * dos titulares de primer nivel, que es el defecto contrario y no mejor.
 */
function documento(overrides: Partial<BillingDocumentResponse> = {}): BillingDocumentResponse {
  return {
    id: 7,
    companyId: 42,
    documentNumber: 'DC-2026-00184',
    subscriptionId: 184,
    documentKind: 'INVOICE',
    billingReason: 'RECURRING_CYCLE',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    issueStatus: 'EXTERNAL_REGISTERED',
    externalInvoiceNumber: 'FE-991',
    externalCufe: 'abc',
    externalIssuedAt: '2026-03-02T00:00:00',
    externalProvider: 'Proveedor',
    externalRegisteredAt: '2026-03-02T10:00:00',
    externalRegisteredBySystemUserId: 3,
    correctsDocumentId: null,
    dueDate: null,
    subtotalAmount: 145000,
    taxAmount: 0,
    totalAmount: 145000,
    settledAmount: 0,
    balanceAmount: 145000,
    taxes: [],
    createdDate: '2026-03-01T00:05:00',
    version: 1,
    ...overrides,
  }
}

const stubs = {
  CompanyRef: true,
  DocumentCircuitBadge: true,
  ContractGapNotice: true,
  MoneyScopeNote: true,
  RouterLink: true,
}

describe('el documento tiene un titular de primer nivel, y solo uno', () => {
  it('la ficha de identidad pinta el número como `h1` con el id que recibe el foco', () => {
    const ficha = mount(DocumentIdentityCard, {
      props: { document: documento() },
      global: { stubs },
    })

    const titular = ficha.get('h1')
    expect(titular.attributes('id')).toBe('documento-titulo')
    expect(titular.text()).toBe('DC-2026-00184')
  })

  it('la ficha de la factura externa se queda en `h2`: dos `h1` serían el defecto contrario', () => {
    const ficha = mount(ExternalInvoiceRecord, {
      props: { document: documento() },
      global: { stubs },
    })

    expect(ficha.findAll('h1')).toHaveLength(0)
    expect(ficha.get('h2').attributes('id')).toBe('external-invoice-record-title')
  })
})
