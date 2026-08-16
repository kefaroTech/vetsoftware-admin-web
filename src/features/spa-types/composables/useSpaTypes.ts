import { storeToRefs } from 'pinia'
import { useSpaTypesStore } from '../stores/spa-types.store'
import { spaTypesApi } from '../api/spa-types.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateSpaTypeRequest, UpdateSpaTypeRequest } from '../types/spa-types.types'

export function useSpaTypes() {
  const store = useSpaTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await spaTypesApi.listAll()
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar los tipos de spa', e)
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
      notifyError('Tipo de spa no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSpaTypeRequest) {
    const data = await spaTypesApi.create(payload)
    store.setItems([...store.items, data])
    notify('Tipo de spa creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateSpaTypeRequest) {
    const data = await spaTypesApi.update(id, payload)
    store.setItems(store.items.map((t) => (t.id === id ? data : t)))
    notify('Tipo de spa actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await spaTypesApi.remove(id)
    store.setItems(store.items.filter((t) => t.id !== id))
    notify('Tipo de spa eliminado', 'success')
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
