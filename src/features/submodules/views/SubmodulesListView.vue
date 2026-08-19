<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSubmodules } from '../composables/useSubmodules'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import SubmoduleForm from '../components/SubmoduleForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateSubModuleRequest } from '../types/submodules.types'

const { submodules, fetchAll, create, remove } = useSubmodules()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateSubModuleRequest) {
  try {
    await create(data)
  } catch {
    // El composable ya avisó del fallo; el modal sigue abierto con lo escrito.
    return
  }
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el submódulo "${name}"?`)
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
      <h1 class="ds-title">Submódulos</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo submódulo
      </button>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Módulo', 'Fecha creación', 'Acciones']"
      :empty="submodules.length === 0"
    >
      <tr v-for="s in submodules" :key="s.id">
        <td class="font-weight-medium">{{ s.name }}</td>
        <td class="text-body-2 font-mono">{{ s.code }}</td>
        <td>{{ s.module?.name ?? '—' }}</td>
        <td class="text-caption text-medium-emphasis">{{ s.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <RouterLink :to="`/submodulos/${s.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(s.id, s.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo submódulo" @close="showModal = false">
      <SubmoduleForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
