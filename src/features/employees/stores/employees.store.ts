import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Employee } from '../types/employees.types'

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref<Employee[]>([])
  const selected = ref<Employee | null>(null)
  const loading = ref(false)

  function setEmployees(data: Employee[]) { employees.value = data }
  function setSelected(e: Employee | null) { selected.value = e }
  function setLoading(value: boolean) { loading.value = value }

  return { employees, selected, loading, setEmployees, setSelected, setLoading }
})
