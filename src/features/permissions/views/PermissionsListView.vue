<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePermissions } from '../composables/usePermissions'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
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
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Permisos</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showModal = true">
        Nuevo permiso
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Empresa', 'Submódulo', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="permissions.length === 0"
    >
      <tr v-for="p in permissions" :key="p.id">
        <td class="font-weight-medium">{{ p.name }}</td>
        <td class="text-body-2 font-mono">{{ p.code }}</td>
        <td>{{ p.company?.name ?? '—' }}</td>
        <td>{{ p.subModule?.name ?? '—' }}</td>
        <td class="text-caption text-medium-emphasis">{{ p.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/permisos/${p.id}`"
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
              @click="handleDelete(p.id, p.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo permiso" @close="showModal = false">
      <PermissionForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
