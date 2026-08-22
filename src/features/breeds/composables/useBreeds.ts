import { storeToRefs } from 'pinia'
import { useBreedsStore } from '../stores/breeds.store'
import { breedsApi } from '../api/breeds.api'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { CreateBreedRequest, UpdateBreedRequest } from '../types/breeds.types'

export function useBreeds() {
  const store = useBreedsStore()
  const { items, selected, loading, error, errorTraceId } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    store.setError(null)
    try {
      const data = await breedsApi.listAll()
      store.setItems(data)
    } catch (e) {
      // EST-06: el fallo deja rastro en el store para que la tabla pueda
      // pintar su rama de error. El aviso efímero SE MANTIENE en este cambio:
      // retirar la realimentación que ya existía en el mismo PR que se añade
      // la nueva convierte un fallo del arreglo en una pérdida neta.
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar las razas'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar las razas', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await breedsApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Raza no encontrada', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateBreedRequest) {
    try {
      const data = await breedsApi.create(payload)
      store.setItems([...store.items, data])
      success('Raza creada exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear la raza', e, 'No se pudo crear la raza.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateBreedRequest) {
    try {
      const data = await breedsApi.update(id, payload)
      store.setItems(store.items.map((b) => (b.id === id ? data : b)))
      success('Raza actualizada')
      return data
    } catch (e) {
      errorFrom('Error al actualizar la raza', e, 'No se pudo actualizar la raza.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await breedsApi.remove(id)
      store.setItems(store.items.filter((b) => b.id !== id))
      success('Raza eliminada')
    } catch (e) {
      errorFrom('Error al eliminar la raza', e, 'No se pudo eliminar la raza.')
      throw e
    }
  }

  return {
    breeds: items,
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
