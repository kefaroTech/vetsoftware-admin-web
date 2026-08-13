<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
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
}>()

const emit = defineEmits<{
  submit: [data: CreateBaseRolePermissionCommand]
  cancel: []
}>()

const form = ref<CreateBaseRolePermissionCommand>({ baseRoleId: 0, basePermissionId: 0 })
const submitted = ref(false)
const baseRoles = ref<BaseRole[]>([])
const basePermissions = ref<BasePermission[]>([])

const roleOptions = computed(() =>
  baseRoles.value.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` })),
)
const permissionOptions = computed(() =>
  basePermissions.value.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
)

const errors = computed(() => ({
  baseRoleId: form.value.baseRoleId ? '' : 'Campo requerido',
  basePermissionId: form.value.basePermissionId ? '' : 'Campo requerido',
}))

onMounted(async () => {
  const [rolesRes, permsRes] = await Promise.all([baseRolesApi.list(), basePermissionsApi.list()])
  baseRoles.value = rolesRes.data
  basePermissions.value = permsRes.data
  if (!props.initial) {
    const firstRole = rolesRes.data[0]
    const firstPerm = permsRes.data[0]
    if (firstRole) form.value.baseRoleId = firstRole.id
    if (firstPerm) form.value.basePermissionId = firstPerm.id
  }
})

watch(
  () => props.initial,
  (val) => {
    if (val)
      form.value = {
        baseRoleId: val.baseRole?.id ?? 0,
        basePermissionId: val.basePermission?.id ?? 0,
      }
  },
  { immediate: true },
)

function submit() {
  submitted.value = true
  if (Object.values(errors.value).every((e) => !e)) emit('submit', form.value)
}
</script>

<template>
  <form class="app-form" novalidate @submit.prevent="submit">
    <AppSelect
      v-model="form.baseRoleId"
      label="Rol base"
      required
      :options="roleOptions"
      :error="submitted ? errors.baseRoleId : ''"
    />
    <AppSelect
      v-model="form.basePermissionId"
      label="Permiso base"
      required
      :options="permissionOptions"
      :error="submitted ? errors.basePermissionId : ''"
    />
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
