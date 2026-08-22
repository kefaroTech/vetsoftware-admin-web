<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { length, maxLength } from '@/composables/validators'
import { ICONS } from '@/constants/icons'
import type { DiagnosticImagingTypeResponse } from '../types/diagnostic-imaging-types.types'
import type { DiagnosticImagingTypeFormData } from '../composables/useDiagnosticImagingTypes'

const props = defineProps<{
  initial?: DiagnosticImagingTypeResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: DiagnosticImagingTypeFormData]
  cancel: []
}>()

const form = ref<DiagnosticImagingTypeFormData>({ name: '', description: '' })
const submitted = ref(false)

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

const errors = computed(() => ({
  // `@NotBlank` + `@Size(max = 100)` de `CreateDiagnosticImagingTypeRequest` en el backend.
  name: length(form.value.name, 'El nombre del tipo de estudio', 2, 100),
  // `@Size(max = 500)` SIN `@NotBlank` en el backend: acepta la descripción vacía,
  // así que el formulario tampoco puede exigirla. Manda el contrato, no el front.
  description: maxLength(form.value.description, 'La descripción', 500),
}))

watch(
  () => props.initial,
  (val) => {
    // También resetea cuando `val` es nulo: el modal de creación se reutiliza
    // tras editar, y sin esta rama arrastraba los valores de la ficha anterior.
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
      placeholder="Radiografía digital"
      :error="submitted ? errors.name : ''"
    />
    <AppTextarea
      v-model="form.description"
      label="Descripción"
      :rows="3"
      placeholder="Imagen radiológica digital"
      :error="submitted ? errors.description : ''"
    />
    <p class="ds-banner ds-banner--info ds-banner--sm" role="note">
      <component :is="ICONS.INFO" :size="14" class="ds-banner-icon" />
      <span>Este catálogo crea tipos globales disponibles para todas las empresas.</span>
    </p>
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
