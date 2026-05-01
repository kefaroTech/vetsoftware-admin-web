import { storeToRefs } from 'pinia'
import { useSubmodulesStore } from '../stores/submodules.store'
import { submodulesApi } from '../api/submodules.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateSubmoduleCommand, UpdateSubmoduleCommand } from '../types/submodules.types'

export function useSubmodules() {
  const store = useSubmodulesStore()
  const { submodules, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await submodulesApi.list()
      store.setSubmodules(data)
    } catch {
      notify('Error al cargar los submódulos', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await submodulesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Submódulo no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSubmoduleCommand) {
    const { data } = await submodulesApi.create(payload)
    store.setSubmodules([...store.submodules, data])
    notify('Submódulo creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateSubmoduleCommand) {
    const { data } = await submodulesApi.update(id, payload)
    store.setSubmodules(store.submodules.map((s) => (s.id === id ? data : s)))
    notify('Submódulo actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await submodulesApi.remove(id)
    store.setSubmodules(store.submodules.filter((s) => s.id !== id))
    notify('Submódulo eliminado', 'success')
  }

  return {
    submodules,
    selected,
    loading,
    fetchAll, fetchById, create, update, remove,
  }
}
