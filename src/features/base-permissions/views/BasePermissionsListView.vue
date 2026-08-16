<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBasePermissions } from '../composables/useBasePermissions'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import BasePermissionForm from '../components/BasePermissionForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateBasePermissionRequest } from '../types/base-permissions.types'

const { permissions, fetchAll, create, remove } = useBasePermissions()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateBasePermissionRequest) {
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
    <div class="ds-head">
      <h1 class="ds-title">Permisos base</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo permiso
      </button>
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
            <RouterLink :to="`/permisos-base/${p.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(p.id, p.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo permiso base" @close="showModal = false">
      <BasePermissionForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
