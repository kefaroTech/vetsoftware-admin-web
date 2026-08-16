import { storeToRefs } from 'pinia'
import { useBreedsStore } from '../stores/breeds.store'
import { breedsApi } from '../api/breeds.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateBreedRequest, UpdateBreedRequest } from '../types/breeds.types'

export function useBreeds() {
  const store = useBreedsStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await breedsApi.listAll()
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar las razas', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await breedsApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      notifyError('Raza no encontrada', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBreedRequest) {
    const data = await breedsApi.create(payload)
    store.setItems([...store.items, data])
    notify('Raza creada exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateBreedRequest) {
    const data = await breedsApi.update(id, payload)
    store.setItems(store.items.map((b) => (b.id === id ? data : b)))
    notify('Raza actualizada', 'success')
    return data
  }

  async function remove(id: number) {
    await breedsApi.remove(id)
    store.setItems(store.items.filter((b) => b.id !== id))
    notify('Raza eliminada', 'success')
  }

  return {
    breeds: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
