<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSubmodules } from '../composables/useSubmodules'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import SubmoduleForm from '../components/SubmoduleForm.vue'
import type { CreateSubmoduleCommand } from '../types/submodules.types'

const { submodules, loading, fetchAll, create, remove } = useSubmodules()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateSubmoduleCommand) {
  formLoading.value = true
  try {
    await create(data)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el submódulo "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Submódulos</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showModal = true">
        Nuevo submódulo
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Módulo ID', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="submodules.length === 0"
    >
      <tr v-for="s in submodules" :key="s.id">
        <td class="font-weight-medium">{{ s.name }}</td>
        <td class="text-body-2 font-mono">{{ s.code }}</td>
        <td>{{ s.moduleId }}</td>
        <td class="text-caption text-medium-emphasis">{{ s.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/submodulos/${s.id}`"
              size="small"
              variant="text"
              color="primary"
              icon="mdi-pencil"
            />
            <v-btn
              size="small"
              variant="text"
              color="error"
              icon="mdi-delete"
              @click="handleDelete(s.id, s.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo submódulo" @close="showModal = false">
      <SubmoduleForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
