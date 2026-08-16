import { storeToRefs } from 'pinia'
import { useBaseRolesStore } from '../stores/base-roles.store'
import { baseRolesApi } from '../api/base-roles.api'
import { useToast } from '@/composables/useToast'
import type { CreateBaseRoleRequest, UpdateBaseRoleRequest } from '../types/base-roles.types'

export function useBaseRoles() {
  const store = useBaseRolesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await baseRolesApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar los roles base', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await baseRolesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Rol base no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBaseRoleRequest) {
    const data = await baseRolesApi.create(payload)
    store.setItems([...store.items, data])
    success('Rol base creado exitosamente')
    return data
  }

  async function update(id: number, payload: UpdateBaseRoleRequest) {
    const data = await baseRolesApi.update(id, payload)
    store.setItems(store.items.map((r) => (r.id === id ? data : r)))
    success('Rol base actualizado')
    return data
  }

  async function remove(id: number) {
    await baseRolesApi.remove(id)
    store.setItems(store.items.filter((r) => r.id !== id))
    success('Rol base eliminado')
  }

  return {
    baseRoles: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
