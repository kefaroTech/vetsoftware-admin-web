<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBaseRolePermissions } from '../composables/useBaseRolePermissions'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseRolePermissionForm from '../components/BaseRolePermissionForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateBaseRolePermissionRequest } from '../types/base-role-permissions.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useBaseRolePermissions()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateBaseRolePermissionRequest) {
  try {
    await update(Number(props.id), data)
  } catch {
    // El composable ya avisó del fallo; no navegamos para no perder lo editado.
    return
  }
  router.push({ name: ROUTE_NAMES.BASE_ROLE_PERMISSIONS_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <button type="button" class="ds-btn ds-btn--ghost" @click="router.back()">
        <component :is="ICONS.BACK" :size="15" />
        Volver
      </button>
      <h1 class="ds-title">Editar asociación rol-permiso</h1>
    </div>

    <section v-if="selected" class="ds-card ds-detail-card">
      <BaseRolePermissionForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </section>
  </AppLayout>
</template>

<style scoped>
/* El ancho lo fijaba `max-width` de v-card; con la primitiva vive aquí. */
.ds-detail-card {
  max-width: 640px;
}
</style>
