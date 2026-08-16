import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SystemConfigurationDto } from '../types/config.types'

export const useConfigStore = defineStore('config', () => {
  const configs = ref<SystemConfigurationDto[]>([])
  const loading = ref(false)

  function setConfigs(c: SystemConfigurationDto[]) {
    configs.value = c
  }
  function upsertConfig(c: SystemConfigurationDto) {
    const i = configs.value.findIndex((x) => x.propertyName === c.propertyName)
    if (i >= 0) configs.value[i] = c
    else configs.value.push(c)
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { configs, loading, setConfigs, upsertConfig, setLoading }
})
