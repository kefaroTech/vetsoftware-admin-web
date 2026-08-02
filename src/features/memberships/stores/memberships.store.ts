import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Membership } from '../types/memberships.types'

export const useMembershipsStore = defineStore('memberships', () => {
  const memberships = ref<Membership[]>([])
  const selected = ref<Membership | null>(null)
  const loading = ref(false)

  function setMemberships(data: Membership[]) {
    memberships.value = data
  }
  function setSelected(m: Membership | null) {
    selected.value = m
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { memberships, selected, loading, setMemberships, setSelected, setLoading }
})
