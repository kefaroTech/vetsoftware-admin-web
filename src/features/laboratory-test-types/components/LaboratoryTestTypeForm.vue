<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import type { LaboratoryTestTypeResponse } from '../types/laboratory-test-types.types'
import type { LaboratoryTestTypeFormData } from '../composables/useLaboratoryTestTypes'

const props = defineProps<{
  initial?: LaboratoryTestTypeResponse | null
}>()

const emit = defineEmits<{
  submit: [data: LaboratoryTestTypeFormData]
  cancel: []
}>()

const form = ref<LaboratoryTestTypeFormData>({ name: '', description: '' })
const submitted = ref(false)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  description: form.value.description.trim() ? '' : 'Campo requerido',
}))

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, description: val.description }
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
      placeholder="Hemograma completo"
      :error="submitted ? errors.name : ''"
    />
    <AppTextarea
      v-model="form.description"
      label="Descripción"
      required
      :rows="3"
      placeholder="Conteo y análisis de células sanguíneas"
      :error="submitted ? errors.description : ''"
    />
    <div class="app-note">
      Este catálogo crea tipos globales disponibles para todas las empresas.
    </div>
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
