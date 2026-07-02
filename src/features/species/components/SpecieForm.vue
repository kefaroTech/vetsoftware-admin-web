<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import type { Specie, CreateSpecieCommand } from '../types/species.types'

const props = defineProps<{
  initial?: Specie | null
}>()

const emit = defineEmits<{
  submit: [data: CreateSpecieCommand]
  cancel: []
}>()

const form = ref<CreateSpecieCommand>({ name: '' })
const submitted = ref(false)

const errors = computed(() => ({
  name: form.value.name.trim() ? '' : 'Campo requerido',
}))

watch(
  () => props.initial,
  (val) => {
    if (val) form.value = { name: val.name }
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
      placeholder="Canino"
      :error="submitted ? errors.name : ''"
    />
    <div class="app-form__actions">
      <v-btn variant="text" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn type="submit" color="primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </v-btn>
    </div>
  </form>
</template>
