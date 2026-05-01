<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBaseRoles } from '../composables/useBaseRoles'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import BaseRoleForm from '../components/BaseRoleForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import type { CreateBaseRoleCommand } from '../types/base-roles.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, fetchById, update } = useBaseRoles()
const saving = ref(false)

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateBaseRoleCommand) {
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.BASE_ROLES_LIST })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar rol base</h1>
    </div>

    <AppSpinner v-if="loading" />
    <v-card v-else-if="selected" max-width="640" class="pa-6">
      <BaseRoleForm
        :initial="selected"
        :loading="saving"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </v-card>
  </AppLayout>
</template>
