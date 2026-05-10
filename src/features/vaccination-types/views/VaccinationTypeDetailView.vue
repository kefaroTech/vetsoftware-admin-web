<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVaccinationTypes } from '../composables/useVaccinationTypes'
import type { VaccinationTypeFormData } from '../composables/useVaccinationTypes'
import AppLayout from '@/components/layout/AppLayout.vue'
import VaccinationTypeForm from '../components/VaccinationTypeForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useVaccinationTypes()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: VaccinationTypeFormData) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.VACCINATION_TYPES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar tipo de vacuna</h1>
    </div>

    <v-card v-if="selected" max-width="640" class="pa-6">
      <VaccinationTypeForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </v-card>
  </AppLayout>
</template>
