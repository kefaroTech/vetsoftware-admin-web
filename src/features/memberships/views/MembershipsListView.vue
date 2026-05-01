<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMemberships } from '../composables/useMemberships'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import MembershipStatusBadge from '../components/MembershipStatusBadge.vue'
import MembershipForm from '../components/MembershipForm.vue'
import type { CreateMembershipCommand } from '../types/memberships.types'

const { memberships, loading, fetchAll, create, remove } = useMemberships()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateMembershipCommand) {
  formLoading.value = true
  try {
    await create(data)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
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
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showModal = true">
        Nueva membresía
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Estado', 'Fecha creación', 'Acciones']"
      :loading="loading"
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
              icon="mdi-pencil"
            />
            <v-btn
              size="small"
              variant="text"
              color="error"
              icon="mdi-delete"
              @click="handleDelete(m.id, m.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva membresía" @close="showModal = false">
      <MembershipForm :loading="formLoading" @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
