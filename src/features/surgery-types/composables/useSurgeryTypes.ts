import { storeToRefs } from 'pinia'
import { useSurgeryTypesStore } from '../stores/surgery-types.store'
import { surgeryTypesApi } from '../api/surgery-types.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateSurgeryTypeCommand } from '../types/surgery-types.types'

export interface SurgeryTypeFormData {
  name: string
  description: string
}

export function useSurgeryTypes() {
  const store = useSurgeryTypesStore()
  const { surgeryTypes, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await surgeryTypesApi.list()
      store.setSurgeryTypes(data.filter((t) => t.general))
    } catch {
      notify('Error al cargar los tipos de cirugía', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await surgeryTypesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Tipo de cirugía no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(form: SurgeryTypeFormData) {
    const payload: CreateSurgeryTypeCommand = {
      name: form.name,
      description: form.description,
      companyId: null,
      general: true,
    }
    const { data } = await surgeryTypesApi.create(payload)
    store.setSurgeryTypes([...store.surgeryTypes, data])
    notify('Tipo de cirugía creado exitosamente', 'success')
    return data
  }

  async function update(id: number, form: SurgeryTypeFormData) {
    const payload: CreateSurgeryTypeCommand = {
      name: form.name,
      description: form.description,
      companyId: null,
      general: true,
    }
    const { data } = await surgeryTypesApi.update(id, payload)
    store.setSurgeryTypes(
      store.surgeryTypes.map((t) => (t.id === id ? data : t)),
    )
    notify('Tipo de cirugía actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await surgeryTypesApi.remove(id)
    store.setSurgeryTypes(store.surgeryTypes.filter((t) => t.id !== id))
    notify('Tipo de cirugía eliminado', 'success')
  }

  return {
    surgeryTypes,
    selected,
    loading,
    fetchAll, fetchById, create, update, remove,
  }
}
