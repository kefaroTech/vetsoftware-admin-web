import { describe, expect, it } from 'vitest'
import {
  LIFECYCLE_LABEL,
  LIFECYCLE_VARIANT,
  isOperable,
  itemLifecycleOn,
  lifecycleSupportText,
  originLabel,
  taxLabel,
} from '@/features/subscriptions-admin/composables/subscriptionItemLifecycle'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import type { SubscriptionItemResponse } from '@/features/subscriptions-admin/types/subscription-items.types'

function line(overrides: Partial<SubscriptionItemResponse> = {}): SubscriptionItemResponse {
  return {
    id: 901,
    companyId: 42,
    subscriptionId: 184,
    catalogItemId: 7,
    itemCode: 'CLINICAL_HISTORY',
    itemName: 'Historia clínica',
    itemType: 'MODULE',
    capacityUnit: null,
    includedQuantity: 0,
    taxTreatment: 'TAXED',
    quantity: 1,
    billableQuantity: 1,
    unitAmount: 34000,
    taxRate: 19,
    effectiveFrom: '2026-03-01',
    effectiveTo: null,
    origin: 'ADDON',
    createdAmendmentId: 42,
    endedAmendmentId: null,
    createdDate: '2026-03-01T09:00:00',
    enabled: true,
    ...overrides,
  }
}

/**
 * <b>El criterio de vigencia, fijado con pruebas.</b>
 *
 * <p>El modelo avisa de que «vigente» no es «sin fecha de fin» sino «ya empezó y
 * todavía no ha terminado», y de que el criterio equivocado produce un error
 * <i>invisible</i>: nada falla, nada avisa, y se descubre cuando un cliente reclama
 * meses después. Un error invisible solo lo puede parar una prueba.
 *
 * <p>Los casos de abajo son, uno a uno, la tabla de §3.3 y el intervalo semiabierto
 * `[from, to)` de `EffectivePeriod`.
 */
describe('las tres vigencias de una línea de contrato', () => {
  it('una línea que empieza después de la fecha es Programada, no Vigente', () => {
    // El error tentador: `effectiveTo === null` → «vigente». Esta línea no tiene
    // fecha de fin Y NO está vigente el 3 de marzo, porque todavía no ha empezado.
    const futura = line({ effectiveFrom: '2026-04-01', effectiveTo: null })
    expect(itemLifecycleOn(futura, '2026-03-03')).toBe('SCHEDULED')
    expect(LIFECYCLE_LABEL[itemLifecycleOn(futura, '2026-03-03')]).toBe('Programada')
  })

  it('una línea abierta que ya empezó es Vigente', () => {
    expect(itemLifecycleOn(line({ effectiveFrom: '2026-03-01' }), '2026-03-03')).toBe('CURRENT')
  })

  it('el día de inicio ya cuenta: el intervalo es cerrado por la izquierda', () => {
    expect(itemLifecycleOn(line({ effectiveFrom: '2026-03-03' }), '2026-03-03')).toBe('CURRENT')
  })

  it('el día de fin NO cuenta: el intervalo es abierto por la derecha', () => {
    // La misma convención que `EffectivePeriod`: la línea que cierra el 30 y la que
    // abre el 30 no se solapan ni dejan hueco.
    const cerrada = line({ effectiveFrom: '2026-01-01', effectiveTo: '2026-03-03' })
    expect(itemLifecycleOn(cerrada, '2026-03-03')).toBe('CLOSED')
    expect(itemLifecycleOn(cerrada, '2026-03-02')).toBe('CURRENT')
  })

  it('una línea con fecha de fin futura sigue Vigente hoy', () => {
    const conBaja = line({ effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30' })
    expect(itemLifecycleOn(conBaja, '2026-03-03')).toBe('CURRENT')
    expect(lifecycleSupportText(conBaja, '2026-03-03')).toContain('baja programada')
  })

  it('una línea cerrada en el pasado se sigue pudiendo consultar en su propio tramo', () => {
    // Es la razón de que las cerradas se muestren: preguntar por el 15 de febrero
    // tiene que devolver lo que había el 15 de febrero.
    const cerrada = line({ effectiveFrom: '2026-01-01', effectiveTo: '2026-03-01' })
    expect(itemLifecycleOn(cerrada, '2026-02-15')).toBe('CURRENT')
    expect(itemLifecycleOn(cerrada, '2026-03-03')).toBe('CLOSED')
  })

  it('las fechas se comparan como texto ISO, sin pasar por Date ni por zona horaria', () => {
    // `new Date('2026-03-03')` se interpreta como UTC y en Bogotá cae el día 2. En
    // una pantalla que dice qué tenía alguien un día concreto, un día de desfase es
    // EL fallo. Se comprueba con una fecha límite de fin de mes.
    const cerrada = line({ effectiveFrom: '2026-02-01', effectiveTo: '2026-03-01' })
    expect(itemLifecycleOn(cerrada, '2026-02-28')).toBe('CURRENT')
    expect(itemLifecycleOn(cerrada, '2026-03-01')).toBe('CLOSED')
  })

  it('tolera que un día llegue con hora sin clasificar al revés', () => {
    const conHora = line({ effectiveFrom: '2026-03-03T00:00:00', effectiveTo: null })
    expect(itemLifecycleOn(conHora, '2026-03-03')).toBe('CURRENT')
  })
})

/**
 * Ningún estado de esta consola se comunica solo por color (§5.2). Los tres tienen
 * rótulo textual, y «Programada» y «Cerrada» comparten tono a propósito: lo que las
 * separa son las palabras.
 */
describe('los tres estados llevan rótulo textual', () => {
  it('cada estado tiene un rótulo en español', () => {
    expect(LIFECYCLE_LABEL).toEqual({
      CURRENT: 'Vigente',
      SCHEDULED: 'Programada',
      CLOSED: 'Cerrada',
    })
  })

  it('solo lo vigente usa un tono distinto del neutro', () => {
    expect(LIFECYCLE_VARIANT.CURRENT).toBe('success')
    expect(LIFECYCLE_VARIANT.SCHEDULED).toBe('neutral')
    expect(LIFECYCLE_VARIANT.CLOSED).toBe('neutral')
  })

  it('la frase de apoyo dice las fechas, que es lo que se lee por teléfono', () => {
    const cerrada = line({ effectiveFrom: '2026-01-01', effectiveTo: '2026-03-01' })
    expect(lifecycleSupportText(cerrada, '2026-03-03')).toBe(
      'Estuvo desde el 01/01/2026 hasta el 01/03/2026.',
    )
    const futura = line({ effectiveFrom: '2026-04-01' })
    expect(lifecycleSupportText(futura, '2026-03-03')).toBe('Empieza el 01/04/2026.')
  })
})

/**
 * Una línea cerrada no se cambia ni se vuelve a dar de baja: no son operaciones que
 * existan. Y no se pintan deshabilitadas — se omiten del marcado (§3.2).
 */
describe('sobre qué líneas cabe operar', () => {
  it('una cerrada no admite ninguna acción', () => {
    expect(isOperable(line({ effectiveTo: '2026-03-01' }), '2026-03-03')).toBe(false)
  })

  it('una programada sí: todavía se puede corregir antes de que empiece', () => {
    expect(isOperable(line({ effectiveFrom: '2026-04-01' }), '2026-03-03')).toBe(true)
  })

  it('una vigente sí', () => {
    expect(isOperable(line(), '2026-03-03')).toBe(true)
  })
})

describe('el vocabulario de la línea', () => {
  it('el origen se dice en español y delata que el modelo no edita', () => {
    expect(originLabel('QUANTITY_CHANGE')).toBe('Cambio de cantidad')
    expect(originLabel('REMOVAL')).toBe('Baja')
    expect(originLabel(null)).toBe('—')
  })

  it('el impuesto congelado lleva la tasa cuando la hay', () => {
    expect(taxLabel(line({ taxRate: 19, taxTreatment: 'TAXED' }))).toBe('19 % · Gravado')
    expect(taxLabel(line({ taxRate: 0, taxTreatment: 'EXEMPT' }))).toBe('Exento')
  })
})

/**
 * El punto de extensión de la onda 2: la pestaña tiene que aparecer sola, en su sitio
 * y con la ruta que espera el resto del expediente. Si alguien renombra el segmento o
 * el `order`, el enlace que soporte pegó en un ticket deja de abrir.
 */
describe('la pestaña «Lo contratado» se registra sola', () => {
  it('está en la barra, en la posición 2 y con su nombre de ruta', () => {
    const tab = subscriptionRecordTabs.find((t) => t.segment === 'contratado')
    expect(tab).toBeDefined()
    expect(tab?.order).toBe(2)
    expect(tab?.routeName).toBe('subscription-record-contratado')
    expect(tab?.label).toBe('Lo contratado')
  })

  it('va después de «Resumen», que es el orden con significado de §4.4.2', () => {
    const segments = subscriptionRecordTabs.map((t) => t.segment)
    expect(segments.indexOf('contratado')).toBe(segments.indexOf('resumen') + 1)
  })
})
