import { storeToRefs } from 'pinia'
import { useVaccinationTypesStore } from '../stores/vaccination-types.store'
import { vaccinationTypesApi } from '../api/vaccination-types.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateVaccinationTypeCommand } from '../types/vaccination-types.types'

export interface VaccinationTypeFormData {
  name: string
  description: string
}

export function useVaccinationTypes() {
  const store = useVaccinationTypesStore()
  const { vaccinationTypes, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await vaccinationTypesApi.list()
      store.setVaccinationTypes(data.filter((t) => t.general))
    } catch {
      notify('Error al cargar los tipos de vacuna', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await vaccinationTypesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Tipo de vacuna no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(form: VaccinationTypeFormData) {
    const payload: CreateVaccinationTypeCommand = {
      name: form.name,
      description: form.description,
      companyId: null,
      general: true,
    }
    const { data } = await vaccinationTypesApi.create(payload)
    store.setVaccinationTypes([...store.vaccinationTypes, data])
    notify('Tipo de vacuna creado exitosamente', 'success')
    return data
  }

  async function update(id: number, form: VaccinationTypeFormData) {
    const payload: CreateVaccinationTypeCommand = {
      name: form.name,
      description: form.description,
      companyId: null,
      general: true,
    }
    const { data } = await vaccinationTypesApi.update(id, payload)
    store.setVaccinationTypes(
      store.vaccinationTypes.map((t) => (t.id === id ? data : t)),
    )
    notify('Tipo de vacuna actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await vaccinationTypesApi.remove(id)
    store.setVaccinationTypes(store.vaccinationTypes.filter((t) => t.id !== id))
    notify('Tipo de vacuna eliminado', 'success')
  }

  return {
    vaccinationTypes,
    selected,
    loading,
    fetchAll, fetchById, create, update, remove,
  }
}
