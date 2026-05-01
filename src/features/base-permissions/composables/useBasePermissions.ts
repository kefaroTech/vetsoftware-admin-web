import { storeToRefs } from 'pinia'
import { useBasePermissionsStore } from '../stores/base-permissions.store'
import { basePermissionsApi } from '../api/base-permissions.api'
import { useNotification } from '@/composables/useNotification'
import type {
  CreateBasePermissionCommand,
  UpdateBasePermissionCommand,
} from '../types/base-permissions.types'

export function useBasePermissions() {
  const store = useBasePermissionsStore()
  const { permissions, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await basePermissionsApi.list()
      store.setPermissions(data)
    } catch {
      notify('Error al cargar los permisos base', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await basePermissionsApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Permiso base no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBasePermissionCommand) {
    const { data } = await basePermissionsApi.create(payload)
    store.setPermissions([...store.permissions, data])
    notify('Permiso base creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateBasePermissionCommand) {
    const { data } = await basePermissionsApi.update(id, payload)
    store.setPermissions(store.permissions.map((p) => (p.id === id ? data : p)))
    notify('Permiso base actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await basePermissionsApi.remove(id)
    store.setPermissions(store.permissions.filter((p) => p.id !== id))
    notify('Permiso base eliminado', 'success')
  }

  return {
    permissions,
    selected,
    loading,
    fetchAll, fetchById, create, update, remove,
  }
}
