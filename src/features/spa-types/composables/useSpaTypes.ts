import { storeToRefs } from 'pinia'
import { useSpaTypesStore } from '../stores/spa-types.store'
import { spaTypesApi } from '../api/spa-types.api'
import { useToast } from '@/composables/useToast'
import type { CreateSpaTypeRequest, UpdateSpaTypeRequest } from '../types/spa-types.types'

export function useSpaTypes() {
  const store = useSpaTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await spaTypesApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar los tipos de spa', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await spaTypesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Tipo de spa no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSpaTypeRequest) {
    const data = await spaTypesApi.create(payload)
    store.setItems([...store.items, data])
    success('Tipo de spa creado exitosamente')
    return data
  }

  async function update(id: number, payload: UpdateSpaTypeRequest) {
    const data = await spaTypesApi.update(id, payload)
    store.setItems(store.items.map((t) => (t.id === id ? data : t)))
    success('Tipo de spa actualizado')
    return data
  }

  async function remove(id: number) {
    await spaTypesApi.remove(id)
    store.setItems(store.items.filter((t) => t.id !== id))
    success('Tipo de spa eliminado')
  }

  return {
    spaTypes: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
