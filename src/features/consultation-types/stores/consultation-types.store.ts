import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConsultationType } from '../types/consultation-types.types'

export const useConsultationTypesStore = defineStore('consultationTypes', () => {
  const consultationTypes = ref<ConsultationType[]>([])
  const selected = ref<ConsultationType | null>(null)
  const loading = ref(false)

  function setConsultationTypes(data: ConsultationType[]) { consultationTypes.value = data }
  function setSelected(s: ConsultationType | null) { selected.value = s }
  function setLoading(value: boolean) { loading.value = value }

  return { consultationTypes, selected, loading, setConsultationTypes, setSelected, setLoading }
})
