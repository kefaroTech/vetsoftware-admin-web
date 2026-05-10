<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSurgeryTypes } from '../composables/useSurgeryTypes'
import type { SurgeryTypeFormData } from '../composables/useSurgeryTypes'
import AppLayout from '@/components/layout/AppLayout.vue'
import SurgeryTypeForm from '../components/SurgeryTypeForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useSurgeryTypes()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: SurgeryTypeFormData) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.SURGERY_TYPES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar tipo de cirugía</h1>
    </div>

    <v-card v-if="selected" max-width="640" class="pa-6">
      <SurgeryTypeForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </v-card>
  </AppLayout>
</template>
