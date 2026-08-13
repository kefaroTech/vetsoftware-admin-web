import { storeToRefs } from 'pinia'
import { useSpeciesStore } from '../stores/species.store'
import { speciesApi } from '../api/species.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateSpecieCommand, UpdateSpecieCommand } from '../types/species.types'

export function useSpecies() {
  const store = useSpeciesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await speciesApi.list()
      store.setItems(data)
    } catch {
      notify('Error al cargar las especies', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await speciesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Especie no encontrada', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSpecieCommand) {
    const { data } = await speciesApi.create(payload)
    store.setItems([...store.items, data])
    notify('Especie creada exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateSpecieCommand) {
    const { data } = await speciesApi.update(id, payload)
    store.setItems(store.items.map((s) => (s.id === id ? data : s)))
    notify('Especie actualizada', 'success')
    return data
  }

  async function remove(id: number) {
    await speciesApi.remove(id)
    store.setItems(store.items.filter((s) => s.id !== id))
    notify('Especie eliminada', 'success')
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
