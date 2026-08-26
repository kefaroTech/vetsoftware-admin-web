<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { length, maxLength } from '@/composables/validators'
import type { MedicamentResponse } from '../types/medicaments.types'
import type { MedicamentFormData } from '../composables/useMedicaments'

const props = defineProps<{
  initial?: MedicamentResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
  /**
   * Texto del 409 de nombre duplicado, **literal del servidor**. Se pinta en
   * línea sobre el campo que hay que corregir en vez de como aviso efímero:
   * un toast que dice «ya existe» mientras el campo culpable sigue sin marcar
   * obliga a adivinar cuál de los dos campos es.
   */
  serverError?: string
}>()

const emit = defineEmits<{
  submit: [data: MedicamentFormData]
  cancel: []
}>()

/** Límites del contrato: `@Size(max = 200)` y `@Size(max = 500)` en los request. */
const MAX_NOMBRE = 200
const MAX_DESCRIPCION = 500
/** Suelo del front, que el backend NO impone: un nombre de un carácter es una errata. */
const MIN_NOMBRE = 2

const nombreId = useId()
const descripcionId = useId()

const form = ref<MedicamentFormData>({ name: '', description: '' })
const submitted = ref(false)

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

/**
 * Nombre que el servidor rechazó. Sirve para que el mensaje del 409 desaparezca
 * en cuanto el usuario cambia el nombre: dejarlo fijo señalaría como duplicado
 * un nombre que ya no lo es.
 */
const nombreRechazado = ref<string | null>(null)

const errors = computed(() => ({
  name: length(form.value.name, 'El nombre del medicamento', MIN_NOMBRE, MAX_NOMBRE),
  // `@Size(max = 500)` SIN `@NotBlank` en el backend: acepta la descripción
  // vacía, así que el formulario tampoco puede exigirla. Manda el contrato.
  description: maxLength(form.value.description, 'La descripción', MAX_DESCRIPCION),
}))

/**
 * El error de validación solo aparece tras enviar —convención de esta consola,
 * distinta de la del tenant, que valida por `@blur`—; el del servidor aparece
 * en cuanto llega y se retira al editar el campo.
 */
const errorNombre = computed(() => {
  if (submitted.value && errors.value.name) return errors.value.name
  if (props.serverError && form.value.name === nombreRechazado.value) return props.serverError
  return ''
})

watch(
  () => props.serverError,
  (mensaje) => {
    if (!mensaje) return
    nombreRechazado.value = form.value.name
    document.getElementById(nombreId)?.focus()
  },
)

watch(
  () => props.initial,
  (val) => {
    // También resetea cuando `val` es nulo: el modal de creación se reutiliza
    // tras editar, y sin esta rama arrastraba los valores de la ficha anterior.
    form.value = { name: val?.name ?? '', description: val?.description ?? '' }
    submitted.value = false
    nombreRechazado.value = null
    baseline.value = JSON.stringify(form.value)
  },
  { immediate: true },
)

/** FORM-08: lo consulta el padre desde `useUnsavedChangesGuard`. */
function isDirty() {
  return JSON.stringify(form.value) !== baseline.value
}

/**
 * El foco va al primer campo inválido al fallar el envío. Sin esto, el mensaje
 * puede quedar fuera de la vista y el usuario ve que «no pasa nada» al pulsar
 * el botón (WCAG 2.2 §2.4.3; GOV.UK, patrón de validación).
 */
function focusFirstError() {
  const id = errors.value.name ? nombreId : errors.value.description ? descripcionId : null
  if (id) document.getElementById(id)?.focus()
}

function submit() {
  if (props.saving) return
  submitted.value = true
  if (Object.values(errors.value).every((e) => !e)) emit('submit', form.value)
  else focusFirstError()
}

defineExpose({ isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" novalidate @submit.prevent="submit">
    <AppInput
      :id="nombreId"
      v-model="form.name"
      label="Nombre"
      required
      placeholder="Amoxicilina 500 mg"
      :maxlength="MAX_NOMBRE"
      hint="Se comparará sin distinguir mayúsculas ni acentos: «Amoxicilina» y «amoxicilina» son el mismo."
      :error="errorNombre"
    />
    <AppTextarea
      :id="descripcionId"
      v-model="form.description"
      label="Descripción"
      :rows="3"
      placeholder="Antibiótico betalactámico de amplio espectro"
      :maxlength="MAX_DESCRIPCION"
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
