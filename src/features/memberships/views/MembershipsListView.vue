<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMemberships } from '../composables/useMemberships'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import MembershipStatusBadge from '../components/MembershipStatusBadge.vue'
import type { CreateMembershipCommand } from '../types/memberships.types'

const { memberships, loading, fetchAll, create, remove } = useMemberships()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)
const newName = ref('')

onMounted(fetchAll)

async function handleCreate() {
  if (!newName.value.trim()) return
  formLoading.value = true
  try {
    await create({ name: newName.value } as CreateMembershipCommand)
    showModal.value = false
    newName.value = ''
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
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Membresías</h1>
      <AppButton @click="showModal = true">+ Nueva membresía</AppButton>
    </div>

    <AppTable
      :headers="['Nombre', 'Estado', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="memberships.length === 0"
    >
      <tr v-for="m in memberships" :key="m.id" class="border-t border-gray-100 hover:bg-gray-50">
        <td class="px-4 py-3 font-medium text-gray-900">{{ m.name }}</td>
        <td class="px-4 py-3"><MembershipStatusBadge :status="m.status" /></td>
        <td class="px-4 py-3 text-xs text-gray-500">{{ m.createdDate }}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <RouterLink :to="`/membresias/${m.id}`" class="text-xs text-indigo-600 hover:underline">Editar</RouterLink>
            <button class="text-xs text-red-500 hover:underline" @click="handleDelete(m.id, m.name)">Eliminar</button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva membresía" @close="showModal = false">
      <form class="flex flex-col gap-4" @submit.prevent="handleCreate">
        <AppInput v-model="newName" label="Nombre" placeholder="Plan básico" />
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton type="submit" :loading="formLoading">Crear</AppButton>
        </div>
      </form>
    </AppModal>
  </AppLayout>
</template>
