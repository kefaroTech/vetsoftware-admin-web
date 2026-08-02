import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppModule } from '../types/modules.types'

export const useModulesStore = defineStore('modules', () => {
  const modules = ref<AppModule[]>([])
  const selected = ref<AppModule | null>(null)
  const loading = ref(false)

  function setModules(data: AppModule[]) {
    modules.value = data
  }
  function setSelected(m: AppModule | null) {
    selected.value = m
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { modules, selected, loading, setModules, setSelected, setLoading }
})
