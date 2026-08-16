<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLaboratoryTestTypes } from '../composables/useLaboratoryTestTypes'
import type { LaboratoryTestTypeFormData } from '../composables/useLaboratoryTestTypes'
import AppLayout from '@/components/layout/AppLayout.vue'
import LaboratoryTestTypeForm from '../components/LaboratoryTestTypeForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useLaboratoryTestTypes()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: LaboratoryTestTypeFormData) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.LABORATORY_TEST_TYPES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <button type="button" class="ds-btn ds-btn--ghost" @click="router.back()">
        <component :is="ICONS.BACK" :size="15" />
        Volver
      </button>
      <h1 class="ds-title">Editar tipo de laboratorio</h1>
    </div>

    <section v-if="selected" class="ds-card ds-detail-card">
      <LaboratoryTestTypeForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </section>
  </AppLayout>
</template>

<style scoped>
/* El ancho lo fijaba `max-width` de v-card; con la primitiva vive aquí. */
.ds-detail-card {
  max-width: 640px;
}
</style>
