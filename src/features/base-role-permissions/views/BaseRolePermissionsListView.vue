<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBaseRolePermissions } from '../composables/useBaseRolePermissions'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import BaseRolePermissionForm from '../components/BaseRolePermissionForm.vue'
import type { CreateBaseRolePermissionCommand } from '../types/base-role-permissions.types'

const { baseRolePermissions, loading, fetchAll, create, remove } = useBaseRolePermissions()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateBaseRolePermissionCommand) {
  formLoading.value = true
  try {
    await create(data)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number) {
  const ok = await confirm('¿Eliminar esta asociación rol-permiso?')
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Permisos de roles base</h1>
      <AppButton @click="showModal = true">+ Nueva asociación</AppButton>
    </div>

    <AppTable
      :headers="['Rol base ID', 'Permiso base ID', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="baseRolePermissions.length === 0"
    >
      <tr
        v-for="p in baseRolePermissions"
        :key="p.id"
        class="border-t border-gray-100 hover:bg-gray-50"
      >
        <td class="px-4 py-3 text-sm text-gray-900">{{ p.baseRoleId }}</td>
        <td class="px-4 py-3 text-sm text-gray-900">{{ p.basePermissionId }}</td>
        <td class="px-4 py-3 text-xs text-gray-500">{{ p.createdDate }}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <RouterLink
              :to="`/permisos-roles-base/${p.id}`"
              class="text-xs text-indigo-600 hover:underline"
            >
              Editar
            </RouterLink>
            <button
              class="text-xs text-red-500 hover:underline"
              @click="handleDelete(p.id)"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva asociación rol-permiso" @close="showModal = false">
      <BaseRolePermissionForm
        :loading="formLoading"
        @submit="handleCreate"
        @cancel="showModal = false"
      />
    </AppModal>
  </AppLayout>
</template>
