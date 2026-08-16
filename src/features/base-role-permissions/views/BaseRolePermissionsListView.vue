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
import type { CreateBaseRolePermissionRequest } from '../types/base-role-permissions.types'

const { baseRolePermissions, fetchAll, create, remove } = useBaseRolePermissions()
const { publish, isPublishing } = useAdminPermissionPublish()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateBaseRolePermissionRequest) {
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
    <div class="ds-head">
      <h1 class="ds-title">Permisos de roles base</h1>
      <div class="d-flex ga-2">
        <button
          type="button"
          class="ds-btn ds-btn--ghost"
          :disabled="isPublishing"
          @click="handlePublish"
        >
          {{ isPublishing ? 'Publicando…' : 'Publicar permisos a ADMIN' }}
        </button>
        <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
          <component :is="ICONS.ADD" :size="15" />
          Nueva asociación
        </button>
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
            <RouterLink
              :to="`/permisos-roles-base/${p.id}`"
              class="ds-icon-btn"
              aria-label="Editar"
            >
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(p.id)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva asociación rol-permiso" @close="showModal = false">
      <BaseRolePermissionForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
