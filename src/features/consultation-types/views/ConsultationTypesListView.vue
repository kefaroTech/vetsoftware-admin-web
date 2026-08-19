<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useConsultationTypes } from '../composables/useConsultationTypes'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ConsultationTypeForm from '../components/ConsultationTypeForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateConsultationTypeRequest } from '../types/consultation-types.types'

const { consultationTypes, fetchAll, create, remove } = useConsultationTypes()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateConsultationTypeRequest) {
  try {
    await create(data)
  } catch {
    // El composable ya avisó del fallo; el modal sigue abierto con lo escrito.
    return
  }
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el tipo de consulta "${name}"?`)
  if (!ok) return
  try {
    await remove(id)
  } catch {
    // El composable ya avisó del fallo; la fila se queda como estaba.
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Tipos de consulta</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo tipo
      </button>
    </div>

    <AppTable
      :headers="['Nombre', 'Descripción', 'Fecha creación', 'Acciones']"
      :empty="consultationTypes.length === 0"
    >
      <tr v-for="t in consultationTypes" :key="t.id">
        <td class="font-weight-medium">{{ t.name }}</td>
        <td class="text-body-2 text-medium-emphasis">{{ t.description }}</td>
        <td class="text-caption text-medium-emphasis">{{ t.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <RouterLink
              :to="`/catalogos-clinicos/tipos-consulta/${t.id}`"
              class="ds-icon-btn"
              aria-label="Editar"
            >
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(t.id, t.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo tipo de consulta" @close="showModal = false">
      <ConsultationTypeForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
