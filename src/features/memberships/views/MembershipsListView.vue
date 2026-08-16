<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMemberships } from '../composables/useMemberships'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import MembershipStatusBadge from '../components/MembershipStatusBadge.vue'
import MembershipForm from '../components/MembershipForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateMembershipRequest } from '../types/memberships.types'

const { memberships, fetchAll, create, remove } = useMemberships()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateMembershipRequest) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar la membresía "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Membresías</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva membresía
      </button>
    </div>

    <AppTable
      :headers="['Nombre', 'Estado', 'Fecha creación', 'Acciones']"
      :empty="memberships.length === 0"
    >
      <tr v-for="m in memberships" :key="m.id">
        <td class="font-weight-medium">{{ m.name }}</td>
        <td><MembershipStatusBadge :status="m.status" /></td>
        <td class="text-caption text-medium-emphasis">{{ m.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <RouterLink :to="`/membresias/${m.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(m.id, m.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva membresía" @close="showModal = false">
      <MembershipForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
