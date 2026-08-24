<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { ICONS } from '@/constants/icons'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import EffectSentence from '../components/EffectSentence.vue'
import ConfiguratorOptionForm from '../components/ConfiguratorOptionForm.vue'
import ConfiguratorQuestionCard from '../components/ConfiguratorQuestionCard.vue'
import ConfiguratorQuestionForm from '../components/ConfiguratorQuestionForm.vue'
import SelectionDiff from '../components/SelectionDiff.vue'
import { useConfiguratorEditor } from '../composables/useConfiguratorEditor'
import { useConfiguratorStore } from '../stores/configurator.store'
import { describeEffect, triggerLabel } from '../composables/effect-sentence'
import type {
  ConfiguratorEffectResponse,
  ConfiguratorOptionResponse,
  ConfiguratorQuestionResponse,
  CreateConfiguratorEffectRequest,
  CreateConfiguratorOptionRequest,
  CreateConfiguratorQuestionRequest,
  UpdateConfiguratorEffectRequest,
  UpdateConfiguratorOptionRequest,
  UpdateConfiguratorQuestionRequest,
} from '../types/configurator.types'

/**
 * Editar el cuestionario — `/configurador/cuestionario`.
 *
 * <p>Es un <b>formulario</b> en el sentido de §3.2: tiene «Editar» y «Guardar»
 * de verdad, porque las tres tablas del configurador sí se editan. Lo que no
 * tiene es borrador, y de eso avisa el armazón y lo repite cada confirmación.
 *
 * <p>Los tres listados están paginados en el servidor, pero aquí se traen
 * enteros: la pregunta, sus respuestas y los efectos que cuelgan de ellas viven
 * en tres endpoints distintos y paginarlos partiría el árbol por la mitad. El
 * techo y su aviso están en `useConfiguratorEditor`.
 */
const store = useConfiguratorStore()
const {
  orderedQuestions,
  optionsByQuestion,
  effects,
  effectsByOption,
  effectsByQuestion,
  catalogItems,
  loading,
  error,
  errorTraceId,
  truncated,
  comparisonBefore,
  comparisonAfter,
  comparisonLabel,
  comparisonScenario,
  loadAll,
  createQuestion,
  updateQuestion,
  removeQuestion,
  createOption,
  updateOption,
  removeOption,
  createEffect,
  updateEffect,
  removeEffect,
} = useConfiguratorEditor()

const questionModalOpen = ref(false)
const optionModalOpen = ref(false)
const effectModalOpen = ref(false)
const editingQuestion = ref<ConfiguratorQuestionResponse | null>(null)
const editingOption = ref<ConfiguratorOptionResponse | null>(null)
const optionOwner = ref<ConfiguratorQuestionResponse | null>(null)
const editingEffect = ref<ConfiguratorEffectResponse | null>(null)
const effectTrigger = ref('')
const saving = ref(false)

const questionFormRef = ref<InstanceType<typeof ConfiguratorQuestionForm> | null>(null)
const optionFormRef = ref<InstanceType<typeof ConfiguratorOptionForm> | null>(null)
const effectFormRef = ref<InstanceType<typeof EffectSentence> | null>(null)

const context = computed(() => ({
  optionById: store.optionById,
  questionById: store.questionById,
  catalogItemById: store.catalogItemById,
}))

/** Todas las respuestas marcables, en palabras. Sirven de condición y de disparador. */
const optionChoices = computed(() =>
  orderedQuestions.value.flatMap((question) =>
    (optionsByQuestion.value[question.id] ?? []).map((option) => ({
      value: option.id,
      label: `«${option.label}» (de «${question.questionText}»)`,
      questionId: question.id,
    })),
  ),
)

const triggerChoices = computed(() => [
  ...optionChoices.value.map((choice) => ({
    value: `o:${String(choice.value)}`,
    label: choice.label,
    numeric: false,
  })),
  ...orderedQuestions.value
    .filter((question) => question.answerType === 'NUMBER')
    .map((question) => ({
      value: `q:${String(question.id)}`,
      label: `«${question.questionText}» con un número`,
      numeric: true,
    })),
])

/** Una condicional no puede colgar de una respuesta de su propia pregunta. */
const parentOptionChoices = computed(() =>
  optionChoices.value
    .filter((choice) => choice.questionId !== editingQuestion.value?.id)
    .map(({ value, label }) => ({ value, label })),
)

const quantityFromAnswerEffects = computed(
  () =>
    effects.value.filter(
      (effect) =>
        effect.effect === 'QUANTITY_FROM_ANSWER' && effect.questionId === editingQuestion.value?.id,
    ).length,
)

const effectFixedTrigger = computed(() =>
  editingEffect.value ? triggerLabel(editingEffect.value, context.value) : '',
)

const questionCount = computed(() =>
  orderedQuestions.value.length === 1 ? '1 pregunta' : `${orderedQuestions.value.length} preguntas`,
)

useUnsavedChangesGuard(
  () =>
    (questionModalOpen.value && !!questionFormRef.value?.isDirty()) ||
    (optionModalOpen.value && !!optionFormRef.value?.isDirty()) ||
    (effectModalOpen.value && !!effectFormRef.value?.isDirty()),
)

function openQuestion(question: ConfiguratorQuestionResponse | null) {
  editingQuestion.value = question
  questionModalOpen.value = true
}

function openOption(
  question: ConfiguratorQuestionResponse,
  option: ConfiguratorOptionResponse | null,
) {
  optionOwner.value = question
  editingOption.value = option
  optionModalOpen.value = true
}

function openEffect(trigger: string, effect: ConfiguratorEffectResponse | null) {
  effectTrigger.value = trigger
  editingEffect.value = effect
  effectModalOpen.value = true
}

function ownerOf(option: ConfiguratorOptionResponse) {
  return store.questionById.get(option.questionId) ?? null
}

async function run(task: () => Promise<boolean>, close: () => void) {
  saving.value = true
  try {
    if (await task()) close()
  } finally {
    saving.value = false
  }
}

function submitQuestion(
  payload: CreateConfiguratorQuestionRequest | UpdateConfiguratorQuestionRequest,
) {
  const current = editingQuestion.value
  void run(
    () =>
      current
        ? updateQuestion(current, payload)
        : createQuestion(payload as CreateConfiguratorQuestionRequest),
    () => (questionModalOpen.value = false),
  )
}

function submitOption(
  payload: Omit<CreateConfiguratorOptionRequest, 'questionId'> | UpdateConfiguratorOptionRequest,
) {
  const option = editingOption.value
  const owner = optionOwner.value
  if (!owner) return
  void run(
    () =>
      option
        ? updateOption(option, payload)
        : createOption(owner, {
            ...(payload as Omit<CreateConfiguratorOptionRequest, 'questionId'>),
            questionId: owner.id,
          }),
    () => (optionModalOpen.value = false),
  )
}

function submitEffect(payload: CreateConfiguratorEffectRequest) {
  const effect = editingEffect.value
  const sentence = describeEffect(payload, context.value)
  void run(
    () =>
      effect
        ? updateEffect(effect, sentence, payload as UpdateConfiguratorEffectRequest)
        : createEffect(sentence, payload),
    () => (effectModalOpen.value = false),
  )
}

function deleteEffect(effect: ConfiguratorEffectResponse) {
  void removeEffect(effect, describeEffect(effect, context.value))
}

onMounted(loadAll)
</script>

<template>
  <div class="ds-stack ds-stack--18">
    <section class="ds-stack ds-stack--14" aria-labelledby="cuestionario-titulo">
      <div class="ds-block-head">
        <div class="ds-stack ds-stack--8">
          <h2 id="cuestionario-titulo" class="ds-title">El cuestionario</h2>
          <p class="ds-meta">{{ questionCount }}, en el orden en que las ve el prospecto.</p>
        </div>
        <div class="ds-flex-row ds-flex-row--6">
          <button type="button" class="ds-btn ds-btn--ghost" :disabled="loading" @click="loadAll">
            <component :is="ICONS.RETRY" :size="15" />
            Actualizar
          </button>
          <button type="button" class="ds-btn ds-btn--primary" @click="openQuestion(null)">
            <component :is="ICONS.ADD" :size="15" />
            Nueva pregunta
          </button>
        </div>
      </div>

      <div v-if="error" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="loadAll">
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="error && errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>

      <p v-if="truncated" class="ds-banner ds-banner--warning" role="status">
        <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
        <span>
          El cuestionario tiene más filas de las que esta pantalla pinta de una vez. Lo que ves está
          incompleto: no des por buena una comparación hasta que se pagine.
        </span>
      </p>

      <p v-if="loading && orderedQuestions.length === 0" class="ds-meta">
        Cargando el cuestionario…
      </p>

      <AppEmptyState
        v-else-if="!error && orderedQuestions.length === 0"
        title="El cuestionario está vacío"
        description="Sin preguntas, el asistente no pregunta nada y el carrito del prospecto sale siempre vacío. Empieza por una pregunta de primer nivel."
      >
        <button type="button" class="ds-btn ds-btn--primary" @click="openQuestion(null)">
          <component :is="ICONS.ADD" :size="15" />
          Crear la primera pregunta
        </button>
      </AppEmptyState>

      <ConfiguratorQuestionCard
        v-for="question in orderedQuestions"
        :key="question.id"
        :question="question"
        :options="optionsByQuestion[question.id] ?? []"
        :effects-by-option="effectsByOption"
        :question-effects="effectsByQuestion.get(question.id) ?? []"
        :context="context"
        @edit-question="openQuestion($event)"
        @delete-question="removeQuestion($event)"
        @add-option="openOption($event, null)"
        @edit-option="openOption(ownerOf($event) ?? question, $event)"
        @delete-option="removeOption($event)"
        @add-effect="openEffect($event, null)"
        @edit-effect="openEffect('', $event)"
        @delete-effect="deleteEffect($event)"
      />
    </section>

    <SelectionDiff
      v-if="comparisonLabel"
      :before="comparisonBefore"
      :after="comparisonAfter"
      :label="comparisonLabel"
      :scenario="comparisonScenario"
      :catalog-item-by-id="store.catalogItemById"
    />

    <AppModal
      :open="questionModalOpen"
      :title="editingQuestion ? 'Editar la pregunta' : 'Nueva pregunta'"
      :max-width="640"
      @close="questionModalOpen = false"
    >
      <ConfiguratorQuestionForm
        ref="questionFormRef"
        :initial="editingQuestion"
        :parent-options="parentOptionChoices"
        :quantity-from-answer-effects="quantityFromAnswerEffects"
        :saving="saving"
        @submit="submitQuestion"
        @cancel="questionModalOpen = false"
      />
    </AppModal>

    <AppModal
      :open="optionModalOpen"
      :title="editingOption ? 'Editar la respuesta' : 'Nueva respuesta'"
      :max-width="640"
      @close="optionModalOpen = false"
    >
      <ConfiguratorOptionForm
        ref="optionFormRef"
        :initial="editingOption"
        :question-text="optionOwner?.questionText ?? ''"
        :saving="saving"
        @submit="submitOption"
        @cancel="optionModalOpen = false"
      />
    </AppModal>

    <AppModal
      :open="effectModalOpen"
      :title="editingEffect ? 'Editar el efecto' : 'Nuevo efecto'"
      :max-width="720"
      @close="effectModalOpen = false"
    >
      <EffectSentence
        ref="effectFormRef"
        :initial="editingEffect"
        :triggers="triggerChoices"
        :catalog-items="catalogItems"
        :fixed-trigger-label="effectFixedTrigger"
        :preset-trigger="effectTrigger"
        :saving="saving"
        @submit="submitEffect"
        @cancel="effectModalOpen = false"
      />
    </AppModal>
  </div>
</template>
