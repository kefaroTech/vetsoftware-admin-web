import { storeToRefs } from 'pinia'
import { useSubmodulesStore } from '../stores/submodules.store'
import { submodulesApi } from '../api/submodules.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateSubModuleRequest, UpdateSubModuleRequest } from '../types/submodules.types'

export function useSubmodules() {
  const store = useSubmodulesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await submodulesApi.listAll()
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar los submódulos', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await submodulesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      notifyError('Submódulo no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSubModuleRequest) {
    const data = await submodulesApi.create(payload)
    store.setItems([...store.items, data])
    notify('Submódulo creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateSubModuleRequest) {
    const data = await submodulesApi.update(id, payload)
    store.setItems(store.items.map((s) => (s.id === id ? data : s)))
    notify('Submódulo actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await submodulesApi.remove(id)
    store.setItems(store.items.filter((s) => s.id !== id))
    notify('Submódulo eliminado', 'success')
  }

  return {
    submodules: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
