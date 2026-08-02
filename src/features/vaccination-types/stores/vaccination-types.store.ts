import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VaccinationType } from '../types/vaccination-types.types'

export const useVaccinationTypesStore = defineStore('vaccinationTypes', () => {
  const vaccinationTypes = ref<VaccinationType[]>([])
  const selected = ref<VaccinationType | null>(null)
  const loading = ref(false)

  function setVaccinationTypes(data: VaccinationType[]) {
    vaccinationTypes.value = data
  }
  function setSelected(s: VaccinationType | null) {
    selected.value = s
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { vaccinationTypes, selected, loading, setVaccinationTypes, setSelected, setLoading }
})
