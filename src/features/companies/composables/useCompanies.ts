import { storeToRefs } from 'pinia'
import { useCompaniesStore } from '../stores/companies.store'
import { companiesApi } from '../api/companies.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateCompanyRequest, UpdateCompanyRequest } from '../types/companies.types'

export function useCompanies() {
  const store = useCompaniesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify, notifyError } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const data = await companiesApi.listAll()
      store.setItems(data)
    } catch (e) {
      notifyError('Error al cargar las empresas', e)
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
      notifyError('Empresa no encontrada', e)
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateCompanyRequest) {
    const data = await companiesApi.create(payload)
    store.setItems([...store.items, data])
    notify('Empresa creada exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateCompanyRequest) {
    const data = await companiesApi.update(id, payload)
    store.setItems(store.items.map((c) => (c.id === id ? data : c)))
    notify('Empresa actualizada', 'success')
    return data
  }

  async function remove(id: number) {
    await companiesApi.remove(id)
    store.setItems(store.items.filter((c) => c.id !== id))
    notify('Empresa eliminada', 'success')
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
