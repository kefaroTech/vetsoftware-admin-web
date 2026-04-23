import { useModulesStore } from '../stores/modules.store'
import { modulesApi } from '../api/modules.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateModuleCommand, UpdateModuleCommand } from '../types/modules.types'

export function useModules() {
  const store = useModulesStore()
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await modulesApi.list()
      store.setModules(data)
    } catch {
      notify('Error al cargar los módulos', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await modulesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Módulo no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateModuleCommand) {
    const { data } = await modulesApi.create(payload)
    store.setModules([...store.modules, data])
    notify('Módulo creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateModuleCommand) {
    const { data } = await modulesApi.update(id, payload)
    store.setModules(store.modules.map((m) => (m.id === id ? data : m)))
    notify('Módulo actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await modulesApi.remove(id)
    store.setModules(store.modules.filter((m) => m.id !== id))
    notify('Módulo eliminado', 'success')
  }

  return {
    modules: store.modules,
    selected: store.selected,
    loading: store.loading,
    fetchAll, fetchById, create, update, remove,
  }
}
