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
    try {
      const data = await animalColorsApi.create(payload)
      store.setItems([...store.items, data])
      success('Color creado exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear el color', e, 'No se pudo crear el color.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateAnimalColorRequest) {
    try {
      const data = await animalColorsApi.update(id, payload)
      store.setItems(store.items.map((c) => (c.id === id ? data : c)))
      success('Color actualizado')
      return data
    } catch (e) {
      errorFrom('Error al actualizar el color', e, 'No se pudo actualizar el color.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await animalColorsApi.remove(id)
      store.setItems(store.items.filter((c) => c.id !== id))
      success('Color eliminado')
    } catch (e) {
      errorFrom('Error al eliminar el color', e, 'No se pudo eliminar el color.')
      throw e
    }
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
