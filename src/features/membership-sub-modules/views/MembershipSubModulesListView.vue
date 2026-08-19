<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMembershipSubModules } from '../composables/useMembershipSubModules'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import MembershipSubModuleForm from '../components/MembershipSubModuleForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateMembershipSubModuleRequest } from '../types/membership-sub-modules.types'

const { membershipSubModules, fetchAll, create, remove } = useMembershipSubModules()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateMembershipSubModuleRequest) {
  try {
    await create(data)
  } catch {
    // El composable ya avisó del fallo; el modal sigue abierto con lo escrito.
    return
  }
  showModal.value = false
}

async function handleDelete(id: number) {
  const ok = await confirm('¿Eliminar esta asociación membresía-submódulo?')
  if (!ok) return
  try {
    await remove(id)
  } catch {
    // El composable ya avisó del fallo; la fila se queda como estaba.
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Membresías - Submódulos</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva asociación
      </button>
    </div>

    <AppTable
      :headers="['Membresía', 'Submódulo', 'Fecha creación', 'Acciones']"
      :empty="membershipSubModules.length === 0"
    >
      <tr v-for="m in membershipSubModules" :key="m.id">
        <td>{{ m.membership?.name ?? '—' }}</td>
        <td>{{ m.subModule?.name ?? '—' }}</td>
        <td class="text-caption text-medium-emphasis">{{ m.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <RouterLink
              :to="`/membresias-submodulos/${m.id}`"
              class="ds-icon-btn"
              aria-label="Editar"
            >
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(m.id)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal
      :open="showModal"
      title="Nueva asociación membresía-submódulo"
      @close="showModal = false"
    >
      <MembershipSubModuleForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
