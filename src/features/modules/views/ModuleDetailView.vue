<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useModules } from '../composables/useModules'
import AppLayout from '@/components/layout/AppLayout.vue'
import ModuleForm from '../components/ModuleForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateModuleRequest } from '../types/modules.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useModules()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateModuleRequest) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.MODULES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <button type="button" class="ds-btn ds-btn--ghost" @click="router.back()">
        <component :is="ICONS.BACK" :size="15" />
        Volver
      </button>
      <h1 class="ds-title">Editar módulo</h1>
    </div>

    <section v-if="selected" class="ds-card ds-detail-card">
      <ModuleForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </section>
  </AppLayout>
</template>

<style scoped>
/* El ancho lo fijaba `max-width` de v-card; con la primitiva vive aquí. */
.ds-detail-card {
  max-width: 640px;
}
</style>
