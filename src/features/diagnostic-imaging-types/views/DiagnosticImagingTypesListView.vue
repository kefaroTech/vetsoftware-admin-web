<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDiagnosticImagingTypes } from '../composables/useDiagnosticImagingTypes'
import type { DiagnosticImagingTypeFormData } from '../composables/useDiagnosticImagingTypes'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import DiagnosticImagingTypeForm from '../components/DiagnosticImagingTypeForm.vue'
import { ICONS } from '@/constants/icons'

const { diagnosticImagingTypes, fetchAll, create, remove } = useDiagnosticImagingTypes()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: DiagnosticImagingTypeFormData) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el tipo de imagen diagnóstica "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Tipos de imagen diagnóstica</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nuevo tipo
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Descripción', 'Fecha creación', 'Acciones']"
      :empty="diagnosticImagingTypes.length === 0"
    >
      <tr v-for="t in diagnosticImagingTypes" :key="t.id">
        <td class="font-weight-medium">{{ t.name }}</td>
        <td class="text-body-2 text-medium-emphasis">{{ t.description }}</td>
        <td class="text-caption text-medium-emphasis">{{ t.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/catalogos-clinicos/tipos-imagen/${t.id}`"
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

    <AppModal
      :open="showModal"
      title="Nuevo tipo de imagen diagnóstica"
      @close="showModal = false"
    >
      <DiagnosticImagingTypeForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
