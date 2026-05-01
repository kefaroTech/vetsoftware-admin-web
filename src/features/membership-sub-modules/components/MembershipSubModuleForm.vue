<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import { membershipsApi } from '@/features/memberships/api/memberships.api'
import { submodulesApi } from '@/features/submodules/api/submodules.api'
import type { Membership } from '@/features/memberships/types/memberships.types'
import type { Submodule } from '@/features/submodules/types/submodules.types'
import type { MembershipSubModule, CreateMembershipSubModuleCommand } from '../types/membership-sub-modules.types'

const props = defineProps<{
  initial?: MembershipSubModule | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateMembershipSubModuleCommand]
  cancel: []
}>()

const form = ref<CreateMembershipSubModuleCommand>({ membershipId: 0, subModuleId: 0 })
const memberships = ref<Membership[]>([])
const submodules = ref<Submodule[]>([])
const loadingData = ref(false)

onMounted(async () => {
  loadingData.value = true
  try {
    const [membershipsRes, submodulesRes] = await Promise.all([
      membershipsApi.list(),
      submodulesApi.list(),
    ])
    memberships.value = membershipsRes.data
    submodules.value = submodulesRes.data
    if (!props.initial) {
      if (membershipsRes.data.length > 0) form.value.membershipId = membershipsRes.data[0].id
      if (submodulesRes.data.length > 0) form.value.subModuleId = submodulesRes.data[0].id
    }
  } finally {
    loadingData.value = false
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { membershipId: val.membershipId, subModuleId: val.subModuleId }
  },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Membresía</label>
      <AppSpinner v-if="loadingData" />
      <select
        v-else
        v-model="form.membershipId"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="m in memberships" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Submódulo</label>
      <AppSpinner v-if="loadingData" />
      <select
        v-else
        v-model="form.subModuleId"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="s in submodules" :key="s.id" :value="s.id">
          {{ s.name }} ({{ s.code }})
        </option>
      </select>
    </div>

    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
