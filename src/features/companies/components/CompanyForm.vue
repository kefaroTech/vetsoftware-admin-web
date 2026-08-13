<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
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
const submitted = ref(false)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  identifier: form.value.identifier.trim() ? '' : 'Campo requerido',
}))

watch(
  () => props.initial,
  (val) => {
    if (val) {
      form.value = {
        name: val.name,
        identifier: val.identifier,
        // TR-01: el backend puede devolverlos nulos y el formulario los edita como texto.
        address: val.address ?? '',
        contactNumber: val.contactNumber ?? '',
      }
    }
  },
  { immediate: true },
)

function onContact(v: string) {
  form.value.contactNumber = v.replace(/[^+\d\s()-]/g, '')
}

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
      placeholder="Clínica Veterinaria Ejemplo"
      :error="submitted ? errors.name : ''"
    />
    <AppInput
      v-model="form.identifier"
      label="Identificador"
      required
      placeholder="CVE-001"
      :error="submitted ? errors.identifier : ''"
    />
    <AppInput v-model="form.address" label="Dirección" placeholder="Calle 123" />
    <AppInput
      :model-value="form.contactNumber"
      label="Teléfono"
      placeholder="+57 300 000 0000"
      inputmode="tel"
      @update:model-value="onContact"
    />
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
