<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import type { ModuleResponse, CreateModuleRequest } from '../types/modules.types'

const props = defineProps<{
  initial?: ModuleResponse | null
}>()

const emit = defineEmits<{
  submit: [data: CreateModuleRequest]
  cancel: []
}>()

const form = ref<CreateModuleRequest>({ name: '', code: '' })
const submitted = ref(false)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
  code: form.value.code.trim() ? '' : 'Campo requerido',
}))

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name, code: val.code }
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
      placeholder="Gestión de citas"
      :error="submitted ? errors.name : ''"
    />
    <AppInput
      v-model="form.code"
      label="Código"
      required
      placeholder="APPOINTMENTS"
      :error="submitted ? errors.code : ''"
    />
    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="ds-btn ds-btn--primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </button>
    </div>
  </form>
</template>
