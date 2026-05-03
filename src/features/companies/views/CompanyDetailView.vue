<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanies } from '../composables/useCompanies'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppSpinner from '@/components/feedback/AppSpinner.vue'
import CompanyForm from '../components/CompanyForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import type { CreateCompanyCommand } from '../types/companies.types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, loading, fetchById, update } = useCompanies()
const saving = ref(false)

onMounted(() => fetchById(Number(props.id)))

async function handleUpdate(data: CreateCompanyCommand) {
  saving.value = true
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.COMPANIES_LIST })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn variant="text" :prepend-icon="ICONS.BACK" @click="router.back()">Volver</v-btn>
      <h1 class="text-h4 font-weight-bold">Editar empresa</h1>
    </div>

    <AppSpinner v-if="loading" />
    <v-card v-else-if="selected" max-width="640" class="pa-6">
      <CompanyForm
        :initial="selected"
        :loading="saving"
        @submit="handleUpdate"
        @cancel="router.back()"
      />
    </v-card>
  </AppLayout>
</template>
