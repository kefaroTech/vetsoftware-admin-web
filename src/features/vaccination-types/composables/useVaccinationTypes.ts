import { storeToRefs } from 'pinia'
import { useVaccinationTypesStore } from '../stores/vaccination-types.store'
import { vaccinationTypesApi } from '../api/vaccination-types.api'
import { useToast } from '@/composables/useToast'
import type { CreateVaccinationTypeRequest } from '../types/vaccination-types.types'

export interface VaccinationTypeFormData {
  name: string
  description: string
}

export function useVaccinationTypes() {
  const store = useVaccinationTypesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await vaccinationTypesApi.listAll()
      store.setItems(data.filter((t) => t.general))
    } catch (e) {
      errorFrom('Error al cargar los tipos de vacuna', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await vaccinationTypesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Tipo de vacuna no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(form: VaccinationTypeFormData) {
    const payload: CreateVaccinationTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    try {
      const data = await vaccinationTypesApi.create(payload)
      store.setItems([...store.items, data])
      success('Tipo de vacuna creado exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear el tipo de vacuna', e, 'No se pudo crear el tipo de vacuna.')
      throw e
    }
  }

  async function update(id: number, form: VaccinationTypeFormData) {
    const payload: CreateVaccinationTypeRequest = {
      name: form.name,
      description: form.description,
      general: true,
    }
    try {
      const data = await vaccinationTypesApi.update(id, payload)
      store.setItems(store.items.map((t) => (t.id === id ? data : t)))
      success('Tipo de vacuna actualizado')
      return data
    } catch (e) {
      errorFrom(
        'Error al actualizar el tipo de vacuna',
        e,
        'No se pudo actualizar el tipo de vacuna.',
      )
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await vaccinationTypesApi.remove(id)
      store.setItems(store.items.filter((t) => t.id !== id))
      success('Tipo de vacuna eliminado')
    } catch (e) {
      errorFrom('Error al eliminar el tipo de vacuna', e, 'No se pudo eliminar el tipo de vacuna.')
      throw e
    }
  }

  return {
    vaccinationTypes: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
