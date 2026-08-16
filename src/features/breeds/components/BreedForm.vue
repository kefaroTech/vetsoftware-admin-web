<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { speciesApi } from '@/features/species/api/species.api'
import type { SpecieResponse } from '@/features/species/types/species.types'
import type { BreedResponse, CreateBreedRequest } from '../types/breeds.types'

const props = defineProps<{
  initial?: BreedResponse | null
}>()

const emit = defineEmits<{
  submit: [data: CreateBreedRequest]
  cancel: []
}>()

const form = ref<CreateBreedRequest>({ name: '', specieId: 0 })
const submitted = ref(false)
const availableSpecies = ref<SpecieResponse[]>([])

const specieOptions = computed(() =>
  availableSpecies.value.map((s) => ({ value: s.id, label: s.name })),
)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  specieId: form.value.specieId ? '' : 'Campo requerido',
}))

onMounted(async () => {
  const data = await speciesApi.listAll()
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
    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="ds-btn ds-btn--primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </button>
    </div>
  </form>
</template>
