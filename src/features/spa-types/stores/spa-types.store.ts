import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SpaType } from '../types/spa-types.types'

export const useSpaTypesStore = defineStore('spaTypes', () => {
  const spaTypes = ref<SpaType[]>([])
  const selected = ref<SpaType | null>(null)
  const loading = ref(false)

  function setSpaTypes(data: SpaType[]) {
    spaTypes.value = data
  }
  function setSelected(s: SpaType | null) {
    selected.value = s
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { spaTypes, selected, loading, setSpaTypes, setSelected, setLoading }
})
