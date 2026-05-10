<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DiagnosticImagingType } from '../types/diagnostic-imaging-types.types'
import type { DiagnosticImagingTypeFormData } from '../composables/useDiagnosticImagingTypes'

const props = defineProps<{
  initial?: DiagnosticImagingType | null
}>()

const emit = defineEmits<{
  submit: [data: DiagnosticImagingTypeFormData]
  cancel: []
}>()

const form = ref<DiagnosticImagingTypeFormData>({ name: '', description: '' })
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
        placeholder="Radiografía digital"
        :rules="[requiredRule]"
      />
      <v-textarea
        v-model="form.description"
        label="Descripción"
        placeholder="Imagen radiológica digital"
        rows="3"
        auto-grow
        :rules="[requiredRule]"
      />
      <v-alert type="info" variant="tonal" density="compact" class="mt-1">
        Este catálogo crea tipos globales disponibles para todas las empresas.
      </v-alert>
      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary">
          {{ initial ? 'Guardar' : 'Crear' }}
        </v-btn>
      </div>
    </div>
  </v-form>
</template>
