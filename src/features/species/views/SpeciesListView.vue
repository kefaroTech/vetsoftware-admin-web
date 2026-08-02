<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSpecies } from '../composables/useSpecies'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import SpecieForm from '../components/SpecieForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateSpecieCommand } from '../types/species.types'

const { species, fetchAll, create, remove } = useSpecies()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateSpecieCommand) {
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
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Especies</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nueva especie
      </v-btn>
    </div>

    <AppTable :headers="['Nombre', 'Fecha creación', 'Acciones']" :empty="species.length === 0">
      <tr v-for="s in species" :key="s.id">
        <td class="font-weight-medium">{{ s.name }}</td>
        <td class="text-caption text-medium-emphasis">{{ s.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/animales/especies/${s.id}`"
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
              @click="handleDelete(s.id, s.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva especie" @close="showModal = false">
      <SpecieForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
