import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storageService } from '@/services/storage/storage.service'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(storageService.getToken())
  const permissions = ref<string[]>([])

  const isAuthenticated = computed(() => !!token.value)

  function setToken(newToken: string) {
    token.value = newToken
    storageService.setToken(newToken)
  }

  function hasPermission(permission: string) {
    return permissions.value.includes(permission)
  }

  function logout() {
    token.value = null
    permissions.value = []
    storageService.removeToken()
  }

  return { token, permissions, isAuthenticated, setToken, hasPermission, logout }
})
