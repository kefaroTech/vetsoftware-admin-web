<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSubmodules } from '../composables/useSubmodules'
import AppLayout from '@/components/layout/AppLayout.vue'
import SubmoduleForm from '../components/SubmoduleForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateSubmoduleCommand } from '../types/submodules.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useSubmodules()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateSubmoduleCommand) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.SUBMODULES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar submódulo</h1>
    </div>

    <v-card v-if="selected" max-width="640" class="pa-6">
      <SubmoduleForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </v-card>
  </AppLayout>
</template>
