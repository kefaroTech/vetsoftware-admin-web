import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storageService } from '@/services/storage/storage.service'
import { decodeJwt } from '../utils/jwt'

export type UserType = 'EMPLOYEE' | 'SYSTEM_USER'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(storageService.getToken())
  const permissions = ref<string[]>([])

  const payload = computed(() => (token.value ? decodeJwt(token.value) : null))
  const userId = computed<number | null>(() => {
    const sub = payload.value?.sub
    if (!sub) return null
    const id = Number(sub)
    return Number.isFinite(id) ? id : null
  })
  const userType = computed<UserType | null>(() => payload.value?.type ?? null)
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
    storageService.clearAll()
  }

  return {
    token,
    permissions,
    userId,
    userType,
    isAuthenticated,
    setToken,
    hasPermission,
    logout,
  }
})
