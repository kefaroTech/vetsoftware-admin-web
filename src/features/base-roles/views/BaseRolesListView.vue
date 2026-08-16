<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBaseRoles } from '../composables/useBaseRoles'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import BaseRoleForm from '../components/BaseRoleForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateBaseRoleRequest } from '../types/base-roles.types'

const { baseRoles, fetchAll, create, remove } = useBaseRoles()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateBaseRoleRequest) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el rol base "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Roles base</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nuevo rol base
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Obligatorio', 'Fecha creación', 'Acciones']"
      :empty="baseRoles.length === 0"
    >
      <tr v-for="r in baseRoles" :key="r.id">
        <td class="font-weight-medium">{{ r.name }}</td>
        <td class="text-body-2 font-mono">{{ r.code }}</td>
        <td>
          <v-icon
            :icon="r.mandatory ? ICONS.CHECKED : ICONS.UNCHECKED"
            :color="r.mandatory ? 'success' : 'grey-lighten-1'"
            size="small"
          />
        </td>
        <td class="text-caption text-medium-emphasis">{{ r.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/roles-base/${r.id}`"
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
              @click="handleDelete(r.id, r.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo rol base" @close="showModal = false">
      <BaseRoleForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
