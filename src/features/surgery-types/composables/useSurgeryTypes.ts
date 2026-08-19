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
    try {
      const data = await surgeryTypesApi.create(payload)
      store.setItems([...store.items, data])
      success('Tipo de cirugía creado exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear el tipo de cirugía', e, 'No se pudo crear el tipo de cirugía.')
      throw e
    }
  }

  async function update(id: number, form: SurgeryTypeFormData) {
    const payload: CreateSurgeryTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    try {
      const data = await surgeryTypesApi.update(id, payload)
      store.setItems(store.items.map((t) => (t.id === id ? data : t)))
      success('Tipo de cirugía actualizado')
      return data
    } catch (e) {
      errorFrom(
        'Error al actualizar el tipo de cirugía',
        e,
        'No se pudo actualizar el tipo de cirugía.',
      )
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await surgeryTypesApi.remove(id)
      store.setItems(store.items.filter((t) => t.id !== id))
      success('Tipo de cirugía eliminado')
    } catch (e) {
      errorFrom(
        'Error al eliminar el tipo de cirugía',
        e,
        'No se pudo eliminar el tipo de cirugía.',
      )
      throw e
    }
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
