import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LaboratoryTestType } from '../types/laboratory-test-types.types'

export const useLaboratoryTestTypesStore = defineStore('laboratoryTestTypes', () => {
  const laboratoryTestTypes = ref<LaboratoryTestType[]>([])
  const selected = ref<LaboratoryTestType | null>(null)
  const loading = ref(false)

  function setLaboratoryTestTypes(data: LaboratoryTestType[]) { laboratoryTestTypes.value = data }
  function setSelected(s: LaboratoryTestType | null) { selected.value = s }
  function setLoading(value: boolean) { loading.value = value }

  return {
    laboratoryTestTypes,
    selected,
    loading,
    setLaboratoryTestTypes,
    setSelected,
    setLoading,
  }
})
