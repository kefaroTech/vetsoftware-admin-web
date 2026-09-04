import { storeToRefs } from 'pinia'
import { useVaccinationTypesStore } from '../stores/vaccination-types.store'
import { vaccinationTypesApi } from '../api/vaccination-types.api'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { CreateVaccinationTypeRequest } from '../types/vaccination-types.types'

export interface VaccinationTypeFormData {
  name: string
  description: string
}

export function useVaccinationTypes() {
  const store = useVaccinationTypesStore()
  const { items, selected, loading, error, errorTraceId } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    store.setError(null)
    try {
      const data = await vaccinationTypesApi.listAll()
      store.setItems(data.filter((t) => t.general))
    } catch (e) {
      // EST-06: el fallo deja rastro en el store para que la tabla pueda
      // pintar su rama de error. El aviso efímero SE MANTIENE en este cambio:
      // retirar la realimentación que ya existía en el mismo PR que se añade
      // la nueva convierte un fallo del arreglo en una pérdida neta.
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar los tipos de vacuna'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar los tipos de vacuna', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    store.setError(null)
    store.setSelected(null)
    try {
      const data = await vaccinationTypesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      // Se limpia otra vez aunque ya se limpiara antes del `await`: una carga
      // concurrente pudo dejar OTRO registro en `selected` mientras esta estaba
      // en vuelo, y la ficha lo pintaría como si fuera el de la ruta.
      store.setSelected(null)
      store.setError(
        getProblemDetailMessage(e, 'No se pudo cargar el tipo de vacuna'),
        getTraceId(e) ?? null,
      )
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
    error,
    errorTraceId,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
