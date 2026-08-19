import { storeToRefs } from 'pinia'
import { useMembershipSubModulesStore } from '../stores/membership-sub-modules.store'
import { membershipSubModulesApi } from '../api/membership-sub-modules.api'
import { useToast } from '@/composables/useToast'
import type {
  CreateMembershipSubModuleRequest,
  UpdateMembershipSubModuleRequest,
} from '../types/membership-sub-modules.types'

export function useMembershipSubModules() {
  const store = useMembershipSubModulesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await membershipSubModulesApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar las asociaciones membresía-submódulo', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await membershipSubModulesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Asociación no encontrada', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateMembershipSubModuleRequest) {
    try {
      const data = await membershipSubModulesApi.create(payload)
      store.setItems([...store.items, data])
      success('Asociación creada exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear la asociación', e, 'No se pudo crear la asociación.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateMembershipSubModuleRequest) {
    try {
      const data = await membershipSubModulesApi.update(id, payload)
      store.setItems(store.items.map((m) => (m.id === id ? data : m)))
      success('Asociación actualizada')
      return data
    } catch (e) {
      errorFrom('Error al actualizar la asociación', e, 'No se pudo actualizar la asociación.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await membershipSubModulesApi.remove(id)
      store.setItems(store.items.filter((m) => m.id !== id))
      success('Asociación eliminada')
    } catch (e) {
      errorFrom('Error al eliminar la asociación', e, 'No se pudo eliminar la asociación.')
      throw e
    }
  }

  return {
    membershipSubModules: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
