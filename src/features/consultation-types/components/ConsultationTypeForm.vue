<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ConsultationType, CreateConsultationTypeCommand } from '../types/consultation-types.types'

const props = defineProps<{
  initial?: ConsultationType | null
}>()

const emit = defineEmits<{
  submit: [data: CreateConsultationTypeCommand]
  cancel: []
}>()

const form = ref<CreateConsultationTypeCommand>({ name: '', description: '' })
const formValid = ref(false)
const requiredRule = (v: string) => !!v || 'Campo requerido'

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, description: val.description }
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
        placeholder="Consulta general"
        :rules="[requiredRule]"
      />
      <v-textarea
        v-model="form.description"
        label="Descripción"
        placeholder="Atención clínica general para evaluación inicial"
        rows="3"
        auto-grow
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
