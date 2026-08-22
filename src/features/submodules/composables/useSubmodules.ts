import { storeToRefs } from 'pinia'
import { useSubmodulesStore } from '../stores/submodules.store'
import { submodulesApi } from '../api/submodules.api'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { CreateSubModuleRequest, UpdateSubModuleRequest } from '../types/submodules.types'

export function useSubmodules() {
  const store = useSubmodulesStore()
  const { items, selected, loading, error, errorTraceId } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    store.setError(null)
    try {
      const data = await submodulesApi.listAll()
      store.setItems(data)
    } catch (e) {
      // EST-06: el fallo deja rastro en el store para que la tabla pueda
      // pintar su rama de error. El aviso efímero SE MANTIENE en este cambio:
      // retirar la realimentación que ya existía en el mismo PR que se añade
      // la nueva convierte un fallo del arreglo en una pérdida neta.
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar los submódulos'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar los submódulos', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await submodulesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Submódulo no encontrado', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateSubModuleRequest) {
    try {
      const data = await submodulesApi.create(payload)
      store.setItems([...store.items, data])
      success('Submódulo creado exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear el submódulo', e, 'No se pudo crear el submódulo.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateSubModuleRequest) {
    try {
      const data = await submodulesApi.update(id, payload)
      store.setItems(store.items.map((s) => (s.id === id ? data : s)))
      success('Submódulo actualizado')
      return data
    } catch (e) {
      errorFrom('Error al actualizar el submódulo', e, 'No se pudo actualizar el submódulo.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await submodulesApi.remove(id)
      store.setItems(store.items.filter((s) => s.id !== id))
      success('Submódulo eliminado')
    } catch (e) {
      errorFrom('Error al eliminar el submódulo', e, 'No se pudo eliminar el submódulo.')
      throw e
    }
  }

  return {
    submodules: items,
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
