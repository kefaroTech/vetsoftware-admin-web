<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Company, CreateCompanyCommand } from '../types/companies.types'

const props = defineProps<{
  initial?: Company | null
}>()

const emit = defineEmits<{
  submit: [data: CreateCompanyCommand]
  cancel: []
}>()

const form = ref<CreateCompanyCommand>({
  name: '',
  identifier: '',
  address: '',
  contactNumber: '',
})

const formValid = ref(false)

const requiredRule = (v: string) => !!v || 'Campo requerido'

watch(
  () => props.initial,
  (val) => {
    if (val) {
      form.value = {
        name: val.name,
        identifier: val.identifier,
        address: val.address,
        contactNumber: val.contactNumber,
      }
    }
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
        placeholder="Clínica Veterinaria Ejemplo"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.identifier"
        label="Identificador"
        placeholder="CVE-001"
        :rules="[requiredRule]"
      />
      <v-text-field
        v-model="form.address"
        label="Dirección"
        placeholder="Calle 123"
      />
      <v-text-field
        v-model="form.contactNumber"
        label="Teléfono"
        placeholder="+57 300 000 0000"
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
