<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { length, maxLength } from '@/composables/validators'
import type {
  ConfiguratorOptionResponse,
  CreateConfiguratorOptionRequest,
  UpdateConfiguratorOptionRequest,
} from '../types/configurator.types'

/**
 * Alta y edición de una respuesta posible de una pregunta.
 *
 * Misma convención que `ConfiguratorQuestionForm.vue`. El `label` es lo que lee
 * el prospecto y también lo que aparece en la frase del efecto, así que un
 * rótulo vago —«Sí»— deja el efecto ilegible: por eso la ayuda del campo pide
 * una respuesta que se entienda fuera de su pregunta.
 */
const props = defineProps<{
  initial?: ConfiguratorOptionResponse | null
  questionText: string
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [
    payload: Omit<CreateConfiguratorOptionRequest, 'questionId'> | UpdateConfiguratorOptionRequest,
  ]
  cancel: []
}>()

interface FormState {
  code: string
  label: string
  helpText: string
  sortOrder: string
}

type Field = keyof FormState

const uid = useId()
const ids: Record<Field, string> = {
  code: `${uid}-code`,
  label: `${uid}-label`,
  helpText: `${uid}-help-text`,
  sortOrder: `${uid}-sort-order`,
}
const ORDER: Field[] = ['code', 'label', 'helpText', 'sortOrder']

const form = reactive<FormState>({ code: '', label: '', helpText: '', sortOrder: '0' })
const touched = reactive<Record<Field, boolean>>({
  code: false,
  label: false,
  helpText: false,
  sortOrder: false,
})
const summaryRef = ref<InstanceType<typeof ErrorSummary> | null>(null)
const baseline = ref('')

function reset(initial?: ConfiguratorOptionResponse | null) {
  Object.assign(form, {
    code: initial?.code ?? '',
    label: initial?.label ?? '',
    helpText: initial?.helpText ?? '',
    sortOrder: String(initial?.sortOrder ?? 0),
  })
  for (const key of Object.keys(touched) as Field[]) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })

const errors = computed<Record<Field, string>>(() => {
  const order = Number(form.sortOrder)
  return {
    code: props.initial ? '' : length(form.code, 'El código', 2, 50),
    label: length(form.label, 'La respuesta', 2, 255),
    helpText: maxLength(form.helpText, 'El texto de ayuda', 500),
    sortOrder:
      form.sortOrder.trim() && Number.isInteger(order) && order >= 0
        ? ''
        : 'El orden debe ser un número entero mayor o igual a 0.',
  }
})

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((field) => [field, touched[field] ? errors.value[field] : ''])),
    ids,
    ORDER,
  ),
)

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

function touch(field: Field) {
  touched[field] = true
}

function validate() {
  for (const key of Object.keys(touched) as Field[]) touched[key] = true
  const ok = Object.values(errors.value).every((message) => !message)
  if (!ok) void Promise.resolve().then(() => summaryRef.value?.focus())
  return ok
}

function submit() {
  if (!validate()) return
  const common: UpdateConfiguratorOptionRequest = {
    label: form.label.trim(),
    helpText: form.helpText.trim() || null,
    sortOrder: Number(form.sortOrder),
  }
  emit('submit', props.initial ? common : { code: form.code.trim().toUpperCase(), ...common })
}

/** Para `useUnsavedChangesGuard`: si hay algo escrito que se perdería al salir. */
function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <ErrorSummary ref="summaryRef" :items="summaryItems" />

    <p class="ds-meta">Respuesta de «{{ questionText }}».</p>

    <div class="ds-grid-2">
      <AppInput
        v-if="!initial"
        :id="ids.code"
        v-model="form.code"
        label="Código"
        required
        hint="No se puede cambiar después."
        :error="err('code')"
        @blur="touch('code')"
      />
      <p v-else class="ds-stack ds-stack--8 dato">
        <span class="ds-label">Código</span>
        <span class="ds-text-strong">{{ initial.code }}</span>
      </p>

      <AppInput
        :id="ids.sortOrder"
        v-model="form.sortOrder"
        label="Orden"
        required
        type="number"
        inputmode="numeric"
        :error="err('sortOrder')"
        @blur="touch('sortOrder')"
      />
    </div>

    <AppInput
      :id="ids.label"
      v-model="form.label"
      label="Respuesta"
      required
      placeholder="Sí, tengo punto de venta"
      hint="Se lee sola dentro de la frase de un efecto, así que «Sí» a secas no basta."
      :error="err('label')"
      @blur="touch('label')"
    />

    <AppTextarea
      :id="ids.helpText"
      v-model="form.helpText"
      label="Texto de ayuda"
      :rows="2"
      :error="err('helpText')"
      @blur="touch('helpText')"
    />

    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : initial ? 'Guardar respuesta' : 'Añadir respuesta' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* Solo lo que ninguna primitiva aporta: la rejilla es `.ds-grid-2` y su
   colapso a una columna ya vive allí (`primitives.css:614`). */
.dato {
  margin: 0;
}
</style>
