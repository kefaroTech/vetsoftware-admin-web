import { storeToRefs } from 'pinia'
import { useMembershipsStore } from '../stores/memberships.store'
import { membershipsApi } from '../api/memberships.api'
import { useToast } from '@/composables/useToast'
import type { CreateMembershipRequest, UpdateMembershipRequest } from '../types/memberships.types'

export function useMemberships() {
  const store = useMembershipsStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await membershipsApi.listAll()
      store.setItems(data)
    } catch (e) {
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
    const data = await membershipsApi.create(payload)
    store.setItems([...store.items, data])
    success('Membresía creada exitosamente')
    return data
  }

  async function update(id: number, payload: UpdateMembershipRequest) {
    const data = await membershipsApi.update(id, payload)
    store.setItems(store.items.map((m) => (m.id === id ? data : m)))
    success('Membresía actualizada')
    return data
  }

  async function remove(id: number) {
    await membershipsApi.remove(id)
    store.setItems(store.items.filter((m) => m.id !== id))
    success('Membresía eliminada')
  }

  return {
    memberships: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
