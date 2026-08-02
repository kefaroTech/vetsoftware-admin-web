import { storeToRefs } from 'pinia'
import { useAnimalColorsStore } from '../stores/animal-colors.store'
import { animalColorsApi } from '../api/animal-colors.api'
import { useNotification } from '@/composables/useNotification'
import type {
  CreateAnimalColorCommand,
  UpdateAnimalColorCommand,
} from '../types/animal-colors.types'

export function useAnimalColors() {
  const store = useAnimalColorsStore()
  const { colors, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await animalColorsApi.list()
      store.setColors(data)
    } catch {
      notify('Error al cargar los colores', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await animalColorsApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Color no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateAnimalColorCommand) {
    const { data } = await animalColorsApi.create(payload)
    store.setColors([...store.colors, data])
    notify('Color creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateAnimalColorCommand) {
    const { data } = await animalColorsApi.update(id, payload)
    store.setColors(store.colors.map((c) => (c.id === id ? data : c)))
    notify('Color actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await animalColorsApi.remove(id)
    store.setColors(store.colors.filter((c) => c.id !== id))
    notify('Color eliminado', 'success')
  }

  return {
    colors,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
