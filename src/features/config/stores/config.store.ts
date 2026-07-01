import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SystemConfiguration } from '../types/config.types'

export const useConfigStore = defineStore('config', () => {
  const configs = ref<SystemConfiguration[]>([])
  const loading = ref(false)

  function setConfigs(c: SystemConfiguration[]) {
    configs.value = c
  }
  function upsertConfig(c: SystemConfiguration) {
    const i = configs.value.findIndex((x) => x.propertyName === c.propertyName)
    if (i >= 0) configs.value[i] = c
    else configs.value.push(c)
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { configs, loading, setConfigs, upsertConfig, setLoading }
})
