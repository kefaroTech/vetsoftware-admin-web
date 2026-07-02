<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import type { Membership, CreateMembershipCommand } from '../types/memberships.types'

const props = defineProps<{
  initial?: Membership | null
}>()

const emit = defineEmits<{
  submit: [data: CreateMembershipCommand]
  cancel: []
}>()

const form = ref<CreateMembershipCommand>({ name: '', status: 'ACTIVE' })
const submitted = ref(false)

const statusOptions: Array<{ value: CreateMembershipCommand['status']; label: string }> = [
  { value: 'ACTIVE', label: 'Activa' },
  { value: 'INACTIVE', label: 'Inactiva' },
  { value: 'DEPRECATED', label: 'Deprecada' },
]

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  status: form.value.status ? '' : 'Campo requerido',
}))

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, status: val.status }
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
      placeholder="Plan básico"
      :error="submitted ? errors.name : ''"
    />
    <AppSelect
      v-model="form.status"
      label="Estado"
      required
      :options="statusOptions"
      :error="submitted ? errors.status : ''"
    />
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
