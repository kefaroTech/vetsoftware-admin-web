<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import type { BaseRoleResponse, CreateBaseRoleRequest } from '../types/base-roles.types'

const props = defineProps<{
  initial?: BaseRoleResponse | null
}>()

const emit = defineEmits<{
  submit: [data: CreateBaseRoleRequest]
  cancel: []
}>()

const form = ref<CreateBaseRoleRequest>({ name: '', code: '', mandatory: false })
const submitted = ref(false)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  code: form.value.code.trim() ? '' : 'Campo requerido',
}))

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code, mandatory: val.mandatory }
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
      placeholder="Administrador"
      :error="submitted ? errors.name : ''"
    />
    <AppInput
      v-model="form.code"
      label="Código"
      required
      placeholder="ADMIN"
      :error="submitted ? errors.code : ''"
    />
    <AppCheckbox v-model="form.mandatory" label="Obligatorio" />
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
