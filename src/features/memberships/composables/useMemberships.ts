import { storeToRefs } from 'pinia'
import { useMembershipsStore } from '../stores/memberships.store'
import { membershipsApi } from '../api/memberships.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateMembershipCommand, UpdateMembershipCommand } from '../types/memberships.types'

export function useMemberships() {
  const store = useMembershipsStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await membershipsApi.list()
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar las membresías', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await membershipsApi.getById(id)
      store.setSelected(data)
    } catch (e) {
      notifyError('Membresía no encontrada', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateMembershipCommand) {
    const { data } = await membershipsApi.create(payload)
    store.setItems([...store.items, data])
    notify('Membresía creada exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateMembershipCommand) {
    const { data } = await membershipsApi.update(id, payload)
    store.setItems(store.items.map((m) => (m.id === id ? data : m)))
    notify('Membresía actualizada', 'success')
    return data
  }

  async function remove(id: number) {
    await membershipsApi.remove(id)
    store.setItems(store.items.filter((m) => m.id !== id))
    notify('Membresía eliminada', 'success')
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
