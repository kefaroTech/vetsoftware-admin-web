<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { length } from '@/composables/validators'
import type { ModuleResponse, CreateModuleRequest } from '../types/modules.types'

const props = defineProps<{
  initial?: ModuleResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateModuleRequest]
  cancel: []
}>()

/** Estado inicial vacío, compartido por el montaje y por el reseteo del `watch`. */
function emptyForm(): CreateModuleRequest {
  return { name: '', code: '' }
}

const form = ref<CreateModuleRequest>(emptyForm())
const submitted = ref(false)

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

// `@NotBlank` + `@Size(max = …)` de `CreateModuleRequest` en el backend.
const errors = computed(() => ({
  name: length(form.value.name, 'El nombre del módulo', 2, 100),
  code: length(form.value.code, 'El código del módulo', 2, 50),
}))

watch(
  () => props.initial,
  (val) => {
    // También cuando `val` es nulo: el modal de creación se reutiliza tras
    // haber editado, y sin este reseteo reabriría con lo de la ficha anterior.
    form.value = val ? { name: val.name, code: val.code } : emptyForm()
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
      placeholder="Gestión de citas"
      :error="submitted ? errors.name : undefined"
    />
    <AppInput
      v-model="form.code"
      label="Código"
      required
      placeholder="APPOINTMENTS"
      :error="submitted ? errors.code : undefined"
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
