<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBreeds } from '../composables/useBreeds'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import BreedForm from '../components/BreedForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateBreedRequest } from '../types/breeds.types'

const { breeds, fetchAll, create, remove } = useBreeds()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateBreedRequest) {
  await create(data)
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar la raza "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Razas</h1>
      <v-btn color="primary" :prepend-icon="ICONS.ADD" @click="showModal = true">
        Nueva raza
      </v-btn>
    </div>

    <AppTable
      :headers="['Nombre', 'Especie', 'Fecha creación', 'Acciones']"
      :empty="breeds.length === 0"
    >
      <tr v-for="b in breeds" :key="b.id">
        <td class="font-weight-medium">{{ b.name }}</td>
        <td class="text-body-2">{{ b.specie?.name }}</td>
        <td class="text-caption text-medium-emphasis">{{ b.createdDate }}</td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/animales/razas/${b.id}`"
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
              @click="handleDelete(b.id, b.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva raza" @close="showModal = false">
      <BreedForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
