import { storeToRefs } from 'pinia'
import { useModulesStore } from '../stores/modules.store'
import { modulesApi } from '../api/modules.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateModuleRequest, UpdateModuleRequest } from '../types/modules.types'

export function useModules() {
  const store = useModulesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await modulesApi.listAll()
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar los módulos', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await modulesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      notifyError('Módulo no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateModuleRequest) {
    const data = await modulesApi.create(payload)
    store.setItems([...store.items, data])
    notify('Módulo creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateModuleRequest) {
    const data = await modulesApi.update(id, payload)
    store.setItems(store.items.map((m) => (m.id === id ? data : m)))
    notify('Módulo actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await modulesApi.remove(id)
    store.setItems(store.items.filter((m) => m.id !== id))
    notify('Módulo eliminado', 'success')
  }

  return {
    modules: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
