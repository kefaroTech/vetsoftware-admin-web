<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBaseRolePermissions } from '../composables/useBaseRolePermissions'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
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
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Permisos de roles base</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showModal = true">
        Nueva asociación
      </v-btn>
    </div>

    <AppTable
      :headers="['Rol base ID', 'Permiso base ID', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="baseRolePermissions.length === 0"
    >
      <tr v-for="p in baseRolePermissions" :key="p.id">
        <td>{{ p.baseRoleId }}</td>
        <td>{{ p.basePermissionId }}</td>
        <td class="text-caption text-medium-emphasis">{{ p.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/permisos-roles-base/${p.id}`"
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
              @click="handleDelete(p.id)"
            />
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
