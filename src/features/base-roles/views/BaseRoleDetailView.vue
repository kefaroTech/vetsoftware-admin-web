<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBaseRoles } from '../composables/useBaseRoles'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseRoleForm from '../components/BaseRoleForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateBaseRoleRequest } from '../types/base-roles.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useBaseRoles()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateBaseRoleRequest) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.BASE_ROLES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <button type="button" class="ds-btn ds-btn--ghost" @click="router.back()">
        <component :is="ICONS.BACK" :size="15" />
        Volver
      </button>
      <h1 class="ds-title">Editar rol base</h1>
    </div>

    <section v-if="selected" class="ds-card ds-detail-card">
      <BaseRoleForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </section>
  </AppLayout>
</template>

<style scoped>
/* El ancho lo fijaba `max-width` de v-card; con la primitiva vive aquí. */
.ds-detail-card {
  max-width: 640px;
}
</style>
