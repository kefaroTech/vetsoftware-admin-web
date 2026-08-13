import { storeToRefs } from 'pinia'
import { useCompaniesStore } from '../stores/companies.store'
import { companiesApi } from '../api/companies.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateCompanyCommand, UpdateCompanyCommand } from '../types/companies.types'

export function useCompanies() {
  const store = useCompaniesStore()
  const { items, selected, loading } = storeToRefs(store)
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await companiesApi.list()
      store.setItems(data)
    } catch {
      notify('Error al cargar las empresas', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await companiesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Empresa no encontrada', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateCompanyCommand) {
    const { data } = await companiesApi.create(payload)
    store.setItems([...store.items, data])
    notify('Empresa creada exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateCompanyCommand) {
    const { data } = await companiesApi.update(id, payload)
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
