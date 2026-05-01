import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Submodule } from '../types/submodules.types'

export const useSubmodulesStore = defineStore('submodules', () => {
  const submodules = ref<Submodule[]>([])
  const selected = ref<Submodule | null>(null)
  const loading = ref(false)

  function setSubmodules(data: Submodule[]) { submodules.value = data }
  function setSelected(s: Submodule | null) { selected.value = s }
  function setLoading(value: boolean) { loading.value = value }

  return { submodules, selected, loading, setSubmodules, setSelected, setLoading }
})
