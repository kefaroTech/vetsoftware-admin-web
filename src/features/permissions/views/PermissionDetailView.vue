<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissions } from '../composables/usePermissions'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import PermissionForm from '../components/PermissionForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import type { CreatePermissionCommand } from '../types/permissions.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, fetchById, update } = usePermissions()
const saving = ref(false)

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreatePermissionCommand) {
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.PERMISSIONS_LIST })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center gap-4">
      <AppButton variant="secondary" @click="router.back()">← Volver</AppButton>
      <h1 class="text-2xl font-bold text-gray-900">Editar permiso</h1>
    </div>

    <AppSpinner v-if="loading" />
    <div v-else-if="selected" class="max-w-lg rounded-xl bg-white p-6 shadow-sm">
      <PermissionForm
        :initial="selected"
        :loading="saving"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </div>
  </AppLayout>
</template>
