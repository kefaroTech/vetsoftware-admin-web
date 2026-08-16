import { storeToRefs } from 'pinia'
import { useDiagnosticImagingTypesStore } from '../stores/diagnostic-imaging-types.store'
import { diagnosticImagingTypesApi } from '../api/diagnostic-imaging-types.api'
import { useToast } from '@/composables/useToast'
import type { CreateDiagnosticImagingTypeRequest } from '../types/diagnostic-imaging-types.types'

export interface DiagnosticImagingTypeFormData {
  name: string
  description: string
}

export function useDiagnosticImagingTypes() {
  const store = useDiagnosticImagingTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await diagnosticImagingTypesApi.listAll()
      store.setItems(data.filter((t) => t.general))
    } catch (e) {
      errorFrom('Error al cargar los tipos de imagen diagnóstica', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await diagnosticImagingTypesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Tipo de imagen diagnóstica no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(form: DiagnosticImagingTypeFormData) {
    const payload: CreateDiagnosticImagingTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    const data = await diagnosticImagingTypesApi.create(payload)
    store.setItems([...store.items, data])
    success('Tipo de imagen diagnóstica creado exitosamente')
    return data
  }

  async function update(id: number, form: DiagnosticImagingTypeFormData) {
    const payload: CreateDiagnosticImagingTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    const data = await diagnosticImagingTypesApi.update(id, payload)
    store.setItems(store.items.map((t) => (t.id === id ? data : t)))
    success('Tipo de imagen diagnóstica actualizado')
    return data
  }

  async function remove(id: number) {
    await diagnosticImagingTypesApi.remove(id)
    store.setItems(store.items.filter((t) => t.id !== id))
    success('Tipo de imagen diagnóstica eliminado')
  }

  return {
    diagnosticImagingTypes: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
