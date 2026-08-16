import { storeToRefs } from 'pinia'
import { useAnimalColorsStore } from '../stores/animal-colors.store'
import { animalColorsApi } from '../api/animal-colors.api'
import { useNotification } from '@/composables/useNotification'
import type {
  CreateAnimalColorRequest,
  UpdateAnimalColorRequest,
} from '../types/animal-colors.types'

export function useAnimalColors() {
  const store = useAnimalColorsStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await animalColorsApi.listAll()
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar los colores', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchBySpecie(specieId: number) {
    store.setLoading(true)
    try {
      const data = await animalColorsApi.listBySpecie(specieId)
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar los colores', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await animalColorsApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      notifyError('Color no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateAnimalColorRequest) {
    const data = await animalColorsApi.create(payload)
    store.setItems([...store.items, data])
    notify('Color creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateAnimalColorRequest) {
    const data = await animalColorsApi.update(id, payload)
    store.setItems(store.items.map((c) => (c.id === id ? data : c)))
    notify('Color actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await animalColorsApi.remove(id)
    store.setItems(store.items.filter((c) => c.id !== id))
    notify('Color eliminado', 'success')
  }

  return {
    colors: items,
    selected,
    loading,
    fetchAll,
    fetchBySpecie,
    fetchById,
    create,
    update,
    remove,
  }
}
