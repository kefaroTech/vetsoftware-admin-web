<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBasePermissions } from '../composables/useBasePermissions'
import AppLayout from '@/components/layout/AppLayout.vue'
import BasePermissionForm from '../components/BasePermissionForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateBasePermissionRequest } from '../types/base-permissions.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useBasePermissions()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateBasePermissionRequest) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.BASE_PERMISSIONS_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <button type="button" class="ds-btn ds-btn--ghost" @click="router.back()">
        <component :is="ICONS.BACK" :size="15" />
        Volver
      </button>
      <h1 class="ds-title">Editar permiso base</h1>
    </div>

    <section v-if="selected" class="ds-card ds-detail-card">
      <BasePermissionForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </section>
  </AppLayout>
</template>

<style scoped>
/* El ancho lo fijaba `max-width` de v-card; con la primitiva vive aquí. */
.ds-detail-card {
  max-width: 640px;
}
</style>
