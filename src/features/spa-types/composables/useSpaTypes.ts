import { storeToRefs } from 'pinia'
import { useSpaTypesStore } from '../stores/spa-types.store'
import { spaTypesApi } from '../api/spa-types.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateSpaTypeCommand, UpdateSpaTypeCommand } from '../types/spa-types.types'

export function useSpaTypes() {
  const store = useSpaTypesStore()
  const { spaTypes, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await spaTypesApi.list()
      store.setSpaTypes(data)
    } catch {
      notify('Error al cargar los tipos de spa', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await spaTypesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Tipo de spa no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSpaTypeCommand) {
    const { data } = await spaTypesApi.create(payload)
    store.setSpaTypes([...store.spaTypes, data])
    notify('Tipo de spa creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateSpaTypeCommand) {
    const { data } = await spaTypesApi.update(id, payload)
    store.setSpaTypes(store.spaTypes.map((t) => (t.id === id ? data : t)))
    notify('Tipo de spa actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await spaTypesApi.remove(id)
    store.setSpaTypes(store.spaTypes.filter((t) => t.id !== id))
    notify('Tipo de spa eliminado', 'success')
  }

  return {
    spaTypes,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
