import { storeToRefs } from 'pinia'
import { useDiagnosticImagingTypesStore } from '../stores/diagnostic-imaging-types.store'
import { diagnosticImagingTypesApi } from '../api/diagnostic-imaging-types.api'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { CreateDiagnosticImagingTypeRequest } from '../types/diagnostic-imaging-types.types'

export interface DiagnosticImagingTypeFormData {
  name: string
  description: string
}

export function useDiagnosticImagingTypes() {
  const store = useDiagnosticImagingTypesStore()
  const { items, selected, loading, error, errorTraceId } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    store.setError(null)
    try {
      const data = await diagnosticImagingTypesApi.listAll()
      store.setItems(data.filter((t) => t.general))
    } catch (e) {
      // EST-06: el fallo deja rastro en el store para que la tabla pueda
      // pintar su rama de error. El aviso efímero SE MANTIENE en este cambio:
      // retirar la realimentación que ya existía en el mismo PR que se añade
      // la nueva convierte un fallo del arreglo en una pérdida neta.
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar los tipos de imagen diagnóstica'),
        getTraceId(e) ?? null,
      )
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
    try {
      const data = await diagnosticImagingTypesApi.create(payload)
      store.setItems([...store.items, data])
      success('Tipo de imagen diagnóstica creado exitosamente')
      return data
    } catch (e) {
      errorFrom(
        'Error al crear el tipo de imagen diagnóstica',
        e,
        'No se pudo crear el tipo de imagen diagnóstica.',
      )
      throw e
    }
  }

  async function update(id: number, form: DiagnosticImagingTypeFormData) {
    const payload: CreateDiagnosticImagingTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    try {
      const data = await diagnosticImagingTypesApi.update(id, payload)
      store.setItems(store.items.map((t) => (t.id === id ? data : t)))
      success('Tipo de imagen diagnóstica actualizado')
      return data
    } catch (e) {
      errorFrom(
        'Error al actualizar el tipo de imagen diagnóstica',
        e,
        'No se pudo actualizar el tipo de imagen diagnóstica.',
      )
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await diagnosticImagingTypesApi.remove(id)
      store.setItems(store.items.filter((t) => t.id !== id))
      success('Tipo de imagen diagnóstica eliminado')
    } catch (e) {
      errorFrom(
        'Error al eliminar el tipo de imagen diagnóstica',
        e,
        'No se pudo eliminar el tipo de imagen diagnóstica.',
      )
      throw e
    }
  }

  return {
    diagnosticImagingTypes: items,
    selected,
    loading,
    error,
    errorTraceId,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
