import { storeToRefs } from 'pinia'
import { useConsultationTypesStore } from '../stores/consultation-types.store'
import { consultationTypesApi } from '../api/consultation-types.api'
import { useToast } from '@/composables/useToast'
import type {
  CreateConsultationTypeRequest,
  UpdateConsultationTypeRequest,
} from '../types/consultation-types.types'

export function useConsultationTypes() {
  const store = useConsultationTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await consultationTypesApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar los tipos de consulta', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await consultationTypesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Tipo de consulta no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateConsultationTypeRequest) {
    try {
      const data = await consultationTypesApi.create(payload)
      store.setItems([...store.items, data])
      success('Tipo de consulta creado exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear el tipo de consulta', e, 'No se pudo crear el tipo de consulta.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateConsultationTypeRequest) {
    try {
      const data = await consultationTypesApi.update(id, payload)
      store.setItems(store.items.map((t) => (t.id === id ? data : t)))
      success('Tipo de consulta actualizado')
      return data
    } catch (e) {
      errorFrom(
        'Error al actualizar el tipo de consulta',
        e,
        'No se pudo actualizar el tipo de consulta.',
      )
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await consultationTypesApi.remove(id)
      store.setItems(store.items.filter((t) => t.id !== id))
      success('Tipo de consulta eliminado')
    } catch (e) {
      errorFrom(
        'Error al eliminar el tipo de consulta',
        e,
        'No se pudo eliminar el tipo de consulta.',
      )
      throw e
    }
  }

  return {
    consultationTypes: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
