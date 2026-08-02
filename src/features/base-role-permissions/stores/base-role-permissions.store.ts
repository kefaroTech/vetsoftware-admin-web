import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BaseRolePermission } from '../types/base-role-permissions.types'

export const useBaseRolePermissionsStore = defineStore('base-role-permissions', () => {
  const baseRolePermissions = ref<BaseRolePermission[]>([])
  const selected = ref<BaseRolePermission | null>(null)
  const loading = ref(false)

  function setBaseRolePermissions(data: BaseRolePermission[]) {
    baseRolePermissions.value = data
  }
  function setSelected(p: BaseRolePermission | null) {
    selected.value = p
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { baseRolePermissions, selected, loading, setBaseRolePermissions, setSelected, setLoading }
})
