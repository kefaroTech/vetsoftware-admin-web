import { storeToRefs } from 'pinia'
import { useBreedsStore } from '../stores/breeds.store'
import { breedsApi } from '../api/breeds.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateBreedCommand, UpdateBreedCommand } from '../types/breeds.types'

export function useBreeds() {
  const store = useBreedsStore()
  const { breeds, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await breedsApi.list()
      store.setBreeds(data)
    } catch {
      notify('Error al cargar las razas', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await breedsApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Raza no encontrada', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBreedCommand) {
    const { data } = await breedsApi.create(payload)
    store.setBreeds([...store.breeds, data])
    notify('Raza creada exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateBreedCommand) {
    const { data } = await breedsApi.update(id, payload)
    store.setBreeds(store.breeds.map((b) => (b.id === id ? data : b)))
    notify('Raza actualizada', 'success')
    return data
  }

  async function remove(id: number) {
    await breedsApi.remove(id)
    store.setBreeds(store.breeds.filter((b) => b.id !== id))
    notify('Raza eliminada', 'success')
  }

  return {
    breeds,
    selected,
    loading,
    fetchAll, fetchById, create, update, remove,
  }
}
