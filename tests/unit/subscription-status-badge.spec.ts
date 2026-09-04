import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SubscriptionStatusBadge from '@/features/subscriptions-admin/components/SubscriptionStatusBadge.vue'
import type { SubscriptionStatus } from '@/features/subscriptions-admin/types/subscriptions-admin.types'

/**
 * <b>El distintivo del estado del contrato.</b> Lo pintan la lista de contratos,
 * la cabecera de las seis sub-vistas del expediente y la tarjeta de contrato del
 * resumen de empresa.
 *
 * <p>El caso que hay que sujetar no es «pinta Activa»: es el <b>estado que esta
 * consola no conoce</b>. `SubscriptionStatus` es un tipo, no una comprobación en
 * tiempo de ejecución; el valor llega por HTTP y basta con que el backend añada
 * un séptimo estado —o con que el campo no venga— para que el mapa se indexe a
 * `undefined`. Y como el distintivo va en la CABECERA, leer `.label` sobre eso no
 * rompe un distintivo: derriba el expediente entero y deja la pantalla en blanco.
 *
 * <p>El tipo no avisa de esto: `Record<Clave, T>` con claves finitas se resuelve
 * como `T`, así que ni `noUncheckedIndexedAccess` salta. Solo lo caza una prueba.
 */
describe('el distintivo del estado sobrevive a un estado que la consola no conoce', () => {
  const DESCONOCIDO = 'PENDING' as SubscriptionStatus

  it('pinta el guion honesto en vez de reventar el árbol', () => {
    const badge = mount(SubscriptionStatusBadge, { props: { status: DESCONOCIDO } })

    expect(badge.text()).toBe('—')
  })

  it('lo pinta en tono neutro: inventar «activa» o «vencida» es peor que callar', () => {
    const badge = mount(SubscriptionStatusBadge, { props: { status: DESCONOCIDO } })

    expect(badge.get('span').classes()).toContain('badge--neutral')
  })

  it('los seis estados del contrato siguen teniendo su rótulo en castellano', () => {
    const rotulos: Record<SubscriptionStatus, string> = {
      TRIALING: 'En prueba',
      ACTIVE: 'Activa',
      PAST_DUE: 'Pago vencido',
      READ_ONLY: 'Solo lectura',
      CANCELLED: 'Cancelada',
      EXPIRED: 'Vencida',
    }

    for (const [status, rotulo] of Object.entries(rotulos)) {
      const badge = mount(SubscriptionStatusBadge, {
        props: { status: status as SubscriptionStatus },
      })
      expect(badge.text(), `estado ${status}`).toBe(rotulo)
    }
  })
})
