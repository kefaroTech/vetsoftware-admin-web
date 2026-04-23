<script setup lang="ts">
import { ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { Company, CreateCompanyCommand } from '../types/companies.types'

const props = defineProps<{
  initial?: Company | null
  loading?: boolean
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

watch(
  () => props.initial,
  (val) => {
    if (val) {
      form.value = { name: val.name, identifier: val.identifier, address: val.address, contactNumber: val.contactNumber }
    }
  },
  { immediate: true },
)
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', form)">
    <AppInput v-model="form.name" label="Nombre" placeholder="Clínica Veterinaria Ejemplo" />
    <AppInput v-model="form.identifier" label="Identificador" placeholder="CVE-001" />
    <AppInput v-model="form.address" label="Dirección" placeholder="Calle 123" />
    <AppInput v-model="form.contactNumber" label="Teléfono" placeholder="+57 300 000 0000" />
    <div class="flex justify-end gap-2">
      <AppButton variant="secondary" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton type="submit" :loading="loading">{{ initial ? 'Guardar' : 'Crear' }}</AppButton>
    </div>
  </form>
</template>
