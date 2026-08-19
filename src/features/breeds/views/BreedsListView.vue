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
  try {
    await create(data)
  } catch {
    // El composable ya avisó del fallo; el modal sigue abierto con lo escrito.
    return
  }
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar la raza "${name}"?`)
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
      <h1 class="ds-title">Razas</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva raza
      </button>
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
            <RouterLink :to="`/animales/razas/${b.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(b.id, b.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nueva raza" @close="showModal = false">
      <BreedForm @submit="handleCreate" @cancel="showModal = false" />
    </AppModal>
  </AppLayout>
</template>
