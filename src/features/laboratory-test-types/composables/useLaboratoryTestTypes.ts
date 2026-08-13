import { storeToRefs } from 'pinia'
import { useLaboratoryTestTypesStore } from '../stores/laboratory-test-types.store'
import { laboratoryTestTypesApi } from '../api/laboratory-test-types.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateLaboratoryTestTypeCommand } from '../types/laboratory-test-types.types'

export interface LaboratoryTestTypeFormData {
  name: string
  description: string
}

export function useLaboratoryTestTypes() {
  const store = useLaboratoryTestTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await laboratoryTestTypesApi.list()
      store.setItems(data.filter((t) => t.general))
    } catch {
      notify('Error al cargar los tipos de laboratorio', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await laboratoryTestTypesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Tipo de laboratorio no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(form: LaboratoryTestTypeFormData) {
    const payload: CreateLaboratoryTestTypeCommand = {
      name: form.name,
      description: form.description,
      companyId: null,
      general: true,
    }
    const { data } = await laboratoryTestTypesApi.create(payload)
    store.setItems([...store.items, data])
    notify('Tipo de laboratorio creado exitosamente', 'success')
    return data
  }

  async function update(id: number, form: LaboratoryTestTypeFormData) {
    const payload: CreateLaboratoryTestTypeCommand = {
      name: form.name,
      description: form.description,
      companyId: null,
      general: true,
    }
    const { data } = await laboratoryTestTypesApi.update(id, payload)
    store.setItems(store.items.map((t) => (t.id === id ? data : t)))
    notify('Tipo de laboratorio actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await laboratoryTestTypesApi.remove(id)
    store.setItems(store.items.filter((t) => t.id !== id))
    notify('Tipo de laboratorio eliminado', 'success')
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
