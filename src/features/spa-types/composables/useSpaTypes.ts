import { storeToRefs } from 'pinia'
import { useSpaTypesStore } from '../stores/spa-types.store'
import { spaTypesApi } from '../api/spa-types.api'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { CreateSpaTypeRequest, UpdateSpaTypeRequest } from '../types/spa-types.types'

export function useSpaTypes() {
  const store = useSpaTypesStore()
  const { items, selected, loading, error, errorTraceId } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    store.setError(null)
    try {
      const data = await spaTypesApi.listAll()
      store.setItems(data)
    } catch (e) {
      // EST-06: el fallo deja rastro en el store para que la tabla pueda
      // pintar su rama de error. El aviso efímero SE MANTIENE en este cambio:
      // retirar la realimentación que ya existía en el mismo PR que se añade
      // la nueva convierte un fallo del arreglo en una pérdida neta.
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar los tipos de spa'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar los tipos de spa', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await spaTypesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Tipo de spa no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSpaTypeRequest) {
    try {
      const data = await spaTypesApi.create(payload)
      store.setItems([...store.items, data])
      success('Tipo de spa creado exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear el tipo de spa', e, 'No se pudo crear el tipo de spa.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateSpaTypeRequest) {
    try {
      const data = await spaTypesApi.update(id, payload)
      store.setItems(store.items.map((t) => (t.id === id ? data : t)))
      success('Tipo de spa actualizado')
      return data
    } catch (e) {
      errorFrom('Error al actualizar el tipo de spa', e, 'No se pudo actualizar el tipo de spa.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await spaTypesApi.remove(id)
      store.setItems(store.items.filter((t) => t.id !== id))
      success('Tipo de spa eliminado')
    } catch (e) {
      errorFrom('Error al eliminar el tipo de spa', e, 'No se pudo eliminar el tipo de spa.')
      throw e
    }
  }

  return {
    spaTypes: items,
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
