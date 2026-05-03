<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useModules } from '../composables/useModules'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ModuleForm from '../components/ModuleForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateModuleCommand } from '../types/modules.types'

const { modules, loading, fetchAll, create, remove } = useModules()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateModuleCommand) {
  formLoading.value = true
  try {
    await create(data)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el módulo "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Módulos</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nuevo módulo
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="modules.length === 0"
    >
      <tr v-for="m in modules" :key="m.id">
        <td class="font-weight-medium">{{ m.name }}</td>
        <td class="text-body-2 font-mono">{{ m.code }}</td>
        <td class="text-caption text-medium-emphasis">{{ m.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/modulos/${m.id}`"
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
              @click="handleDelete(m.id, m.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo módulo" @close="showModal = false">
      <ModuleForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
