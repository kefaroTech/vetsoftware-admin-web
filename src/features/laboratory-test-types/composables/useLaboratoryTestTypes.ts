import { storeToRefs } from 'pinia'
import { useLaboratoryTestTypesStore } from '../stores/laboratory-test-types.store'
import { laboratoryTestTypesApi } from '../api/laboratory-test-types.api'
import { useToast } from '@/composables/useToast'
import type { CreateLaboratoryTestTypeRequest } from '../types/laboratory-test-types.types'

export interface LaboratoryTestTypeFormData {
  name: string
  description: string
}

export function useLaboratoryTestTypes() {
  const store = useLaboratoryTestTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await laboratoryTestTypesApi.listAll()
      store.setItems(data.filter((t) => t.general))
    } catch (e) {
      errorFrom('Error al cargar los tipos de laboratorio', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await laboratoryTestTypesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Tipo de laboratorio no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(form: LaboratoryTestTypeFormData) {
    const payload: CreateLaboratoryTestTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    const data = await laboratoryTestTypesApi.create(payload)
    store.setItems([...store.items, data])
    success('Tipo de laboratorio creado exitosamente')
    return data
  }

  async function update(id: number, form: LaboratoryTestTypeFormData) {
    const payload: CreateLaboratoryTestTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    const data = await laboratoryTestTypesApi.update(id, payload)
    store.setItems(store.items.map((t) => (t.id === id ? data : t)))
    success('Tipo de laboratorio actualizado')
    return data
  }

  async function remove(id: number) {
    await laboratoryTestTypesApi.remove(id)
    store.setItems(store.items.filter((t) => t.id !== id))
    success('Tipo de laboratorio eliminado')
  }

  return {
    laboratoryTestTypes: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
