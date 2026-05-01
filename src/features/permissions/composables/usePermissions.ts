import { storeToRefs } from 'pinia'
import { usePermissionsStore } from '../stores/permissions.store'
import { permissionsApi } from '../api/permissions.api'
import { useNotification } from '@/composables/useNotification'
import type { CreatePermissionCommand, UpdatePermissionCommand } from '../types/permissions.types'

export function usePermissions() {
  const store = usePermissionsStore()
  const { permissions, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await permissionsApi.list()
      store.setPermissions(data)
    } catch {
      notify('Error al cargar los permisos', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await permissionsApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Permiso no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreatePermissionCommand) {
    const { data } = await permissionsApi.create(payload)
    store.setPermissions([...store.permissions, data])
    notify('Permiso creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdatePermissionCommand) {
    const { data } = await permissionsApi.update(id, payload)
    store.setPermissions(store.permissions.map((p) => (p.id === id ? data : p)))
    notify('Permiso actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await permissionsApi.remove(id)
    store.setPermissions(store.permissions.filter((p) => p.id !== id))
    notify('Permiso eliminado', 'success')
  }

  return {
    permissions,
    selected,
    loading,
    fetchAll, fetchById, create, update, remove,
  }
}
