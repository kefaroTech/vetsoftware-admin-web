<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useVaccinationTypes } from '../composables/useVaccinationTypes'
import type { VaccinationTypeFormData } from '../composables/useVaccinationTypes'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import VaccinationTypeForm from '../components/VaccinationTypeForm.vue'
import { ICONS } from '@/constants/icons'

const { vaccinationTypes, fetchAll, create, remove } = useVaccinationTypes()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: VaccinationTypeFormData) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el tipo de vacuna "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Tipos de vacuna</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nuevo tipo
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Descripción', 'Fecha creación', 'Acciones']"
      :empty="vaccinationTypes.length === 0"
    >
      <tr v-for="t in vaccinationTypes" :key="t.id">
        <td class="font-weight-medium">{{ t.name }}</td>
        <td class="text-body-2 text-medium-emphasis">{{ t.description }}</td>
        <td class="text-caption text-medium-emphasis">{{ t.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/catalogos-clinicos/tipos-vacuna/${t.id}`"
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
              @click="handleDelete(t.id, t.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo tipo de vacuna" @close="showModal = false">
      <VaccinationTypeForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
