import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Company } from '../types/companies.types'

export const useCompaniesStore = defineStore('companies', () => {
  const companies = ref<Company[]>([])
  const selected = ref<Company | null>(null)
  const loading = ref(false)

  function setCompanies(data: Company[]) {
    companies.value = data
  }

  function setSelected(company: Company | null) {
    selected.value = company
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  return { companies, selected, loading, setCompanies, setSelected, setLoading }
})
