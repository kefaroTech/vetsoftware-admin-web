<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCompanies } from '../composables/useCompanies'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import CompanyForm from '../components/CompanyForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateCompanyCommand } from '../types/companies.types'

const { companies, loading, fetchAll, create, remove } = useCompanies()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateCompanyCommand) {
  formLoading.value = true
  try {
    await create(data)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number, name: string) {
  const confirmed = await confirm(`¿Eliminar la empresa "${name}"?`)
  if (confirmed) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Empresas</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nueva empresa
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Identificador', 'Teléfono', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="companies.length === 0"
    >
      <tr v-for="company in companies" :key="company.id">
        <td class="font-weight-medium">{{ company.name }}</td>
        <td>{{ company.identifier }}</td>
        <td>{{ company.contactNumber }}</td>
        <td class="text-caption text-medium-emphasis">{{ company.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/empresas/${company.id}`"
              size="small"
              variant="text"
              color="primary"
              :icon="ICONS.EDIT"
            />
            <v-btn
              size="small"
              variant="text"
              color="error"
              :icon="ICONS.DELETE"
              @click="handleDelete(company.id, company.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva empresa" @close="showModal = false">
      <CompanyForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
