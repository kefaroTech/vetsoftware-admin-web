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
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Membresías</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nueva membresía
      </v-btn>
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
            <v-btn
              :to="`/membresias/${m.id}`"
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
              @click="handleDelete(m.id, m.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva membresía" @close="showModal = false">
      <MembershipForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
