<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import { baseRolesApi } from '@/features/base-roles/api/base-roles.api'
import { basePermissionsApi } from '@/features/base-permissions/api/base-permissions.api'
import type { BaseRole } from '@/features/base-roles/types/base-roles.types'
import type { BasePermission } from '@/features/base-permissions/types/base-permissions.types'
import type { BaseRolePermission, CreateBaseRolePermissionCommand } from '../types/base-role-permissions.types'

const props = defineProps<{
  initial?: BaseRolePermission | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateBaseRolePermissionCommand]
  cancel: []
}>()

const form = ref<CreateBaseRolePermissionCommand>({ baseRoleId: 0, basePermissionId: 0 })
const baseRoles = ref<BaseRole[]>([])
const basePermissions = ref<BasePermission[]>([])
const loadingData = ref(false)

onMounted(async () => {
  loadingData.value = true
  try {
    const [rolesRes, permsRes] = await Promise.all([
      baseRolesApi.list(),
      basePermissionsApi.list(),
    ])
    baseRoles.value = rolesRes.data
    basePermissions.value = permsRes.data
    if (!props.initial) {
      if (rolesRes.data.length > 0) form.value.baseRoleId = rolesRes.data[0].id
      if (permsRes.data.length > 0) form.value.basePermissionId = permsRes.data[0].id
    }
  } finally {
    loadingData.value = false
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { baseRoleId: val.baseRoleId, basePermissionId: val.basePermissionId }
  },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Rol base</label>
      <AppSpinner v-if="loadingData" />
      <select
        v-else
        v-model="form.baseRoleId"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="r in baseRoles" :key="r.id" :value="r.id">
          {{ r.name }} ({{ r.code }})
        </option>
      </select>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Permiso base</label>
      <AppSpinner v-if="loadingData" />
      <select
        v-else
        v-model="form.basePermissionId"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="p in basePermissions" :key="p.id" :value="p.id">
          {{ p.name }} ({{ p.code }})
        </option>
      </select>
    </div>

    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
