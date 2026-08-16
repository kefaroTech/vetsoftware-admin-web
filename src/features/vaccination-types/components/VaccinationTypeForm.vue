<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import type { VaccinationTypeResponse } from '../types/vaccination-types.types'
import type { VaccinationTypeFormData } from '../composables/useVaccinationTypes'

const props = defineProps<{
  initial?: VaccinationTypeResponse | null
}>()

const emit = defineEmits<{
  submit: [data: VaccinationTypeFormData]
  cancel: []
}>()

const form = ref<VaccinationTypeFormData>({ name: '', description: '' })
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
      placeholder="Triple felina"
      :error="submitted ? errors.name : ''"
    />
    <AppTextarea
      v-model="form.description"
      label="Descripción"
      required
      :rows="3"
      placeholder="Vacuna trivalente para felinos"
      :error="submitted ? errors.description : ''"
    />
    <div class="app-note">
      Este catálogo crea tipos globales disponibles para todas las empresas.
    </div>
    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="ds-btn ds-btn--primary">
        {{ initial ? 'Guardar' : 'Crear' }}
      </button>
    </div>
  </form>
</template>
