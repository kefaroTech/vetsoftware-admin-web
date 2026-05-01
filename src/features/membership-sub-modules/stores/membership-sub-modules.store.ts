import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MembershipSubModule } from '../types/membership-sub-modules.types'

export const useMembershipSubModulesStore = defineStore('membership-sub-modules', () => {
  const membershipSubModules = ref<MembershipSubModule[]>([])
  const selected = ref<MembershipSubModule | null>(null)
  const loading = ref(false)

  function setMembershipSubModules(data: MembershipSubModule[]) { membershipSubModules.value = data }
  function setSelected(m: MembershipSubModule | null) { selected.value = m }
  function setLoading(value: boolean) { loading.value = value }

  return { membershipSubModules, selected, loading, setMembershipSubModules, setSelected, setLoading }
})
