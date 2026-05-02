<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { baseRolesApi } from '@/features/base-roles/api/base-roles.api'
import { basePermissionsApi } from '@/features/base-permissions/api/base-permissions.api'
import type { BaseRole } from '@/features/base-roles/types/base-roles.types'
import type { BasePermission } from '@/features/base-permissions/types/base-permissions.types'
import type {
  BaseRolePermission,
  CreateBaseRolePermissionCommand,
} from '../types/base-role-permissions.types'

const props = defineProps<{
  initial?: BaseRolePermission | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateBaseRolePermissionCommand]
  cancel: []
}>()

const form = ref<CreateBaseRolePermissionCommand>({ baseRoleId: 0, basePermissionId: 0 })
const formValid = ref(false)
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
    if (val) form.value = { baseRoleId: val.baseRole?.id ?? 0, basePermissionId: val.basePermission?.id ?? 0 }
  },
  { immediate: true },
)

function submit() {
  if (formValid.value) emit('submit', form.value)
}
</script>

<template>
  <v-form v-model="formValid" @submit.prevent="submit">
    <div class="d-flex flex-column ga-3">
      <v-select
        v-model="form.baseRoleId"
        label="Rol base"
        :items="baseRoles"
        :item-title="(r: BaseRole) => `${r.name} (${r.code})`"
        item-value="id"
        :loading="loadingData"
        :rules="[(v) => !!v || 'Campo requerido']"
      />
      <v-select
        v-model="form.basePermissionId"
        label="Permiso base"
        :items="basePermissions"
        :item-title="(p: BasePermission) => `${p.name} (${p.code})`"
        item-value="id"
        :loading="loadingData"
        :rules="[(v) => !!v || 'Campo requerido']"
      />
      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary" :loading="loading">
          {{ initial ? 'Guardar' : 'Crear' }}
        </v-btn>
      </div>
    </div>
  </v-form>
</template>
