import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BaseRole } from '../types/base-roles.types'

export const useBaseRolesStore = defineStore('base-roles', () => {
  const baseRoles = ref<BaseRole[]>([])
  const selected = ref<BaseRole | null>(null)
  const loading = ref(false)

  function setBaseRoles(data: BaseRole[]) { baseRoles.value = data }
  function setSelected(r: BaseRole | null) { selected.value = r }
  function setLoading(value: boolean) { loading.value = value }

  return { baseRoles, selected, loading, setBaseRoles, setSelected, setLoading }
})
