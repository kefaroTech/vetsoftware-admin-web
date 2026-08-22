<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { length, maxLength } from '@/composables/validators'
import type { SpaTypeResponse, CreateSpaTypeRequest } from '../types/spa-types.types'

const props = defineProps<{
  initial?: SpaTypeResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateSpaTypeRequest]
  cancel: []
}>()

const form = ref<CreateSpaTypeRequest>({ name: '', description: '' })
const submitted = ref(false)

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

// `@NotBlank` + `@Size(max = 100)` en `name`, y `@Size(max = 500)` SIN
// `@NotBlank` en `description`, de `CreateSpaTypeRequest`. Manda el contrato:
// un tipo de spa puede quedarse sin descripción, así que el formulario no la
// puede exigir — solo acotar su longitud.
const errors = computed(() => ({
  name: length(form.value.name, 'El nombre del tipo de spa', 2, 100),
  description: maxLength(form.value.description, 'La descripción', 500),
}))

watch(
  () => props.initial,
  (val) => {
    form.value = { name: val?.name ?? '', description: val?.description ?? '' }
    submitted.value = false
    baseline.value = JSON.stringify(form.value)
  },
  { immediate: true },
)

/** FORM-08: lo consulta el padre desde `useUnsavedChangesGuard`. */
function isDirty() {
  return JSON.stringify(form.value) !== baseline.value
}

function submit() {
  if (props.saving) return
  submitted.value = true
  if (Object.values(errors.value).every((e) => !e)) emit('submit', form.value)
}

defineExpose({ isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" novalidate @submit.prevent="submit">
    <AppInput
      v-model="form.name"
      label="Nombre"
      required
      placeholder="Baño completo"
      :error="submitted ? errors.name : ''"
    />
    <AppTextarea
      v-model="form.description"
      label="Descripción"
      :rows="3"
      placeholder="Baño con shampoo, secado y cepillado"
      :error="submitted ? errors.description : ''"
    />
    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : initial ? 'Guardar' : 'Crear' }}
      </button>
    </div>
  </form>
</template>
