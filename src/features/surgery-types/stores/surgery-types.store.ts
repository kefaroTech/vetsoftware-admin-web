import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SurgeryType } from '../types/surgery-types.types'

export const useSurgeryTypesStore = defineStore('surgeryTypes', () => {
  const surgeryTypes = ref<SurgeryType[]>([])
  const selected = ref<SurgeryType | null>(null)
  const loading = ref(false)

  function setSurgeryTypes(data: SurgeryType[]) { surgeryTypes.value = data }
  function setSelected(s: SurgeryType | null) { selected.value = s }
  function setLoading(value: boolean) { loading.value = value }

  return { surgeryTypes, selected, loading, setSurgeryTypes, setSelected, setLoading }
})
