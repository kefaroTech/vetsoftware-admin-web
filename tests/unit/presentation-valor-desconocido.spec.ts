import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EntitlementsTable from '@/features/subscriptions-admin/components/record/EntitlementsTable.vue'
import SubscriptionDocumentsTable from '@/features/subscriptions-admin/components/record/SubscriptionDocumentsTable.vue'
import DocumentApplicationsBlock from '@/features/billing-documents/components/DocumentApplicationsBlock.vue'
import DocumentTaxBreakdown from '@/features/billing-documents/components/DocumentTaxBreakdown.vue'
import {
  ACCESS_LEVEL_PRESENTATION,
  SOURCE_PRESENTATION,
  accessLevelPresentation,
  sourcePresentation,
} from '@/features/subscriptions-admin/composables/entitlementText'
import {
  DOCUMENT_KIND_PRESENTATION,
  documentKindPresentation,
} from '@/features/subscriptions-admin/types/subscription-money.types'
import {
  APPLICATION_SOURCE_PRESENTATION,
  TAX_TREATMENT_PRESENTATION,
  applicationSourcePresentation,
  taxTreatmentPresentation,
} from '@/features/billing-documents/types/billing-documents.types'
import type {
  CompanyEntitlementResponse,
  EntitlementAccessLevel,
  EntitlementSource,
} from '@/features/subscriptions-admin/types/entitlements.types'
import type {
  BillingDocumentResponse,
  BillingDocumentTaxSummary,
  DocumentKind,
  TaxTreatment,
} from '@/features/billing-operations/types/billing-operations.types'
import type {
  ApplicationSourceKind,
  BillingDocumentApplicationResponse,
} from '@/features/billing-documents/types/billing-documents.types'

/**
 * <b>Los cinco mapas de presentación que quedaban sin guardar</b>, en las cuatro
 * tablas que los pintan.
 *
 * <p>Todos comparten el mismo molde y el mismo modo de fallar: la clave llega por
 * HTTP, el `Record` de claves finitas se resuelve como su valor —así que ni el
 * compilador ni `noUncheckedIndexedAccess` avisan—, y leer `.label` o `.variant`
 * sobre el `undefined` que devuelve una clave que no está derriba el árbol entero
 * de la pantalla, no la celda.
 *
 * <p>Dos de ellos ni siquiera necesitan que el backend cambie: el contrato declara
 * `accessLevel` y `source` como `string` suelto, no como enum, así que la unión de
 * la consola es un estrechamiento propio que nada obliga al servidor a respetar.
 */
const NIVEL_DESCONOCIDO = 'SUSPENDED' as EntitlementAccessLevel
const ORIGEN_DESCONOCIDO = 'PROMO' as EntitlementSource
const CLASE_DESCONOCIDA = 'RECEIPT' as DocumentKind
const APLICACION_DESCONOCIDA = 'BARTER' as ApplicationSourceKind
const TRATAMIENTO_DESCONOCIDO = 'REVERSE_CHARGE' as TaxTreatment

function permiso(): CompanyEntitlementResponse {
  return {
    id: 1,
    companyId: 42,
    subModule: { id: 9, code: 'AGENDA', name: 'Agenda' },
    accessLevel: NIVEL_DESCONOCIDO,
    source: ORIGEN_DESCONOCIDO,
    subscriptionId: null,
    subscriptionItemId: null,
    validFrom: '2026-03-01',
    validUntil: null,
    recalculatedAt: '2026-03-01T00:00:00',
  }
}

function documento(): BillingDocumentResponse {
  return {
    id: 7,
    companyId: 42,
    documentNumber: 'DC-2026-00184',
    subscriptionId: 184,
    documentKind: CLASE_DESCONOCIDA,
    billingReason: 'RECURRING_CYCLE',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    issueStatus: 'DRAFT',
    externalInvoiceNumber: null,
    externalCufe: null,
    externalIssuedAt: null,
    externalProvider: null,
    externalRegisteredAt: null,
    externalRegisteredBySystemUserId: null,
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
  }
}

function aplicacion(): BillingDocumentApplicationResponse {
  return {
    id: 3,
    companyId: 42,
    targetDocument: {
      id: 7,
      companyId: 42,
      documentNumber: 'DC-2026-00184',
      documentKind: 'INVOICE',
      totalAmount: 145000,
      balanceAmount: 0,
    },
    sourceKind: APLICACION_DESCONOCIDA,
    paymentId: 11,
    sourceDocument: null,
    valueDate: '2026-03-05',
    creditEntryId: null,
    withholdingId: null,
    writeOffAuthorizedBySystemUserId: null,
    writeOffReason: null,
    appliedAmount: 145000,
    reversalOfId: null,
    appliedAt: '2026-03-05T10:00:00',
    createdDate: '2026-03-05T10:00:00',
  }
}

function impuesto(): BillingDocumentTaxSummary {
  return {
    id: 2,
    taxTreatment: TRATAMIENTO_DESCONOCIDO,
    taxRate: 19,
    taxableBase: 100000,
    taxAmount: 19000,
  }
}

describe('las cuatro tablas sobreviven a un valor que la consola no conoce', () => {
  it('la tabla de permisos pinta dos huecos en tono neutro y no derriba `/acceso`', () => {
    const tabla = mount(EntitlementsTable, {
      props: {
        rows: [permiso()],
        scope: 'current' as const,
        loading: false,
        error: null,
        errorTraceId: null,
        highlightedItemId: null,
      },
    })

    expect(tabla.text()).toContain('Agenda')
    const distintivos = tabla.findAll('.badge')
    expect(distintivos).toHaveLength(2)
    for (const distintivo of distintivos) {
      expect(distintivo.text()).toBe('—')
      expect(distintivo.classes()).toContain('badge--neutral')
    }
  })

  it('la tabla de documentos pinta el hueco sin perder el estado de emisión', () => {
    const tabla = mount(SubscriptionDocumentsTable, {
      props: {
        rows: [documento()],
        subscriptionId: 184,
        focusedDocumentId: null,
        loading: false,
        error: null,
        errorTraceId: null,
      },
    })

    expect(tabla.text()).toContain('DC-2026-00184')
    expect(tabla.text()).toContain('—')
    expect(tabla.text()).toContain('Borrador')
    expect(tabla.text()).not.toContain('undefined')
  })

  it('el bloque de aplicaciones no inventa «Pago», ni en la fila ni en el botón', () => {
    const bloque = mount(DocumentApplicationsBlock, {
      props: {
        rows: [aplicacion()],
        total: 145000,
        loading: false,
        error: null,
        errorTraceId: null,
        settlement: null,
        reversingId: null,
      },
    })

    expect(bloque.text()).toContain('Pago #11')
    expect(bloque.get('td').text()).toContain('—')
    expect(bloque.get('button[aria-label]').attributes('aria-label')).toContain(
      'Contra-aplicar la aplicación #3 de —',
    )
  })

  it('el desglose de impuestos no adivina entre gravado y exento', () => {
    const desglose = mount(DocumentTaxBreakdown, {
      props: {
        taxes: [impuesto()],
        subtotal: 100000,
        check: { declared: 19000, summed: 19000, difference: 0, verdict: 'MATCHED' as const },
      },
    })

    expect(desglose.text()).toContain('19 %')
    expect(desglose.text()).toContain('—')
    expect(desglose.text()).not.toContain('Gravado')
    expect(desglose.text()).not.toContain('Exento')
  })

  it('el guardado no se come los valores que sí existen', () => {
    for (const [clave, presentacion] of Object.entries(ACCESS_LEVEL_PRESENTATION)) {
      expect(accessLevelPresentation(clave as EntitlementAccessLevel), clave).toBe(presentacion)
    }
    for (const [clave, presentacion] of Object.entries(SOURCE_PRESENTATION)) {
      expect(sourcePresentation(clave as EntitlementSource), clave).toBe(presentacion)
    }
    for (const [clave, presentacion] of Object.entries(DOCUMENT_KIND_PRESENTATION)) {
      expect(documentKindPresentation(clave as DocumentKind), clave).toBe(presentacion)
    }
    for (const [clave, presentacion] of Object.entries(APPLICATION_SOURCE_PRESENTATION)) {
      expect(applicationSourcePresentation(clave as ApplicationSourceKind), clave).toBe(
        presentacion,
      )
    }
    for (const [clave, presentacion] of Object.entries(TAX_TREATMENT_PRESENTATION)) {
      expect(taxTreatmentPresentation(clave as TaxTreatment), clave).toBe(presentacion)
    }
  })

  it('el campo ausente se trata como el valor desconocido, no como un fallo', () => {
    expect(accessLevelPresentation(null).label).toBe('—')
    expect(accessLevelPresentation(undefined).variant).toBe('neutral')
    expect(sourcePresentation(null).variant).toBe('neutral')
    expect(documentKindPresentation(undefined).label).toBe('—')
    expect(applicationSourcePresentation(null).label).toBe('—')
    expect(taxTreatmentPresentation(undefined).label).toBe('—')
  })
})
