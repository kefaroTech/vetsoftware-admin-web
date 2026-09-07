import { describe, expect, it } from 'vitest'
import {
  buildPaymentsQuery,
  defaultPaymentsFilter,
} from '@/features/billing-operations/composables/paymentsFilter'

/**
 * Estas pruebas fijan la traducción del formulario al
 * `SubscriptionPaymentsQuery` del contrato, que es justo lo que se rompía en
 * silencio si alguien volvía a filtrar la página cargada.
 */
describe('buildPaymentsQuery traduce el filtro de pantalla al query del servidor', () => {
  it('sin ningún filtro no manda ningún parámetro', () => {
    expect(buildPaymentsQuery(null, defaultPaymentsFilter())).toEqual({})
  })

  it('incluye companyId solo cuando hay empresa elegida', () => {
    expect(buildPaymentsQuery(42, defaultPaymentsFilter())).toEqual({ companyId: 42 })
  })

  it('«solo pendientes envejecidos» manda status=PENDING y 60 minutos', () => {
    const query = buildPaymentsQuery(null, { ...defaultPaymentsFilter(), agingOnly: true })
    expect(query).toEqual({ status: 'PENDING', pendingOlderThanMinutes: 60 })
  })

  it('el checkbox de antigüedad manda sobre un estado elegido a mano', () => {
    const query = buildPaymentsQuery(null, {
      ...defaultPaymentsFilter(),
      status: 'CONFIRMED',
      agingOnly: true,
    })
    expect(query.status).toBe('PENDING')
    expect(query.pendingOlderThanMinutes).toBe(60)
  })

  it('sin el checkbox, manda el estado elegido a mano y nada de minutos', () => {
    const query = buildPaymentsQuery(null, { ...defaultPaymentsFilter(), status: 'FAILED' })
    expect(query).toEqual({ status: 'FAILED' })
  })

  it('el rango de fechas se manda como el instante de inicio y fin del día', () => {
    const query = buildPaymentsQuery(null, {
      ...defaultPaymentsFilter(),
      receivedFrom: '2026-09-01',
      receivedTo: '2026-09-06',
    })
    expect(query.receivedFrom).toBe(new Date(2026, 8, 1, 0, 0, 0).toISOString())
    expect(query.receivedTo).toBe(new Date(2026, 8, 6, 23, 59, 59, 999).toISOString())
  })
})
