<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBasePermissions } from '../composables/useBasePermissions'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import BasePermissionForm from '../components/BasePermissionForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import type { CreateBasePermissionCommand } from '../types/base-permissions.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, fetchById, update } = useBasePermissions()
const saving = ref(false)

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateBasePermissionCommand) {
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.BASE_PERMISSIONS_LIST })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center gap-4">
      <AppButton variant="secondary" @click="router.back()">← Volver</AppButton>
      <h1 class="text-2xl font-bold text-gray-900">Editar permiso base</h1>
    </div>

    <AppSpinner v-if="loading" />
    <div v-else-if="selected" class="max-w-lg rounded-xl bg-white p-6 shadow-sm">
      <BasePermissionForm
        :initial="selected"
        :loading="saving"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </div>
  </AppLayout>
</template>
