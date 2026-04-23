<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCompanies } from '../composables/useCompanies'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import CompanyForm from '../components/CompanyForm.vue'
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
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Empresas</h1>
      <AppButton @click="showModal = true">+ Nueva empresa</AppButton>
    </div>

    <AppTable
      :headers="['Nombre', 'Identificador', 'Teléfono', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="companies.length === 0"
    >
      <tr
        v-for="company in companies"
        :key="company.id"
        class="border-t border-gray-100 hover:bg-gray-50"
      >
        <td class="px-4 py-3 font-medium text-gray-900">{{ company.name }}</td>
        <td class="px-4 py-3 text-gray-600">{{ company.identifier }}</td>
        <td class="px-4 py-3 text-gray-600">{{ company.contactNumber }}</td>
        <td class="px-4 py-3 text-gray-500 text-xs">{{ company.createdDate }}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <RouterLink
              :to="`/empresas/${company.id}`"
              class="text-xs text-indigo-600 hover:underline"
            >
              Editar
            </RouterLink>
            <button
              class="text-xs text-red-500 hover:underline"
              @click="handleDelete(company.id, company.name)"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva empresa" @close="showModal = false">
      <CompanyForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
