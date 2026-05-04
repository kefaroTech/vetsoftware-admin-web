<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useModules } from '../composables/useModules'
import AppLayout from '@/components/layout/AppLayout.vue'
import ModuleForm from '../components/ModuleForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateModuleCommand } from '../types/modules.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useModules()

onMounted(() => fetchById(Number(props.id)))

async function handleSave(data: CreateModuleCommand) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.MODULES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar módulo</h1>
    </div>

    <v-card v-if="selected" max-width="640" class="pa-6">
      <ModuleForm :initial="selected" @submit="handleSave" @cancel="router.back()" />
    </v-card>
  </AppLayout>
</template>
