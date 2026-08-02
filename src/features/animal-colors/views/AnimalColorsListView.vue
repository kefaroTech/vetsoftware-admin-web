<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAnimalColors } from '../composables/useAnimalColors'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AnimalColorForm from '../components/AnimalColorForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateAnimalColorCommand } from '../types/animal-colors.types'

const { colors, fetchAll, create, remove } = useAnimalColors()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateAnimalColorCommand) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar el color "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Colores</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nuevo color
      </v-btn>
    </div>

    <AppTable :headers="['Nombre', 'Fecha creación', 'Acciones']" :empty="colors.length === 0">
      <tr v-for="c in colors" :key="c.id">
        <td class="font-weight-medium">{{ c.name }}</td>
        <td class="text-caption text-medium-emphasis">{{ c.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/animales/colores/${c.id}`"
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
              @click="handleDelete(c.id, c.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo color" @close="showModal = false">
      <AnimalColorForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
