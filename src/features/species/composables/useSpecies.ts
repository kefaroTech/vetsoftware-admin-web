import { storeToRefs } from 'pinia'
import { useSpeciesStore } from '../stores/species.store'
import { speciesApi } from '../api/species.api'
import { useToast } from '@/composables/useToast'
import type { CreateSpecieRequest, UpdateSpecieRequest } from '../types/species.types'

export function useSpecies() {
  const store = useSpeciesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await speciesApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar las especies', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await speciesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Especie no encontrada', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSpecieRequest) {
    try {
      const data = await speciesApi.create(payload)
      store.setItems([...store.items, data])
      success('Especie creada exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear la especie', e, 'No se pudo crear la especie.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateSpecieRequest) {
    try {
      const data = await speciesApi.update(id, payload)
      store.setItems(store.items.map((s) => (s.id === id ? data : s)))
      success('Especie actualizada')
      return data
    } catch (e) {
      errorFrom('Error al actualizar la especie', e, 'No se pudo actualizar la especie.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await speciesApi.remove(id)
      store.setItems(store.items.filter((s) => s.id !== id))
      success('Especie eliminada')
    } catch (e) {
      errorFrom('Error al eliminar la especie', e, 'No se pudo eliminar la especie.')
      throw e
    }
  }

  return {
    species: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
