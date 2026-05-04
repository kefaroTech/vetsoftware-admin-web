<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBasePermissions } from '../composables/useBasePermissions'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import BasePermissionForm from '../components/BasePermissionForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateBasePermissionCommand } from '../types/base-permissions.types'

const { permissions, fetchAll, create, remove } = useBasePermissions()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateBasePermissionCommand) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el permiso "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Permisos base</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nuevo permiso
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Submódulo', 'Fecha creación', 'Acciones']"
      :empty="permissions.length === 0"
    >
      <tr v-for="p in permissions" :key="p.id">
        <td class="font-weight-medium">{{ p.name }}</td>
        <td class="text-body-2 font-mono">{{ p.code }}</td>
        <td>{{ p.subModule?.name ?? '—' }}</td>
        <td class="text-caption text-medium-emphasis">{{ p.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/permisos-base/${p.id}`"
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
              @click="handleDelete(p.id, p.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo permiso base" @close="showModal = false">
      <BasePermissionForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
