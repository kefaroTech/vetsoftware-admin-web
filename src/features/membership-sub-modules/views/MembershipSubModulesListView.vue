<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMembershipSubModules } from '../composables/useMembershipSubModules'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import MembershipSubModuleForm from '../components/MembershipSubModuleForm.vue'
import { ICONS } from '@/constants/icons'
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
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Membresías - Submódulos</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nueva asociación
      </v-btn>
    </div>

    <AppTable
      :headers="['Membresía', 'Submódulo', 'Fecha creación', 'Acciones']"
      :loading="loading"
      :empty="membershipSubModules.length === 0"
    >
      <tr v-for="m in membershipSubModules" :key="m.id">
        <td>{{ m.membership?.name ?? '—' }}</td>
        <td>{{ m.subModule?.name ?? '—' }}</td>
        <td class="text-caption text-medium-emphasis">{{ m.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/membresias-submodulos/${m.id}`"
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
              @click="handleDelete(m.id)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal
      :open="showModal"
      title="Nueva asociación membresía-submódulo"
      @close="showModal = false"
    >
      <MembershipSubModuleForm
        :loading="formLoading"
        @submit="handleCreate"
        @cancel="showModal = false"
      />
    </AppModal>
  </AppLayout>
</template>
