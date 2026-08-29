import { describe, expect, it } from 'vitest'
import { catalogItemLabelByCode } from '@/features/configurator/composables/effect-sentence'
import { useConfiguratorTester } from '@/features/configurator/composables/useConfiguratorTester'
import { useConfiguratorStore } from '@/features/configurator/stores/configurator.store'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Las dos mitades del giro de `/configurator/resolve` que el compilador NO
 * vigila, porque las dos compilan igual de bien estando mal:
 *
 * <ol>
 *   <li><b>El carrito se identifica por `code`.</b> El endpoint es anónimo y
 *       devolver el `catalogItemId` interno lo convertía en un oráculo de
 *       enumeración del catálogo, así que el contrato lo retiró. La consecuencia
 *       en el front no es un cambio de tipo: es que el índice del catálogo tiene
 *       que estar cacheado <b>por código</b>. Un índice por id compila
 *       perfectamente y devuelve `undefined` para todas las filas.</li>
 *   <li><b>El ciclo cambia el resultado.</b> El techo de capacidad incluida es
 *       una columna de la fila de precio y hay una por ciclo. Un carrito
 *       resuelto en mensual que se queda en pantalla bajo un selector que dice
 *       «Anual» es la ambigüedad que el contrato acaba de cerrar en el servidor,
 *       reabierta en el navegador.</li>
 * </ol>
 */

function catalogItem(id: number, code: string, name: string): CatalogItemResponse {
  return {
    id,
    code,
    name,
    shortDescription: null,
    longDescription: null,
    itemType: 'MODULE',
    capacityUnit: null,
    core: false,
    minQuantity: 1,
    maxQuantity: null,
    sortOrder: id,
    status: 'ACTIVE',
    createdDate: '2026-01-01T00:00:00',
    enabled: true,
    defaultTrialDays: null,
  }
}

const AGENDA = catalogItem(7, 'AGENDA', 'Agenda')
const TERMINAL = catalogItem(12, 'TERMINAL', 'Terminal')

describe('el nombre del artículo resuelto sale de su código', () => {
  it('nombra el artículo cuando el catálogo lo trae', () => {
    const porCodigo = new Map([
      [AGENDA.code, AGENDA],
      [TERMINAL.code, TERMINAL],
    ])
    expect(catalogItemLabelByCode('TERMINAL', porCodigo)).toBe('Terminal (TERMINAL)')
  })

  /**
   * El catálogo se carga aparte y su fallo es un `warn`, no un error: la
   * pantalla sigue en pie. Lo que no puede pasar es que la celda quede en
   * `undefined` — el código, solo, ya identifica el artículo para el operador.
   */
  it('si el catálogo no trae ese código, enseña el código y no un hueco', () => {
    const etiqueta = catalogItemLabelByCode('SIN_CARGAR', new Map())
    expect(etiqueta).toBe('artículo «SIN_CARGAR»')
    expect(etiqueta).not.toContain('undefined')
  })

  it('el índice del store está cacheado por código, que es lo que devuelve el resolver', () => {
    const store = useConfiguratorStore()
    store.setCatalogItems([AGENDA, TERMINAL])

    // Lo que llega de `/configurator/resolve`: código y cantidad, sin id.
    const resuelto = [{ code: 'TERMINAL', quantity: 3 }]
    const nombres = resuelto.map((item) =>
      catalogItemLabelByCode(item.code, store.catalogItemByCode),
    )

    expect(nombres).toEqual(['Terminal (TERMINAL)'])
    // El índice por id sigue existiendo: los efectos del editor sí apuntan al id
    // interno y ese lado del contrato no se movió.
    expect(store.catalogItemById.get(12)?.code).toBe('TERMINAL')
  })
})

describe('el ciclo de facturación del probador', () => {
  it('arranca en mensual, que es el ciclo por defecto del resto de la consola', () => {
    expect(useConfiguratorStore().billingCycle).toBe('MONTHLY')
  })

  /**
   * La regla que impide enseñar un número correcto bajo un rótulo equivocado:
   * cambiar el ciclo invalida el carrito ya resuelto, exactamente igual que
   * cambiar una respuesta.
   */
  it('cambiar el ciclo retira el resultado anterior', () => {
    const store = useConfiguratorStore()
    const tester = useConfiguratorTester()
    store.setSelection([{ code: 'AGENDA', quantity: 1 }])

    tester.updateBillingCycle('ANNUAL')

    expect(store.billingCycle).toBe('ANNUAL')
    expect(store.selection).toBeNull()
  })

  it('reelegir el mismo ciclo no tira el resultado: no ha cambiado nada', () => {
    const store = useConfiguratorStore()
    const tester = useConfiguratorTester()
    store.setSelection([{ code: 'AGENDA', quantity: 1 }])

    tester.updateBillingCycle('MONTHLY')

    expect(store.selection).toEqual([{ code: 'AGENDA', quantity: 1 }])
  })

  /**
   * La comparación antes/después se rotula con el ciclo de SUS fotos, no con el
   * que el selector tenga en ese momento: entre guardar y leer la tabla el
   * operador puede haber cambiado de ciclo en «Probar».
   */
  it('la comparación guarda el ciclo con el que se tomó', () => {
    const store = useConfiguratorStore()
    store.setComparison({
      before: [{ code: 'AGENDA', quantity: 1 }],
      after: [{ code: 'AGENDA', quantity: 2 }],
      label: 'Guardar el efecto',
      scenario: 'Spa Ana Pet (escenario de referencia)',
      cycle: 'ANNUAL',
    })

    store.setBillingCycle('MONTHLY')

    expect(store.comparisonCycle).toBe('ANNUAL')
  })
})
