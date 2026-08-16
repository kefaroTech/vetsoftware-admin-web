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
    <div class="ds-head">
      <h1 class="ds-title">Roles base</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo rol base
      </button>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Obligatorio', 'Fecha creación', 'Acciones']"
      :empty="baseRoles.length === 0"
    >
      <tr v-for="r in baseRoles" :key="r.id">
        <td class="font-weight-medium">{{ r.name }}</td>
        <td class="text-body-2 font-mono">{{ r.code }}</td>
        <td>
          <component
            :is="r.mandatory ? ICONS.CHECKED : ICONS.UNCHECKED"
            :size="16"
            :class="r.mandatory ? 'marca marca--si' : 'marca'"
          />
        </td>
        <td class="text-caption text-medium-emphasis">{{ r.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <RouterLink :to="`/roles-base/${r.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(r.id, r.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo rol base" @close="showModal = false">
      <BaseRoleForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>

<style scoped>
.marca {
  color: var(--warm-400);
}
.marca--si {
  color: oklch(55% 0.16 145deg);
}
</style>
