import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Permission } from '../types/permissions.types'

export const usePermissionsStore = defineStore('permissions', () => {
  const permissions = ref<Permission[]>([])
  const selected = ref<Permission | null>(null)
  const loading = ref(false)

  function setPermissions(data: Permission[]) { permissions.value = data }
  function setSelected(p: Permission | null) { selected.value = p }
  function setLoading(value: boolean) { loading.value = value }

  return { permissions, selected, loading, setPermissions, setSelected, setLoading }
})
