<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDiagnosticImagingTypes } from '../composables/useDiagnosticImagingTypes'
import type { DiagnosticImagingTypeFormData } from '../composables/useDiagnosticImagingTypes'
import AppLayout from '@/components/layout/AppLayout.vue'
import DiagnosticImagingTypeForm from '../components/DiagnosticImagingTypeForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useDiagnosticImagingTypes()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: DiagnosticImagingTypeFormData) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.DIAGNOSTIC_IMAGING_TYPES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <button type="button" class="ds-btn ds-btn--ghost" @click="router.back()">
        <component :is="ICONS.BACK" :size="15" />
        Volver
      </button>
      <h1 class="ds-title">Editar tipo de imagen diagnóstica</h1>
    </div>

    <section v-if="selected" class="ds-card ds-detail-card">
      <DiagnosticImagingTypeForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </section>
  </AppLayout>
</template>

<style scoped>
/* El ancho lo fijaba `max-width` de v-card; con la primitiva vive aquí. */
.ds-detail-card {
  max-width: 640px;
}
</style>
