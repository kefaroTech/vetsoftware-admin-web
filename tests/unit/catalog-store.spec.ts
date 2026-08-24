import { describe, it, expect } from 'vitest'
import { createCatalogStore } from '@/stores/createCatalogStore'

/**
 * La factoría que sostiene los diecisiete stores de catálogo del panel.
 *
 * Antes cada feature tenía su propia copia, así que un fallo aquí solo rompía
 * una pantalla. Ahora un fallo las rompe todas: especies, razas, colores,
 * módulos, roles y permisos base, y los cinco catálogos clínicos.
 * Ese es el precio de no repetirse, y esta es la red que lo compensa.
 */

interface SpecieResponse {
  id: number
  name: string
}

describe('createCatalogStore', () => {
  it('arranca vacío, sin seleccionado y sin cargar', () => {
    const store = createCatalogStore<SpecieResponse>('test-inicial')()

    expect(store.items).toEqual([])
    expect(store.selected).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('cada catálogo es un store independiente, no uno compartido', () => {
    // Es el riesgo real de una factoría: si el `defineStore` se evaluara una
    // sola vez, las especies y las razas acabarían leyendo la misma lista.
    const especies = createCatalogStore<SpecieResponse>('test-especies')()
    const razas = createCatalogStore<SpecieResponse>('test-razas')()

    especies.setItems([{ id: 1, name: 'Canino' }])

    expect(especies.items).toHaveLength(1)
    expect(razas.items).toEqual([])
  })

  it('el mismo nombre devuelve el MISMO store, que es lo que permite compartirlo', () => {
    // Dos componentes que piden el catálogo de especies deben ver una sola
    // lista; si no, cada uno cargaría la suya y se desincronizarían.
    const a = createCatalogStore<SpecieResponse>('test-compartido')()
    const b = createCatalogStore<SpecieResponse>('test-compartido')()

    a.setItems([{ id: 7, name: 'Felino' }])

    expect(b.items).toEqual([{ id: 7, name: 'Felino' }])
  })

  it('reemplaza la lista en vez de acumularla', () => {
    // Los composables llaman `setItems` tras cada alta, baja y recarga: si esto
    // concatenara, la lista crecería con duplicados en cada `fetchAll`.
    const store = createCatalogStore<SpecieResponse>('test-reemplazo')()

    store.setItems([{ id: 1, name: 'Canino' }])
    store.setItems([{ id: 2, name: 'Felino' }])

    expect(store.items).toEqual([{ id: 2, name: 'Felino' }])
  })

  it('permite limpiar el seleccionado con null', () => {
    // Al cerrar un detalle hay que poder soltar la referencia; si `setSelected`
    // no aceptara null, la pantalla siguiente abriría con el registro anterior.
    const store = createCatalogStore<SpecieResponse>('test-seleccion')()

    store.setSelected({ id: 3, name: 'Equino' })
    expect(store.selected).toEqual({ id: 3, name: 'Equino' })

    store.setSelected(null)
    expect(store.selected).toBeNull()
  })

  it('el loading sube y baja', () => {
    const store = createCatalogStore<SpecieResponse>('test-loading')()

    store.setLoading(true)
    expect(store.loading).toBe(true)

    store.setLoading(false)
    expect(store.loading).toBe(false)
  })
})
