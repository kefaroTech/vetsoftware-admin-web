<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMembershipSubModules } from '../composables/useMembershipSubModules'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import MembershipSubModuleForm from '../components/MembershipSubModuleForm.vue'
import type { CreateMembershipSubModuleCommand } from '../types/membership-sub-modules.types'

const { membershipSubModules, loading, fetchAll, create, remove } = useMembershipSubModules()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateMembershipSubModuleCommand) {
  formLoading.value = true
  try {
    await create(data)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number) {
  const ok = await confirm('¿Eliminar esta asociación membresía-submódulo?')
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Membresías - Submódulos</h1>
      <AppButton @click="showModal = true">+ Nueva asociación</AppButton>
    </div>

    <AppTable
      :headers="['Membresía ID', 'Submódulo ID', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="membershipSubModules.length === 0"
    >
      <tr
        v-for="m in membershipSubModules"
        :key="m.id"
        class="border-t border-gray-100 hover:bg-gray-50"
      >
        <td class="px-4 py-3 text-sm text-gray-900">{{ m.membershipId }}</td>
        <td class="px-4 py-3 text-sm text-gray-900">{{ m.subModuleId }}</td>
        <td class="px-4 py-3 text-xs text-gray-500">{{ m.createdDate }}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <RouterLink
              :to="`/membresias-submodulos/${m.id}`"
              class="text-xs text-indigo-600 hover:underline"
            >
              Editar
            </RouterLink>
            <button
              class="text-xs text-red-500 hover:underline"
              @click="handleDelete(m.id)"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva asociación membresía-submódulo" @close="showModal = false">
      <MembershipSubModuleForm
        :loading="formLoading"
        @submit="handleCreate"
        @cancel="showModal = false"
      />
    </AppModal>
  </AppLayout>
</template>
