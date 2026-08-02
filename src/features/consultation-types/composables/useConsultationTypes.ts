import { storeToRefs } from 'pinia'
import { useConsultationTypesStore } from '../stores/consultation-types.store'
import { consultationTypesApi } from '../api/consultation-types.api'
import { useNotification } from '@/composables/useNotification'
import type {
  CreateConsultationTypeCommand,
  UpdateConsultationTypeCommand,
} from '../types/consultation-types.types'

export function useConsultationTypes() {
  const store = useConsultationTypesStore()
  const { consultationTypes, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await consultationTypesApi.list()
      store.setConsultationTypes(data)
    } catch {
      notify('Error al cargar los tipos de consulta', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await consultationTypesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Tipo de consulta no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateConsultationTypeCommand) {
    const { data } = await consultationTypesApi.create(payload)
    store.setConsultationTypes([...store.consultationTypes, data])
    notify('Tipo de consulta creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateConsultationTypeCommand) {
    const { data } = await consultationTypesApi.update(id, payload)
    store.setConsultationTypes(store.consultationTypes.map((t) => (t.id === id ? data : t)))
    notify('Tipo de consulta actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await consultationTypesApi.remove(id)
    store.setConsultationTypes(store.consultationTypes.filter((t) => t.id !== id))
    notify('Tipo de consulta eliminado', 'success')
  }

  return {
    consultationTypes,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
