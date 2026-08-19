import { storeToRefs } from 'pinia'
import { useBaseRolePermissionsStore } from '../stores/base-role-permissions.store'
import { baseRolePermissionsApi } from '../api/base-role-permissions.api'
import { useToast } from '@/composables/useToast'
import type {
  CreateBaseRolePermissionRequest,
  UpdateBaseRolePermissionRequest,
} from '../types/base-role-permissions.types'

export function useBaseRolePermissions() {
  const store = useBaseRolePermissionsStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await baseRolePermissionsApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar los permisos de roles base', e)
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
      errorFrom('Permiso de rol base no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBaseRolePermissionRequest) {
    try {
      const data = await baseRolePermissionsApi.create(payload)
      store.setItems([...store.items, data])
      success('Permiso de rol base creado exitosamente')
      return data
    } catch (e) {
      errorFrom(
        'Error al crear el permiso de rol base',
        e,
        'No se pudo crear el permiso de rol base.',
      )
      throw e
    }
  }

  async function update(id: number, payload: UpdateBaseRolePermissionRequest) {
    try {
      const data = await baseRolePermissionsApi.update(id, payload)
      store.setItems(store.items.map((p) => (p.id === id ? data : p)))
      success('Permiso de rol base actualizado')
      return data
    } catch (e) {
      errorFrom(
        'Error al actualizar el permiso de rol base',
        e,
        'No se pudo actualizar el permiso de rol base.',
      )
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await baseRolePermissionsApi.remove(id)
      store.setItems(store.items.filter((p) => p.id !== id))
      success('Permiso de rol base eliminado')
    } catch (e) {
      errorFrom(
        'Error al eliminar el permiso de rol base',
        e,
        'No se pudo eliminar el permiso de rol base.',
      )
      throw e
    }
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
