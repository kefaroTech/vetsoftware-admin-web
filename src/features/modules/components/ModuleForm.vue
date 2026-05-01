<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AppModule, CreateModuleCommand } from '../types/modules.types'

const props = defineProps<{
  initial?: AppModule | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateModuleCommand]
  cancel: []
}>()

const form = ref<CreateModuleCommand>({ name: '', code: '' })
const formValid = ref(false)
const requiredRule = (v: string) => !!v || 'Campo requerido'

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code }
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
        placeholder="Gestión de citas"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.code"
        label="Código"
        placeholder="APPOINTMENTS"
        :rules="[requiredRule]"
      />
      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
        <v-btn type="submit" color="primary" :loading="loading">
          {{ initial ? 'Guardar' : 'Crear' }}
        </v-btn>
      </div>
    </div>
  </v-form>
</template>
