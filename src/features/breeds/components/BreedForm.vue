<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
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
const formValid = ref(false)
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const availableSpecies = ref<Specie[]>([])

const requiredRule = (v: string) => !!v || 'Campo requerido'

onMounted(async () => {
  const { data } = await speciesApi.list()
  availableSpecies.value = data
  if (!props.initial && data.length > 0) form.value.specieId = data[0].id
})

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, specieId: val.specie?.id ?? 0 }
  },
  { immediate: true },
)

async function submit() {
  const { valid } = (await formRef.value?.validate()) ?? { valid: false }
  if (valid) emit('submit', form.value)
}
</script>

<template>
  <v-form ref="formRef" v-model="formValid" @submit.prevent="submit">
    <div class="d-flex flex-column ga-3">
      <v-text-field
        v-model="form.name"
        label="Nombre *"
        placeholder="Labrador"
        :rules="[requiredRule]"
      />
      <v-select
        v-model="form.specieId"
        label="Especie *"
        :items="availableSpecies"
        item-title="name"
        item-value="id"
        :rules="[(v) => !!v || 'Campo requerido']"
      />
      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary">
          {{ initial ? 'Guardar' : 'Crear' }}
        </v-btn>
      </div>
    </div>
  </v-form>
</template>
