import { storeToRefs } from 'pinia'
import { useCompaniesStore } from '../stores/companies.store'
import { companiesApi } from '../api/companies.api'
import { useToast } from '@/composables/useToast'
import type { CreateCompanyRequest, UpdateCompanyRequest } from '../types/companies.types'

export function useCompanies() {
  const store = useCompaniesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await companiesApi.listAll()
      store.setItems(data)
    } catch (e) {
      errorFrom('Error al cargar las empresas', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const data = await companiesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Empresa no encontrada', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateCompanyRequest) {
    try {
      const data = await companiesApi.create(payload)
      store.setItems([...store.items, data])
      success('Empresa creada exitosamente')
      return data
    } catch (e) {
      errorFrom('Error al crear la empresa', e, 'No se pudo crear la empresa.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateCompanyRequest) {
    try {
      const data = await companiesApi.update(id, payload)
      store.setItems(store.items.map((c) => (c.id === id ? data : c)))
      success('Empresa actualizada')
      return data
    } catch (e) {
      errorFrom('Error al actualizar la empresa', e, 'No se pudo actualizar la empresa.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await companiesApi.remove(id)
      store.setItems(store.items.filter((c) => c.id !== id))
      success('Empresa eliminada')
    } catch (e) {
      errorFrom('Error al eliminar la empresa', e, 'No se pudo eliminar la empresa.')
      throw e
    }
  }

  return {
    companies: items,
    selected,
    loading,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
  }
}
