<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Specie, CreateSpecieCommand } from '../types/species.types'

const props = defineProps<{
  initial?: Specie | null
}>()

const emit = defineEmits<{
  submit: [data: CreateSpecieCommand]
  cancel: []
}>()

const form = ref<CreateSpecieCommand>({ name: '' })
const formValid = ref(false)
const requiredRule = (v: string) => !!v || 'Campo requerido'

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name }
  },
  { immediate: true },
)

function submit() {
  if (formValid.value) emit('submit', form.value)
}
</script>

<template>
  <v-form v-model="formValid" @submit.prevent="submit">
    <div class="d-flex flex-column ga-3">
      <v-text-field
        v-model="form.name"
        label="Nombre"
        placeholder="Canino"
        :rules="[requiredRule]"
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
