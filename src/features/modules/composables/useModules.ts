import { storeToRefs } from 'pinia'
import { useModulesStore } from '../stores/modules.store'
import { modulesApi } from '../api/modules.api'
import { useToast } from '@/composables/useToast'
import type { CreateModuleRequest, UpdateModuleRequest } from '../types/modules.types'

export function useModules() {
  const store = useModulesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await modulesApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar los módulos', e)
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
      errorFrom('Módulo no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateModuleRequest) {
    try {
      const data = await modulesApi.create(payload)
      store.setItems([...store.items, data])
      success('Módulo creado exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear el módulo', e, 'No se pudo crear el módulo.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateModuleRequest) {
    try {
      const data = await modulesApi.update(id, payload)
      store.setItems(store.items.map((m) => (m.id === id ? data : m)))
      success('Módulo actualizado')
      return data
    } catch (e) {
      errorFrom('Error al actualizar el módulo', e, 'No se pudo actualizar el módulo.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await modulesApi.remove(id)
      store.setItems(store.items.filter((m) => m.id !== id))
      success('Módulo eliminado')
    } catch (e) {
      errorFrom('Error al eliminar el módulo', e, 'No se pudo eliminar el módulo.')
      throw e
    }
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
