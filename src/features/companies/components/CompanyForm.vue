<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { length } from '@/composables/validators'
import type { CompanyResponse, CreateCompanyRequest } from '../types/companies.types'

const props = defineProps<{
  initial?: CompanyResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateCompanyRequest]
  cancel: []
}>()

const VACIO: CreateCompanyRequest = { name: '', identifier: '', address: '', contactNumber: '' }

const form = ref<CreateCompanyRequest>({ ...VACIO })
const submitted = ref(false)

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

// `@NotBlank` + `@Size` de `CreateCompanyRequest` en el backend: nombre 100,
// identificador 50, dirección 255, teléfono 30. Los dos últimos no llevan
// `@NotBlank`, así que aquí tampoco son obligatorios.
const errors = computed(() => ({
  name: length(form.value.name, 'El nombre de la empresa', 2, 100),
  identifier: length(form.value.identifier, 'El identificador', 2, 50),
}))

watch(
  () => props.initial,
  (val) => {
    form.value = val
      ? {
          name: val.name,
          identifier: val.identifier,
          // TR-01: el backend puede devolverlos nulos y el formulario los edita como texto.
          address: val.address ?? '',
          contactNumber: val.contactNumber ?? '',
        }
      : { ...VACIO }
    submitted.value = false
    baseline.value = JSON.stringify(form.value)
  },
  { immediate: true },
)

function onContact(v: string) {
  form.value.contactNumber = v.replace(/[^+\d\s()-]/g, '')
}

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
      placeholder="Clínica Veterinaria Ejemplo"
      :error="submitted ? errors.name : undefined"
    />
    <AppInput
      v-model="form.identifier"
      label="Identificador"
      required
      placeholder="CVE-001"
      :error="submitted ? errors.identifier : undefined"
    />
    <!-- El placeholder enseña el formato de dirección corriente en Colombia; el
         anterior («Calle 123») no mostraba ni el `#` ni el número de placa, así
         que no se leía como una dirección real. -->
    <AppInput v-model="form.address" label="Dirección" placeholder="Cra 7 # 45-12" />
    <!-- Sin `+57`: el país es único y el prefijo internacional gasta cuatro
         caracteres para no informar de nada. Agrupación 3-3-4, que es como se
         dicta un número en Colombia. El sanitizador de arriba admite espacios,
         así que el formato que se enseña es el que el campo acepta. -->
    <AppInput
      :model-value="form.contactNumber"
      label="Teléfono"
      placeholder="300 123 4567"
      inputmode="tel"
      @update:model-value="onContact"
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
