<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useModules } from '../composables/useModules'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ModuleForm from '../components/ModuleForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateModuleRequest } from '../types/modules.types'

const { modules, fetchAll, create, remove } = useModules()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateModuleRequest) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el módulo "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Módulos</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo módulo
      </button>
    </div>

    <AppTable
      :headers="['Nombre', 'Código', 'Fecha creación', 'Acciones']"
      :empty="modules.length === 0"
    >
      <tr v-for="m in modules" :key="m.id">
        <td class="font-weight-medium">{{ m.name }}</td>
        <td class="text-body-2 font-mono">{{ m.code }}</td>
        <td class="text-caption text-medium-emphasis">{{ m.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <RouterLink :to="`/modulos/${m.id}`" class="ds-icon-btn" aria-label="Editar">
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

    <AppModal :open="showModal" title="Nuevo módulo" @close="showModal = false">
      <ModuleForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
