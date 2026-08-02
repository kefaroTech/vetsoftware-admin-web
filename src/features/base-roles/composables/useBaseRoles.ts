import { storeToRefs } from 'pinia'
import { useBaseRolesStore } from '../stores/base-roles.store'
import { baseRolesApi } from '../api/base-roles.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateBaseRoleCommand, UpdateBaseRoleCommand } from '../types/base-roles.types'

export function useBaseRoles() {
  const store = useBaseRolesStore()
  const { baseRoles, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await baseRolesApi.list()
      store.setBaseRoles(data)
    } catch {
      notify('Error al cargar los roles base', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await baseRolesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Rol base no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBaseRoleCommand) {
    const { data } = await baseRolesApi.create(payload)
    store.setBaseRoles([...store.baseRoles, data])
    notify('Rol base creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateBaseRoleCommand) {
    const { data } = await baseRolesApi.update(id, payload)
    store.setBaseRoles(store.baseRoles.map((r) => (r.id === id ? data : r)))
    notify('Rol base actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await baseRolesApi.remove(id)
    store.setBaseRoles(store.baseRoles.filter((r) => r.id !== id))
    notify('Rol base eliminado', 'success')
  }

  return {
    baseRoles,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
