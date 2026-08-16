import { storeToRefs } from 'pinia'
import { useSurgeryTypesStore } from '../stores/surgery-types.store'
import { surgeryTypesApi } from '../api/surgery-types.api'
import { useToast } from '@/composables/useToast'
import type { CreateSurgeryTypeRequest } from '../types/surgery-types.types'

export interface SurgeryTypeFormData {
  name: string
  description: string
}

export function useSurgeryTypes() {
  const store = useSurgeryTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await surgeryTypesApi.listAll()
      store.setItems(data.filter((t) => t.general))
    } catch (e) {
      errorFrom('Error al cargar los tipos de cirugía', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await surgeryTypesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Tipo de cirugía no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(form: SurgeryTypeFormData) {
    const payload: CreateSurgeryTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    const data = await surgeryTypesApi.create(payload)
    store.setItems([...store.items, data])
    success('Tipo de cirugía creado exitosamente')
    return data
  }

  async function update(id: number, form: SurgeryTypeFormData) {
    const payload: CreateSurgeryTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    const data = await surgeryTypesApi.update(id, payload)
    store.setItems(store.items.map((t) => (t.id === id ? data : t)))
    success('Tipo de cirugía actualizado')
    return data
  }

  async function remove(id: number) {
    await surgeryTypesApi.remove(id)
    store.setItems(store.items.filter((t) => t.id !== id))
    success('Tipo de cirugía eliminado')
  }

  return {
    surgeryTypes: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
