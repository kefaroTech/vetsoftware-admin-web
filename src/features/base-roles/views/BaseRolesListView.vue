<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBaseRoles } from '../composables/useBaseRoles'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import BaseRoleForm from '../components/BaseRoleForm.vue'
import type { CreateBaseRoleCommand } from '../types/base-roles.types'

const { baseRoles, loading, fetchAll, create, remove } = useBaseRoles()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateBaseRoleCommand) {
  formLoading.value = true
  try {
    await create(data)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el rol base "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Roles base</h1>
      <AppButton @click="showModal = true">+ Nuevo rol base</AppButton>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Obligatorio', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="baseRoles.length === 0"
    >
      <tr
        v-for="r in baseRoles"
        :key="r.id"
        class="border-t border-gray-100 hover:bg-gray-50"
      >
        <td class="px-4 py-3 font-medium text-gray-900">{{ r.name }}</td>
        <td class="px-4 py-3 font-mono text-sm text-gray-600">{{ r.code }}</td>
        <td class="px-4 py-3 text-sm text-gray-500">{{ r.mandatory ? 'Sí' : 'No' }}</td>
        <td class="px-4 py-3 text-xs text-gray-500">{{ r.createdDate }}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <RouterLink
              :to="`/roles-base/${r.id}`"
              class="text-xs text-indigo-600 hover:underline"
            >
              Editar
            </RouterLink>
            <button
              class="text-xs text-red-500 hover:underline"
              @click="handleDelete(r.id, r.name)"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo rol base" @close="showModal = false">
      <BaseRoleForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
