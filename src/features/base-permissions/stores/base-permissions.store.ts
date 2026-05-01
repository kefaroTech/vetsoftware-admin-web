import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BasePermission } from '../types/base-permissions.types'

export const useBasePermissionsStore = defineStore('base-permissions', () => {
  const permissions = ref<BasePermission[]>([])
  const selected = ref<BasePermission | null>(null)
  const loading = ref(false)

  function setPermissions(data: BasePermission[]) { permissions.value = data }
  function setSelected(p: BasePermission | null) { selected.value = p }
  function setLoading(value: boolean) { loading.value = value }

  return { permissions, selected, loading, setPermissions, setSelected, setLoading }
})
