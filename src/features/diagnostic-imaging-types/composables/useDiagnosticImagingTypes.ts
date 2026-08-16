import { storeToRefs } from 'pinia'
import { useDiagnosticImagingTypesStore } from '../stores/diagnostic-imaging-types.store'
import { diagnosticImagingTypesApi } from '../api/diagnostic-imaging-types.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateDiagnosticImagingTypeRequest } from '../types/diagnostic-imaging-types.types'

export interface DiagnosticImagingTypeFormData {
  name: string
  description: string
}

export function useDiagnosticImagingTypes() {
  const store = useDiagnosticImagingTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await diagnosticImagingTypesApi.listAll()
      store.setItems(data.filter((t) => t.general))
    } catch (e) {
      notifyError('Error al cargar los tipos de imagen diagnóstica', e)
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
      notifyError('Tipo de imagen diagnóstica no encontrado', e)
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
    notify('Tipo de imagen diagnóstica creado exitosamente', 'success')
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
    notify('Tipo de imagen diagnóstica actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await diagnosticImagingTypesApi.remove(id)
    store.setItems(store.items.filter((t) => t.id !== id))
    notify('Tipo de imagen diagnóstica eliminado', 'success')
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
