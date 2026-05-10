import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DiagnosticImagingType } from '../types/diagnostic-imaging-types.types'

export const useDiagnosticImagingTypesStore = defineStore('diagnosticImagingTypes', () => {
  const diagnosticImagingTypes = ref<DiagnosticImagingType[]>([])
  const selected = ref<DiagnosticImagingType | null>(null)
  const loading = ref(false)

  function setDiagnosticImagingTypes(data: DiagnosticImagingType[]) {
    diagnosticImagingTypes.value = data
  }
  function setSelected(s: DiagnosticImagingType | null) { selected.value = s }
  function setLoading(value: boolean) { loading.value = value }

  return {
    diagnosticImagingTypes,
    selected,
    loading,
    setDiagnosticImagingTypes,
    setSelected,
    setLoading,
  }
})
