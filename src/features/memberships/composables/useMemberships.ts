import { useMembershipsStore } from '../stores/memberships.store'
import { membershipsApi } from '../api/memberships.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateMembershipCommand, UpdateMembershipCommand } from '../types/memberships.types'

export function useMemberships() {
  const store = useMembershipsStore()
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await membershipsApi.list()
      store.setMemberships(data)
    } catch {
      notify('Error al cargar las membresías', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await membershipsApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Membresía no encontrada', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateMembershipCommand) {
    const { data } = await membershipsApi.create(payload)
    store.setMemberships([...store.memberships, data])
    notify('Membresía creada exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateMembershipCommand) {
    const { data } = await membershipsApi.update(id, payload)
    store.setMemberships(store.memberships.map((m) => (m.id === id ? data : m)))
    notify('Membresía actualizada', 'success')
    return data
  }

  async function remove(id: number) {
    await membershipsApi.remove(id)
    store.setMemberships(store.memberships.filter((m) => m.id !== id))
    notify('Membresía eliminada', 'success')
  }

  return {
    memberships: store.memberships,
    selected: store.selected,
    loading: store.loading,
    fetchAll, fetchById, create, update, remove,
  }
}
