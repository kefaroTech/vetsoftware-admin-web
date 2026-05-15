<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBaseRolePermissions } from '../composables/useBaseRolePermissions'
import { useAdminPermissionPublish } from '../composables/useAdminPermissionPublish'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import BaseRolePermissionForm from '../components/BaseRolePermissionForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateBaseRolePermissionCommand } from '../types/base-role-permissions.types'

const { baseRolePermissions, fetchAll, create, remove } = useBaseRolePermissions()
const { publish, isPublishing } = useAdminPermissionPublish()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateBaseRolePermissionCommand) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number) {
  const ok = await confirm('¿Eliminar esta asociación rol-permiso?')
  if (ok) await remove(id)
}

async function handlePublish() {
  const ok = await confirm(
    'Esto sincronizará el rol ADMIN de todas las companies con el catálogo actual de permisos. ¿Continuar?',
  )
  if (ok) await publish()
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Permisos de roles base</h1>
      <div class="d-flex ga-2">
        <v-btn
          color="secondary"
          variant="outlined"
          :loading="isPublishing"
          :disabled="isPublishing"
          @click="handlePublish"
        >
          Publicar permisos a ADMIN
        </v-btn>
        <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
          Nueva asociación
        </v-btn>
      </div>
    </div>

    <AppTable
      :headers="['Rol base', 'Permiso base', 'Fecha creación', 'Acciones']"
      :empty="baseRolePermissions.length === 0"
    >
      <tr v-for="p in baseRolePermissions" :key="p.id">
        <td>{{ p.baseRole?.name ?? '—' }}</td>
        <td>{{ p.basePermission?.name ?? '—' }}</td>
        <td class="text-caption text-medium-emphasis">{{ p.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/permisos-roles-base/${p.id}`"
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
              @click="handleDelete(p.id)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva asociación rol-permiso" @close="showModal = false">
      <BaseRolePermissionForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
