import { storeToRefs } from 'pinia'
import { useBasePermissionsStore } from '../stores/base-permissions.store'
import { basePermissionsApi } from '../api/base-permissions.api'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type {
  CreateBasePermissionRequest,
  UpdateBasePermissionRequest,
} from '../types/base-permissions.types'

export function useBasePermissions() {
  const store = useBasePermissionsStore()
  const { items, selected, loading, error, errorTraceId } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    store.setError(null)
    try {
      const data = await basePermissionsApi.listAll()
      store.setItems(data)
    } catch (e) {
      // EST-06: el fallo deja rastro en el store para que la tabla pueda
      // pintar su rama de error. El aviso efímero SE MANTIENE en este cambio:
      // retirar la realimentación que ya existía en el mismo PR que se añade
      // la nueva convierte un fallo del arreglo en una pérdida neta.
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar los permisos base'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar los permisos base', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await basePermissionsApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Permiso base no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBasePermissionRequest) {
    try {
      const data = await basePermissionsApi.create(payload)
      store.setItems([...store.items, data])
      success('Permiso base creado exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear el permiso base', e, 'No se pudo crear el permiso base.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateBasePermissionRequest) {
    try {
      const data = await basePermissionsApi.update(id, payload)
      store.setItems(store.items.map((p) => (p.id === id ? data : p)))
      success('Permiso base actualizado')
      return data
    } catch (e) {
      errorFrom('Error al actualizar el permiso base', e, 'No se pudo actualizar el permiso base.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await basePermissionsApi.remove(id)
      store.setItems(store.items.filter((p) => p.id !== id))
      success('Permiso base eliminado')
    } catch (e) {
      errorFrom('Error al eliminar el permiso base', e, 'No se pudo eliminar el permiso base.')
      throw e
    }
  }

  return {
    permissions: items,
    selected,
    loading,
    error,
    errorTraceId,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
