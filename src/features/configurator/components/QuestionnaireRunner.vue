<script setup lang="ts">
import { computed, useId } from 'vue'
import { ICONS } from '@/constants/icons'
import type { ConfiguratorAnswerState, MissingAnswer } from '../composables/configurator-answers'
import type { QuestionnaireQuestionResponse } from '../types/configurator.types'

/**
 * El cuestionario **exactamente como lo ve el prospecto**.
 *
 * <p>Cada pregunta es un `&lt;fieldset&gt;` con su `&lt;legend&gt;`, que es el
 * patrón del *Forms Tutorial* del W3C para un grupo de controles: sin él, un
 * lector de pantalla anuncia «Sí» y «No» sin decir de qué. El `helpText` va en
 * un `&lt;p&gt;` referido con `aria-describedby` desde el propio `fieldset`, y
 * el mensaje de «falta responder» se añade a ese mismo `aria-describedby` —el
 * hueco sistémico que los dos fronts arrastran y que estas pantallas no
 * heredan (especificación §5.6).
 *
 * <p><b>`BOOLEAN` son dos radios, no un interruptor.</b> Un interruptor implica
 * un ajuste que se guarda; esto es una respuesta. Y `BOOLEAN` viene del backend
 * modelado como dos opciones: si a una pregunta `BOOLEAN` no le cuelga ninguna,
 * no puede influir en el resultado y la pantalla lo dice en vez de pintar dos
 * radios que no mandan nada.
 *
 * <p>Una pregunta `NUMBER` no lleva `fieldset`: es un solo control, y su
 * `&lt;label&gt;` es la pregunta.
 */
const props = defineProps<{
  questions: QuestionnaireQuestionResponse[]
  answers: ConfiguratorAnswerState
  /** Obligatorias sin responder. Solo se pintan tras un intento de resolver. */
  missing: MissingAnswer[]
  showErrors?: boolean
}>()

const emit = defineEmits<{
  toggle: [question: QuestionnaireQuestionResponse, optionId: number, checked: boolean]
  number: [questionId: number, value: number | null]
}>()

const uid = useId()
const helpId = (id: number) => `${uid}-help-${String(id)}`
const errorId = (id: number) => `${uid}-error-${String(id)}`
const numberId = (id: number) => `${uid}-number-${String(id)}`
const optionInputId = (questionId: number, optionId: number) =>
  `${uid}-opt-${String(questionId)}-${String(optionId)}`

const missingIds = computed(() => new Set(props.missing.map((m) => m.questionId)))

function isMissing(question: QuestionnaireQuestionResponse) {
  return !!props.showErrors && missingIds.value.has(question.id)
}

function describedBy(question: QuestionnaireQuestionResponse) {
  const ids = [
    question.helpText ? helpId(question.id) : '',
    isMissing(question) ? errorId(question.id) : '',
  ]
  const value = ids.filter(Boolean).join(' ')
  return value || undefined
}

function isChecked(optionId: number) {
  return props.answers.selectedOptionIds.includes(optionId)
}

function numberValue(questionId: number) {
  return props.answers.numericAnswers[String(questionId)] ?? ''
}

function onNumber(questionId: number, raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return emit('number', questionId, null)
  const parsed = Number(trimmed)
  emit('number', questionId, Number.isFinite(parsed) ? Math.trunc(parsed) : null)
}

function sortedOptions(question: QuestionnaireQuestionResponse) {
  return [...question.options].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
}

function missingMessage(question: QuestionnaireQuestionResponse) {
  return props.missing.find((m) => m.questionId === question.id)?.message ?? ''
}

/**
 * El id del primer control de una pregunta, para que el `ErrorSummary` de la
 * pantalla pueda llevar el FOCO hasta él y no solo mover el scroll.
 */
function controlId(question: QuestionnaireQuestionResponse) {
  if (question.answerType === 'NUMBER') return numberId(question.id)
  const [first] = sortedOptions(question)
  return first ? optionInputId(question.id, first.id) : numberId(question.id)
}

defineExpose({ controlId })
</script>

<template>
  <div class="ds-stack ds-stack--16">
    <template v-for="question in questions" :key="question.id">
      <!-- NUMBER: un solo control, así que su etiqueta ES la pregunta. -->
      <div v-if="question.answerType === 'NUMBER'" class="ds-stack ds-stack--8">
        <label class="pregunta" :for="numberId(question.id)">
          {{ question.questionText }}
          <span v-if="question.required" class="obligatoria">(obligatoria)</span>
        </label>
        <p v-if="question.helpText" :id="helpId(question.id)" class="ds-hint">
          {{ question.helpText }}
        </p>
        <input
          :id="numberId(question.id)"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          class="numero ds-field ds-focus-ring"
          :class="isMissing(question) ? 'ds-field-invalid' : 'ds-field-rest'"
          :value="numberValue(question.id)"
          :aria-invalid="isMissing(question) ? 'true' : undefined"
          :aria-describedby="describedBy(question)"
          @input="onNumber(question.id, ($event.target as HTMLInputElement).value)"
        />
        <p
          v-if="isMissing(question)"
          :id="errorId(question.id)"
          class="error ds-flex-row ds-flex-row--6"
        >
          <component :is="ICONS.WARNING" :size="12" />
          <span>{{ missingMessage(question) }}</span>
        </p>
      </div>

      <!-- SINGLE / MULTI / BOOLEAN: grupo de controles. -->
      <fieldset v-else class="grupo ds-stack ds-stack--8" :aria-describedby="describedBy(question)">
        <legend class="pregunta">
          {{ question.questionText }}
          <span v-if="question.required" class="obligatoria">(obligatoria)</span>
        </legend>
        <p v-if="question.helpText" :id="helpId(question.id)" class="ds-hint">
          {{ question.helpText }}
        </p>

        <p v-if="question.options.length === 0" class="ds-banner ds-banner--info ds-banner--sm">
          <component :is="ICONS.INFO" :size="15" class="ds-banner-icon" />
          <span>
            Esta pregunta no tiene respuestas cargadas, así que el prospecto no puede contestarla y
            no influye en el resultado. Añádeselas en «Editar el cuestionario».
          </span>
        </p>

        <label v-for="option in sortedOptions(question)" :key="option.id" class="opcion">
          <input
            :id="optionInputId(question.id, option.id)"
            :type="question.answerType === 'MULTI' ? 'checkbox' : 'radio'"
            :name="`${uid}-q-${question.id}`"
            :value="option.id"
            :checked="isChecked(option.id)"
            :aria-invalid="isMissing(question) ? 'true' : undefined"
            @change="
              emit('toggle', question, option.id, ($event.target as HTMLInputElement).checked)
            "
          />
          <span>
            {{ option.label }}
            <span v-if="option.helpText" class="ds-meta"> · {{ option.helpText }}</span>
          </span>
        </label>

        <p
          v-if="isMissing(question)"
          :id="errorId(question.id)"
          class="error ds-flex-row ds-flex-row--6"
        >
          <component :is="ICONS.WARNING" :size="12" />
          <span>{{ missingMessage(question) }}</span>
        </p>
      </fieldset>
    </template>
  </div>
</template>

<style scoped>
.grupo {
  margin: 0;
  padding: 0;
  border: 0;
}

.pregunta {
  color: var(--text);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
}

.obligatoria {
  color: var(--text-subtle);
  font-weight: var(--weight-medium);
}

.opcion {
  display: flex;
  align-items: baseline;
  gap: var(--space-8);
  cursor: pointer;
}

.numero {
  width: 10ch;
  font-family: inherit;
}

/* La geometria la ponen `.ds-flex-row` + `.ds-flex-row--6` desde el marcado;
   aqui solo queda el tono, que ninguna primitiva aporta para texto de error en
   linea. Escribir el cuerpo entero habria hecho de este el cuarto componente
   con la misma regla y `css:budget` no tolera ningun grupo duplicado. */
.error {
  margin: 0;
  color: var(--danger-500);
  font-size: var(--text-xs);
}
</style>
