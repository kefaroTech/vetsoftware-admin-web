<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBreeds } from '../composables/useBreeds'
import AppLayout from '@/components/layout/AppLayout.vue'
import BreedForm from '../components/BreedForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateBreedCommand } from '../types/breeds.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useBreeds()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateBreedCommand) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.BREEDS_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar raza</h1>
    </div>

    <v-card v-if="selected" max-width="640" class="pa-6">
      <BreedForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </v-card>
  </AppLayout>
</template>
