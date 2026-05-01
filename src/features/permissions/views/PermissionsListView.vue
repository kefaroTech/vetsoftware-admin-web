<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePermissions } from '../composables/usePermissions'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PermissionForm from '../components/PermissionForm.vue'
import type { CreatePermissionCommand } from '../types/permissions.types'

const { permissions, loading, fetchAll, create, remove } = usePermissions()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreatePermissionCommand) {
  formLoading.value = true
  try {
    await create(data)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el permiso "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Permisos</h1>
      <AppButton @click="showModal = true">+ Nuevo permiso</AppButton>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Empresa ID', 'Submódulo ID', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="permissions.length === 0"
    >
      <tr
        v-for="p in permissions"
        :key="p.id"
        class="border-t border-gray-100 hover:bg-gray-50"
      >
        <td class="px-4 py-3 font-medium text-gray-900">{{ p.name }}</td>
        <td class="px-4 py-3 font-mono text-sm text-gray-600">{{ p.code }}</td>
        <td class="px-4 py-3 text-sm text-gray-500">{{ p.companyId }}</td>
        <td class="px-4 py-3 text-sm text-gray-500">{{ p.subModuleId }}</td>
        <td class="px-4 py-3 text-xs text-gray-500">{{ p.createdDate }}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <RouterLink
              :to="`/permisos/${p.id}`"
              class="text-xs text-indigo-600 hover:underline"
            >
              Editar
            </RouterLink>
            <button
              class="text-xs text-red-500 hover:underline"
              @click="handleDelete(p.id, p.name)"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo permiso" @close="showModal = false">
      <PermissionForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
