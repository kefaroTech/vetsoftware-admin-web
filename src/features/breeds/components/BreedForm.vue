<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { speciesApi } from '@/features/species/api/species.api'
import type { Specie } from '@/features/species/types/species.types'
import type { Breed, CreateBreedCommand } from '../types/breeds.types'

const props = defineProps<{
  initial?: Breed | null
}>()

const emit = defineEmits<{
  submit: [data: CreateBreedCommand]
  cancel: []
}>()

const form = ref<CreateBreedCommand>({ name: '', specieId: 0 })
const submitted = ref(false)
const availableSpecies = ref<Specie[]>([])

const specieOptions = computed(() =>
  availableSpecies.value.map((s) => ({ value: s.id, label: s.name })),
)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  specieId: form.value.specieId ? '' : 'Campo requerido',
}))

onMounted(async () => {
  const { data } = await speciesApi.list()
  availableSpecies.value = data
  const first = data[0]
  if (!props.initial && first) form.value.specieId = first.id
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, specieId: val.specie?.id ?? 0 }
  },
  { immediate: true },
)

function submit() {
  submitted.value = true
  if (Object.values(errors.value).every((e) => !e)) emit('submit', form.value)
}
</script>

<template>
  <form class="app-form" novalidate @submit.prevent="submit">
    <AppInput
      v-model="form.name"
      label="Nombre"
      required
      placeholder="Labrador"
      :error="submitted ? errors.name : ''"
    />
    <AppSelect
      v-model="form.specieId"
      label="Especie"
      required
      :options="specieOptions"
      :error="submitted ? errors.specieId : ''"
    />
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
