<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAnimalColors } from '../composables/useAnimalColors'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AnimalColorForm from '../components/AnimalColorForm.vue'
import { speciesApi } from '@/features/species/api/species.api'
import type { SpecieResponse } from '@/features/species/types/species.types'
import { ICONS } from '@/constants/icons'
import type { CreateAnimalColorRequest } from '../types/animal-colors.types'

const { colors, fetchAll, fetchBySpecie, create, remove } = useAnimalColors()
const { confirm } = useConfirmDialog()
const showModal = ref(false)

const availableSpecies = ref<SpecieResponse[]>([])
const specieFilter = ref(0)

const specieFilterOptions = computed(() => [
  { value: 0, label: 'Todas las especies' },
  ...availableSpecies.value.map((s) => ({ value: s.id, label: s.name })),
])

function reload() {
  return specieFilter.value ? fetchBySpecie(specieFilter.value) : fetchAll()
}

onMounted(async () => {
  const data = await speciesApi.listAll()
  availableSpecies.value = data
  await reload()
})

watch(specieFilter, reload)

async function handleCreate(data: CreateAnimalColorRequest) {
  await create(data)
  showModal.value = false
  // El color creado puede no pertenecer a la especie filtrada; releemos para no mostrarlo fuera.
  await reload()
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

    <div class="mb-4" style="max-width: 280px">
      <AppSelect v-model="specieFilter" label="Especie" :options="specieFilterOptions" />
    </div>

    <AppTable
      :headers="['Nombre', 'Especie', 'Fecha creación', 'Acciones']"
      :empty="colors.length === 0"
    >
      <tr v-for="c in colors" :key="c.id">
        <td class="font-weight-medium">{{ c.name }}</td>
        <td class="text-body-2">{{ c.specie?.name }}</td>
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
