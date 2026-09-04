import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SubscriptionChargesTable from '@/features/subscriptions-admin/components/record/SubscriptionChargesTable.vue'
import DocumentChargesBlock from '@/features/billing-documents/components/DocumentChargesBlock.vue'
import { chargeOriginLabel } from '@/features/subscriptions-admin/composables/subscriptionMoneyText'
import {
  CHARGE_STATUS_PRESENTATION,
  CHARGE_TYPE_PRESENTATION,
  chargeStatusPresentation,
  chargeTypePresentation,
} from '@/features/subscriptions-admin/types/subscription-money.types'
import type {
  SubscriptionChargeResponse,
  SubscriptionChargeStatus,
  SubscriptionChargeType,
} from '@/features/subscriptions-admin/types/subscription-money.types'

/**
 * <b>Los dos mapas de presentación del cargo</b>, que pintan la tabla del
 * expediente (`/dinero`) y los renglones del detalle de un documento.
 *
 * <p>El caso que hay que sujetar no es «pinta Recurrente»: es el <b>tipo o el
 * estado que esta consola no conoce</b>. `SubscriptionChargeType` y
 * `SubscriptionChargeStatus` son tipos, no comprobaciones en tiempo de ejecución;
 * el valor llega por HTTP y basta con que el backend emita un séptimo tipo —o con
 * que el campo no venga— para que el `Record` se indexe a `undefined`. Leer
 * `.label` sobre eso no estropea una celda: derriba el árbol entero y deja la
 * pantalla del dinero en blanco.
 *
 * <p>El tipo no avisa: `Record<Clave, T>` con claves finitas se resuelve como `T`,
 * así que ni `noUncheckedIndexedAccess` salta. Solo lo caza una prueba.
 */
const TIPO_DESCONOCIDO = 'SETUP_FEE' as SubscriptionChargeType
const ESTADO_DESCONOCIDO = 'DISPUTED' as SubscriptionChargeStatus

function charge(overrides: Partial<SubscriptionChargeResponse> = {}): SubscriptionChargeResponse {
  return {
    id: 500,
    subscriptionId: 184,
    subscriptionItemId: null,
    chargeType: TIPO_DESCONOCIDO,
    description: 'Núcleo + agenda',
    servicePeriodStart: '2026-03-01',
    servicePeriodEnd: '2026-03-31',
    quantity: 1,
    unitAmount: 145000,
    subtotalAmount: 145000,
    taxRate: 0,
    taxTreatment: 'EXCLUDED',
    prorationDays: null,
    periodDays: null,
    status: ESTADO_DESCONOCIDO,
    amendmentId: null,
    billingDocumentId: null,
    voidsChargeId: null,
    createdDate: '2026-03-01T00:05:00',
    ...overrides,
  }
}

function montarTablaDelExpediente(row: SubscriptionChargeResponse) {
  return mount(SubscriptionChargesTable, {
    props: {
      rows: [row],
      companyId: 42,
      subscriptionId: 184,
      loading: false,
      error: null,
      errorTraceId: null,
      documentNumbers: {},
      filteredByDocument: false,
      highlightedAmendmentId: null,
      highlightedItemId: null,
    },
  })
}

describe('los cargos sobreviven a un tipo y a un estado que la consola no conoce', () => {
  it('la tabla del expediente pinta el guion honesto en vez de reventar el árbol', () => {
    const tabla = montarTablaDelExpediente(charge())

    expect(tabla.text()).toContain('Núcleo + agenda')
    expect(tabla.text()).toContain('— · cargo #500')
    expect(tabla.text()).not.toContain('undefined')
  })

  it('el estado desconocido va en tono neutro: afirmar «vencido» sobre dinero es peor que callar', () => {
    const tabla = montarTablaDelExpediente(charge())

    const distintivo = tabla.get('.badge')
    expect(distintivo.text()).toBe('—')
    expect(distintivo.classes()).toContain('badge--neutral')
  })

  it('el segundo acceso al mismo cargo —el `title` de la cadena— tampoco lanza', () => {
    expect(chargeOriginLabel(charge())).toBe('— · — · Núcleo + agenda')
  })

  it('los renglones del documento sobreviven al mismo cargo', () => {
    const bloque = mount(DocumentChargesBlock, {
      props: {
        lines: {
          rows: [charge()],
          subtotal: 145000,
          documentSubtotal: 145000,
          truncated: false,
          matches: true,
          complete: true,
        },
        subscriptionId: 184,
        loading: false,
        error: null,
        errorTraceId: null,
      },
    })

    expect(bloque.text()).toContain('— · cargo #500')
    expect(bloque.text()).not.toContain('undefined')
  })

  it('el guardado no se come los valores que sí existen', () => {
    for (const [tipo, presentacion] of Object.entries(CHARGE_TYPE_PRESENTATION)) {
      expect(chargeTypePresentation(tipo as SubscriptionChargeType), tipo).toBe(presentacion)
    }
    for (const [estado, presentacion] of Object.entries(CHARGE_STATUS_PRESENTATION)) {
      expect(chargeStatusPresentation(estado as SubscriptionChargeStatus), estado).toBe(
        presentacion,
      )
    }
  })

  it('el campo ausente se trata como el valor desconocido, no como un fallo', () => {
    expect(chargeTypePresentation(null).label).toBe('—')
    expect(chargeTypePresentation(undefined).label).toBe('—')
    expect(chargeStatusPresentation(null).variant).toBe('neutral')
    expect(chargeStatusPresentation(undefined).variant).toBe('neutral')
  })
})
