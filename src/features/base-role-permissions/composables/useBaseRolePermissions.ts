import { storeToRefs } from 'pinia'
import { useBaseRolePermissionsStore } from '../stores/base-role-permissions.store'
import { baseRolePermissionsApi } from '../api/base-role-permissions.api'
import { useNotification } from '@/composables/useNotification'
import type {
  CreateBaseRolePermissionRequest,
  UpdateBaseRolePermissionRequest,
} from '../types/base-role-permissions.types'

export function useBaseRolePermissions() {
  const store = useBaseRolePermissionsStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await baseRolePermissionsApi.listAll()
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar los permisos de roles base', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await baseRolePermissionsApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      notifyError('Permiso de rol base no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBaseRolePermissionRequest) {
    const data = await baseRolePermissionsApi.create(payload)
    store.setItems([...store.items, data])
    notify('Permiso de rol base creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateBaseRolePermissionRequest) {
    const data = await baseRolePermissionsApi.update(id, payload)
    store.setItems(store.items.map((p) => (p.id === id ? data : p)))
    notify('Permiso de rol base actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await baseRolePermissionsApi.remove(id)
    store.setItems(store.items.filter((p) => p.id !== id))
    notify('Permiso de rol base eliminado', 'success')
  }

  return {
    baseRolePermissions: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
