<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSpecies } from '../composables/useSpecies'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import SpecieForm from '../components/SpecieForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateSpecieRequest } from '../types/species.types'

const { species, fetchAll, create, remove } = useSpecies()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateSpecieRequest) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar la especie "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Especies</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva especie
      </button>
    </div>

    <AppTable :headers="['Nombre', 'Fecha creación', 'Acciones']" :empty="species.length === 0">
      <tr v-for="s in species" :key="s.id">
        <td class="font-weight-medium">{{ s.name }}</td>
        <td class="text-caption text-medium-emphasis">{{ s.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <RouterLink :to="`/animales/especies/${s.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(s.id, s.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva especie" @close="showModal = false">
      <SpecieForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
