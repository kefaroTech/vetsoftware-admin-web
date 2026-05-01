<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSubmodules } from '../composables/useSubmodules'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
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
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Submódulos</h1>
      <AppButton @click="showModal = true">+ Nuevo submódulo</AppButton>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Módulo ID', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="submodules.length === 0"
    >
      <tr
        v-for="s in submodules"
        :key="s.id"
        class="border-t border-gray-100 hover:bg-gray-50"
      >
        <td class="px-4 py-3 font-medium text-gray-900">{{ s.name }}</td>
        <td class="px-4 py-3 font-mono text-sm text-gray-600">{{ s.code }}</td>
        <td class="px-4 py-3 text-sm text-gray-500">{{ s.moduleId }}</td>
        <td class="px-4 py-3 text-xs text-gray-500">{{ s.createdDate }}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <RouterLink
              :to="`/submodulos/${s.id}`"
              class="text-xs text-indigo-600 hover:underline"
            >
              Editar
            </RouterLink>
            <button
              class="text-xs text-red-500 hover:underline"
              @click="handleDelete(s.id, s.name)"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo submódulo" @close="showModal = false">
      <SubmoduleForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
