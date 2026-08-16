<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCompanies } from '../composables/useCompanies'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import CompanyForm from '../components/CompanyForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateCompanyRequest } from '../types/companies.types'

const { companies, fetchAll, create, remove } = useCompanies()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateCompanyRequest) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const confirmed = await confirm(`¿Eliminar la empresa "${name}"?`)
  if (confirmed) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Empresas</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva empresa
      </button>
    </div>

    <AppTable
      :headers="['Nombre', 'Identificador', 'Teléfono', 'Fecha creación', 'Acciones']"
      :empty="companies.length === 0"
    >
      <tr v-for="company in companies" :key="company.id">
        <td class="font-weight-medium">{{ company.name }}</td>
        <td>{{ company.identifier }}</td>
        <td>{{ company.contactNumber }}</td>
        <td class="text-caption text-medium-emphasis">{{ company.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <RouterLink :to="`/empresas/${company.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(company.id, company.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva empresa" @close="showModal = false">
      <CompanyForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
