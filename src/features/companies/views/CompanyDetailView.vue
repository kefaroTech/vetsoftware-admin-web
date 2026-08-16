<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanies } from '../composables/useCompanies'
import AppLayout from '@/components/layout/AppLayout.vue'
import CompanyForm from '../components/CompanyForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateCompanyRequest } from '../types/companies.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, fetchById, update } = useCompanies()

onMounted(() => fetchById(Number(props.id)))

async function handleUpdate(data: CreateCompanyRequest) {
  await update(Number(props.id), data)
  router.push({ name: ROUTE_NAMES.COMPANIES_LIST })
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar empresa</h1>
    </div>

    <v-card v-if="selected" max-width="640" class="pa-6">
      <CompanyForm :initial="selected" @submit="handleUpdate" @cancel="router.back()" />
    </v-card>
  </AppLayout>
</template>
