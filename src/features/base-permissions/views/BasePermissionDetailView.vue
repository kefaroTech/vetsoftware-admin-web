<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBasePermissions } from '../composables/useBasePermissions'
import AppLayout from '@/components/layout/AppLayout.vue'
import BasePermissionForm from '../components/BasePermissionForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateBasePermissionCommand } from '../types/base-permissions.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useBasePermissions()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateBasePermissionCommand) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.BASE_PERMISSIONS_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar permiso base</h1>
    </div>

    <v-card v-if="selected" max-width="640" class="pa-6">
      <BasePermissionForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </v-card>
  </AppLayout>
</template>
