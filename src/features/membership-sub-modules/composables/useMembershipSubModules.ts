import { storeToRefs } from 'pinia'
import { useMembershipSubModulesStore } from '../stores/membership-sub-modules.store'
import { membershipSubModulesApi } from '../api/membership-sub-modules.api'
import { useNotification } from '@/composables/useNotification'
import type {
  CreateMembershipSubModuleCommand,
  UpdateMembershipSubModuleCommand,
} from '../types/membership-sub-modules.types'

export function useMembershipSubModules() {
  const store = useMembershipSubModulesStore()
  const { membershipSubModules, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await membershipSubModulesApi.list()
      store.setMembershipSubModules(data)
    } catch {
      notify('Error al cargar las asociaciones membresía-submódulo', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await membershipSubModulesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Asociación no encontrada', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateMembershipSubModuleCommand) {
    const { data } = await membershipSubModulesApi.create(payload)
    store.setMembershipSubModules([...store.membershipSubModules, data])
    notify('Asociación creada exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateMembershipSubModuleCommand) {
    const { data } = await membershipSubModulesApi.update(id, payload)
    store.setMembershipSubModules(store.membershipSubModules.map((m) => (m.id === id ? data : m)))
    notify('Asociación actualizada', 'success')
    return data
  }

  async function remove(id: number) {
    await membershipSubModulesApi.remove(id)
    store.setMembershipSubModules(store.membershipSubModules.filter((m) => m.id !== id))
    notify('Asociación eliminada', 'success')
  }

  return {
    membershipSubModules,
    selected,
    loading,
    fetchAll, fetchById, create, update, remove,
  }
}
