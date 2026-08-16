import { storeToRefs } from 'pinia'
import { useAnimalColorsStore } from '../stores/animal-colors.store'
import { animalColorsApi } from '../api/animal-colors.api'
import { useToast } from '@/composables/useToast'
import type {
  CreateAnimalColorRequest,
  UpdateAnimalColorRequest,
} from '../types/animal-colors.types'

export function useAnimalColors() {
  const store = useAnimalColorsStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await animalColorsApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar los colores', e)
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
      errorFrom('Error al cargar los colores', e)
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
      errorFrom('Color no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateAnimalColorRequest) {
    const data = await animalColorsApi.create(payload)
    store.setItems([...store.items, data])
    success('Color creado exitosamente')
    return data
  }

  async function update(id: number, payload: UpdateAnimalColorRequest) {
    const data = await animalColorsApi.update(id, payload)
    store.setItems(store.items.map((c) => (c.id === id ? data : c)))
    success('Color actualizado')
    return data
  }

  async function remove(id: number) {
    await animalColorsApi.remove(id)
    store.setItems(store.items.filter((c) => c.id !== id))
    success('Color eliminado')
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
