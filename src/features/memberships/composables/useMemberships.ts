import { storeToRefs } from 'pinia'
import { useMembershipsStore } from '../stores/memberships.store'
import { membershipsApi } from '../api/memberships.api'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { CreateMembershipRequest, UpdateMembershipRequest } from '../types/memberships.types'

export function useMemberships() {
  const store = useMembershipsStore()
  const { items, selected, loading, error, errorTraceId } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    store.setError(null)
    try {
      const data = await membershipsApi.listAll()
      store.setItems(data)
    } catch (e) {
      // EST-06: el fallo deja rastro en el store para que la tabla pueda
      // pintar su rama de error. El aviso efímero SE MANTIENE en este cambio:
      // retirar la realimentación que ya existía en el mismo PR que se añade
      // la nueva convierte un fallo del arreglo en una pérdida neta.
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar las membresías'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar las membresías', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await membershipsApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Membresía no encontrada', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateMembershipRequest) {
    try {
      const data = await membershipsApi.create(payload)
      store.setItems([...store.items, data])
      success('Membresía creada exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear la membresía', e, 'No se pudo crear la membresía.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateMembershipRequest) {
    try {
      const data = await membershipsApi.update(id, payload)
      store.setItems(store.items.map((m) => (m.id === id ? data : m)))
      success('Membresía actualizada')
      return data
    } catch (e) {
      errorFrom('Error al actualizar la membresía', e, 'No se pudo actualizar la membresía.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await membershipsApi.remove(id)
      store.setItems(store.items.filter((m) => m.id !== id))
      success('Membresía eliminada')
    } catch (e) {
      errorFrom('Error al eliminar la membresía', e, 'No se pudo eliminar la membresía.')
      throw e
    }
  }

  return {
    memberships: items,
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
