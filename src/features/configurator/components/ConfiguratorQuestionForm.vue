<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { length, maxLength, selection } from '@/composables/validators'
import {
  ANSWER_TYPE_OPTIONS,
  type ConfiguratorAnswerType,
  type ConfiguratorQuestionResponse,
  type CreateConfiguratorQuestionRequest,
  type UpdateConfiguratorQuestionRequest,
} from '../types/configurator.types'

/**
 * Alta y edición de una pregunta del cuestionario.
 *
 * <p>Sigue la convención de formularios del repositorio: validador puro por
 * campo → `computed errors` → mapa `touched` que arranca en `false` → el error
 * solo se ve tras `@blur` o tras un `validate()` fallido → `ErrorSummary` con el
 * MISMO texto que el error en línea (GOV.UK, *Validation pattern*).
 *
 * <p><b>El código no se edita.</b> `UpdateConfiguratorQuestionRequest` no lo
 * lleva: identifica la pregunta en las respuestas ya guardadas de cotizaciones
 * viejas, y cambiarlo las dejaría sin nombre. Por eso en edición se pinta como
 * dato y no como campo deshabilitado (§3.2).
 *
 * <p><b>El aviso de tipo</b> reproduce en el cliente
 * `QuantityFromAnswerGuard.assertQuestionTypeStillFits`: sacar una pregunta de
 * `NUMBER` cuando de ella cuelga un efecto «fija la cantidad con el número del
 * cliente» devuelve 409. Decirlo antes, con el remedio, evita un error que solo
 * se entiende leyendo el backend.
 */
const props = defineProps<{
  initial?: ConfiguratorQuestionResponse | null
  /** Respuestas de OTRAS preguntas, para colgar esta de una de ellas. */
  parentOptions: { value: number; label: string }[]
  /** Cuántos efectos «con el número del cliente» dependen de que siga siendo NUMBER. */
  quantityFromAnswerEffects: number
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateConfiguratorQuestionRequest | UpdateConfiguratorQuestionRequest]
  cancel: []
}>()

interface FormState {
  code: string
  questionText: string
  helpText: string
  answerType: ConfiguratorAnswerType | ''
  parentOptionId: number
  required: boolean
  sortOrder: string
}

type Field = keyof FormState

const uid = useId()
const ids: Record<Field, string> = {
  code: `${uid}-code`,
  questionText: `${uid}-question-text`,
  helpText: `${uid}-help-text`,
  answerType: `${uid}-answer-type`,
  parentOptionId: `${uid}-parent-option`,
  required: `${uid}-required`,
  sortOrder: `${uid}-sort-order`,
}
const ORDER: Field[] = [
  'code',
  'questionText',
  'helpText',
  'answerType',
  'parentOptionId',
  'required',
  'sortOrder',
]

const form = reactive<FormState>({
  code: '',
  questionText: '',
  helpText: '',
  answerType: '',
  parentOptionId: 0,
  required: true,
  sortOrder: '0',
})
const touched = reactive<Record<Field, boolean>>({
  code: false,
  questionText: false,
  helpText: false,
  answerType: false,
  parentOptionId: false,
  required: false,
  sortOrder: false,
})
const summaryRef = ref<InstanceType<typeof ErrorSummary> | null>(null)
const baseline = ref('')

function reset(initial?: ConfiguratorQuestionResponse | null) {
  Object.assign(form, {
    code: initial?.code ?? '',
    questionText: initial?.questionText ?? '',
    helpText: initial?.helpText ?? '',
    answerType: initial?.answerType ?? '',
    parentOptionId: initial?.parentOptionId ?? 0,
    required: initial?.required ?? true,
    sortOrder: String(initial?.sortOrder ?? 0),
  })
  for (const key of Object.keys(touched) as Field[]) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })

const parentChoices = computed(() => [
  { value: 0, label: 'Ninguna — la pregunta se ve siempre' },
  ...props.parentOptions,
])

const typeChangeBlocked = computed(
  () =>
    props.initial?.answerType === 'NUMBER' &&
    form.answerType !== 'NUMBER' &&
    props.quantityFromAnswerEffects > 0,
)

const errors = computed<Record<Field, string>>(() => {
  const order = Number(form.sortOrder)
  return {
    code: props.initial ? '' : length(form.code, 'El código', 2, 50),
    questionText: length(form.questionText, 'La pregunta', 2, 255),
    helpText: maxLength(form.helpText, 'El texto de ayuda', 500),
    answerType: selection(form.answerType, 'el tipo de respuesta'),
    parentOptionId: '',
    required: '',
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
  const ok = Object.values(errors.value).every((message) => !message) && !typeChangeBlocked.value
  if (!ok) void Promise.resolve().then(() => summaryRef.value?.focus())
  return ok
}

function submit() {
  if (!validate() || !form.answerType) return
  const common: UpdateConfiguratorQuestionRequest = {
    questionText: form.questionText.trim(),
    helpText: form.helpText.trim() || null,
    answerType: form.answerType,
    parentOptionId: form.parentOptionId === 0 ? null : form.parentOptionId,
    required: form.required,
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

    <p v-if="typeChangeBlocked" class="ds-banner ds-banner--warning" role="alert">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
      <span>
        No se puede sacar esta pregunta de «Un número»:
        {{
          quantityFromAnswerEffects === 1
            ? 'un efecto fija su cantidad'
            : `${quantityFromAnswerEffects} efectos fijan su cantidad`
        }}
        con el número que escribe el cliente, y se quedarían sin número que leer. Cambia primero
        esos efectos.
      </span>
    </p>

    <div class="ds-grid-2">
      <AppInput
        v-if="!initial"
        :id="ids.code"
        v-model="form.code"
        label="Código"
        required
        hint="Identifica la pregunta en las cotizaciones ya guardadas. No se puede cambiar después."
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
        hint="El prospecto las ve en este orden."
        :error="err('sortOrder')"
        @blur="touch('sortOrder')"
      />
    </div>

    <AppInput
      :id="ids.questionText"
      v-model="form.questionText"
      label="Pregunta"
      required
      placeholder="¿Cobras en mostrador?"
      :error="err('questionText')"
      @blur="touch('questionText')"
    />

    <AppTextarea
      :id="ids.helpText"
      v-model="form.helpText"
      label="Texto de ayuda"
      :rows="2"
      hint="Se lee debajo de la pregunta. Sirve para desambiguar, no para repetirla."
      :error="err('helpText')"
      @blur="touch('helpText')"
    />

    <div class="ds-grid-2">
      <AppSelect
        :id="ids.answerType"
        v-model="form.answerType"
        :options="ANSWER_TYPE_OPTIONS"
        label="Cómo se responde"
        required
        :error="err('answerType')"
        @blur="touch('answerType')"
      />
      <AppSelect
        :id="ids.parentOptionId"
        v-model="form.parentOptionId"
        :options="parentChoices"
        label="Solo aparece si responde"
        hint="Deja «Ninguna» para una pregunta de primer nivel."
        :error="err('parentOptionId')"
        @blur="touch('parentOptionId')"
      />
    </div>

    <AppCheckbox v-model="form.required" label="Hay que responderla para poder cotizar" />

    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : initial ? 'Guardar pregunta' : 'Crear pregunta' }}
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
