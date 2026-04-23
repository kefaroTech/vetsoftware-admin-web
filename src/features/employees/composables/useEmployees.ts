import { useEmployeesStore } from '../stores/employees.store'
import { employeesApi } from '../api/employees.api'
import { useNotification } from '@/composables/useNotification'
import type { CreateEmployeeCommand, UpdateEmployeeCommand } from '../types/employees.types'

export function useEmployees() {
  const store = useEmployeesStore()
  const { notify } = useNotification()

  async function fetchAll() {
    store.setLoading(true)
    try {
      const { data } = await employeesApi.list()
      store.setEmployees(data)
    } catch {
      notify('Error al cargar los empleados', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchById(id: number) {
    store.setLoading(true)
    try {
      const { data } = await employeesApi.getById(id)
      store.setSelected(data)
    } catch {
      notify('Empleado no encontrado', 'error')
    } finally {
      store.setLoading(false)
    }
  }

  async function create(payload: CreateEmployeeCommand) {
    const { data } = await employeesApi.create(payload)
    store.setEmployees([...store.employees, data])
    notify('Empleado creado exitosamente', 'success')
    return data
  }

  async function update(id: number, payload: UpdateEmployeeCommand) {
    const { data } = await employeesApi.update(id, payload)
    store.setEmployees(store.employees.map((e) => (e.id === id ? data : e)))
    notify('Empleado actualizado', 'success')
    return data
  }

  async function remove(id: number) {
    await employeesApi.remove(id)
    store.setEmployees(store.employees.filter((e) => e.id !== id))
    notify('Empleado eliminado', 'success')
  }

  return {
    employees: store.employees,
    selected: store.selected,
    loading: store.loading,
    fetchAll, fetchById, create, update, remove,
  }
}
