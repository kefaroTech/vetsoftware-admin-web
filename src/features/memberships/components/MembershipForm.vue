<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import { length, selection } from '@/composables/validators'
import { MEMBERSHIP_STATUS_LABELS } from '../types/memberships.types'
import type { MembershipResponse, CreateMembershipRequest } from '../types/memberships.types'

const props = defineProps<{
  initial?: MembershipResponse | null
  /**
   * FORM-09: lo controla el padre mientras la mutación está en vuelo. Bloquea
   * el reenvío y también «Cancelar»: cancelar a mitad de un POST deja al
   * usuario sin saber si se guardó.
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateMembershipRequest]
  cancel: []
}>()

const form = ref<CreateMembershipRequest>({ name: '', status: 'ACTIVE', mandatory: false })
const submitted = ref(false)

/** Copia del estado con el que se abrió el formulario, para saber si está sucio. */
const baseline = ref('')

// El orden es el del desplegable; las etiquetas salen del único sitio donde
// viven, para que no se separen de las que pinta la tabla.
const statusOptions: { value: CreateMembershipRequest['status']; label: string }[] = (
  ['ACTIVE', 'INACTIVE', 'DEPRECATED'] as const
).map((value) => ({ value, label: MEMBERSHIP_STATUS_LABELS[value] }))

// `@NotBlank` + `@Size(max = 100)` en `name` y `@NotBlank` en `status`, de
// `CreateMembershipRequest` en el backend.
const errors = computed(() => ({
  name: length(form.value.name, 'El nombre de la membresía', 2, 100),
  status: selection(form.value.status, 'el estado'),
  // `mandatory` es un booleano: no hay estado invalido que validar. Mismo criterio
  // que en `BaseRoleForm`, que lleva el checkbox equivalente desde siempre.
}))

watch(
  () => props.initial,
  (val) => {
    // `mandatory` se arrastra del valor real, no de un `false` inventado: el contrato lo
    // declara y el `boolean` primitivo del backend convierte «no lo mando» en «ponlo a
    // false». Sin esta linea, editar el nombre de la membresia por defecto la desmarcaba y
    // dejaba el auto-registro publico sin plan que asignar.
    form.value = {
      name: val?.name ?? '',
      status: val?.status ?? 'ACTIVE',
      mandatory: val?.mandatory ?? false,
    }
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
      placeholder="Plan básico"
      :error="submitted ? errors.name : undefined"
    />
    <AppSelect
      v-model="form.status"
      label="Estado"
      required
      :options="statusOptions"
      :error="submitted ? errors.status : undefined"
    />
    <AppCheckbox
      v-model="form.mandatory"
      label="Obligatoria (se asigna a las empresas que se registran solas)"
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
