<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissions } from '../composables/usePermissions'
import AppLayout from '@/components/layout/AppLayout.vue'
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
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar permiso</h1>
    </div>

    <AppSpinner v-if="loading" />
    <v-card v-else-if="selected" max-width="640" class="pa-6">
      <PermissionForm
        :initial="selected"
        :loading="saving"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </v-card>
  </AppLayout>
</template>
