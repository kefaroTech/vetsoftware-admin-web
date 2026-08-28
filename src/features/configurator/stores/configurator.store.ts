import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'
import type {
  ConfiguratorEffectResponse,
  ConfiguratorOptionResponse,
  ConfiguratorQuestionResponse,
  QuestionnaireQuestionResponse,
  SelectedItemResponse,
} from '../types/configurator.types'
import { emptyAnswers, type ConfiguratorAnswerState } from '../composables/configurator-answers'

/**
 * Estado del configurador, compartido por sus DOS sub-vistas.
 *
 * <p><b>Por qué es un store y no un `ref` dentro del composable.</b> Aparte de
 * la regla obligatoria del repositorio (`CLAUDE.md`, «SIEMPRE Pinia»), aquí hay
 * una razón funcional: la comparación «Qué cambió al guardar» nace en
 * `/configurador/cuestionario` y el escenario con el que se compara se responde
 * en `/configurador/probar`. Son dos rutas distintas, así que el estado tiene
 * que sobrevivir a la navegación entre ellas o la comparación no existe.
 *
 * <p><b>Por qué el escenario NO va a `sessionStorage`</b>, como proponía
 * §3.6 de la especificación: en este repositorio solo `storageService` toca el
 * almacenamiento del navegador, y ese fichero es un gemelo TR-02 —lo edita
 * `front-parity`, no `front-feature`— y hoy no expone ninguna API genérica de
 * clave/valor. Añadirla aquí rompería la paridad. El store cubre lo que la
 * pantalla necesita (sobrevivir a la navegación); lo que se pierde es
 * sobrevivir a un F5, y eso queda anotado como issue.
 */
export const useConfiguratorStore = defineStore('configurator', () => {
  // --- Editor del cuestionario -------------------------------------------
  const questions = ref<ConfiguratorQuestionResponse[]>([])
  const optionsByQuestion = ref<Record<number, ConfiguratorOptionResponse[]>>({})
  const effects = ref<ConfiguratorEffectResponse[]>([])
  const catalogItems = ref<CatalogItemResponse[]>([])
  const editorLoading = ref(false)
  const editorError = ref<string | null>(null)
  const editorErrorTraceId = ref<string | null>(null)
  /** `true` si el servidor tiene más filas de las que este editor pinta. Ver `MAX_ROWS`. */
  const truncated = ref(false)

  /**
   * El orden de aplicación que el operador está **arreglando**, como lista de
   * ids de efecto — todavía sin guardar.
   *
   * <p>Vive en el store y no en un `ref` de la vista porque la pantalla del
   * orden y la del cuestionario comparten los mismos efectos: si se reordena,
   * se navega a editar una respuesta y se vuelve, el trabajo a medias tiene que
   * seguir ahí. Vacío = no hay borrador y se pinta el orden guardado.
   */
  const effectOrderDraft = ref<number[]>([])

  // --- Probar -------------------------------------------------------------
  const questionnaire = ref<QuestionnaireQuestionResponse[]>([])
  const answers = ref<ConfiguratorAnswerState>(emptyAnswers())
  const selection = ref<SelectedItemResponse[] | null>(null)
  const questionnaireLoading = ref(false)
  const questionnaireError = ref<string | null>(null)
  const questionnaireErrorTraceId = ref<string | null>(null)
  const resolving = ref(false)

  // --- Comparación antes/después -----------------------------------------
  const comparisonBefore = ref<SelectedItemResponse[] | null>(null)
  const comparisonAfter = ref<SelectedItemResponse[] | null>(null)
  const comparisonLabel = ref('')
  const comparisonScenario = ref('')

  const questionById = computed(
    () => new Map(questions.value.map((question) => [question.id, question])),
  )
  const optionById = computed(() => {
    const index = new Map<number, ConfiguratorOptionResponse>()
    for (const list of Object.values(optionsByQuestion.value)) {
      for (const option of list) index.set(option.id, option)
    }
    return index
  })
  const catalogItemById = computed(() => new Map(catalogItems.value.map((item) => [item.id, item])))

  function setEditorData(payload: {
    questions: ConfiguratorQuestionResponse[]
    optionsByQuestion: Record<number, ConfiguratorOptionResponse[]>
    effects: ConfiguratorEffectResponse[]
    truncated: boolean
  }) {
    questions.value = payload.questions
    optionsByQuestion.value = payload.optionsByQuestion
    effects.value = payload.effects
    truncated.value = payload.truncated
  }

  /**
   * Reemplaza los efectos con lo que devuelve el servidor tras reordenar, sin
   * tocar preguntas ni respuestas: el reordenamiento no las cambia y recargarlo
   * todo haría parpadear la pantalla entera por un cambio de tres números.
   */
  function setEffects(value: ConfiguratorEffectResponse[]) {
    effects.value = value
  }

  function setEffectOrderDraft(ids: number[]) {
    effectOrderDraft.value = ids
  }

  function clearEffectOrderDraft() {
    effectOrderDraft.value = []
  }

  function setCatalogItems(items: CatalogItemResponse[]) {
    catalogItems.value = items
  }

  function setEditorLoading(value: boolean) {
    editorLoading.value = value
  }

  function setEditorError(message: string | null, traceId: string | null = null) {
    editorError.value = message
    editorErrorTraceId.value = traceId
  }

  function setQuestionnaire(value: QuestionnaireQuestionResponse[]) {
    questionnaire.value = value
  }

  function setAnswers(value: ConfiguratorAnswerState) {
    answers.value = value
  }

  function setSelection(value: SelectedItemResponse[] | null) {
    selection.value = value
  }

  function setQuestionnaireLoading(value: boolean) {
    questionnaireLoading.value = value
  }

  function setQuestionnaireError(message: string | null, traceId: string | null = null) {
    questionnaireError.value = message
    questionnaireErrorTraceId.value = traceId
  }

  function setResolving(value: boolean) {
    resolving.value = value
  }

  /**
   * Guarda la instantánea de «antes». Se toma justo antes de escribir, no al
   * abrir la pantalla: entre abrir y guardar puede haber pasado otra cosa, y
   * una comparación contra una foto vieja diría que cambió algo que no cambió.
   */
  function setComparison(payload: {
    before: SelectedItemResponse[] | null
    after: SelectedItemResponse[] | null
    label: string
    scenario: string
  }) {
    comparisonBefore.value = payload.before
    comparisonAfter.value = payload.after
    comparisonLabel.value = payload.label
    comparisonScenario.value = payload.scenario
  }

  function clearComparison() {
    setComparison({ before: null, after: null, label: '', scenario: '' })
  }

  return {
    questions,
    optionsByQuestion,
    effects,
    catalogItems,
    editorLoading,
    editorError,
    editorErrorTraceId,
    truncated,
    effectOrderDraft,
    questionnaire,
    answers,
    selection,
    questionnaireLoading,
    questionnaireError,
    questionnaireErrorTraceId,
    resolving,
    comparisonBefore,
    comparisonAfter,
    comparisonLabel,
    comparisonScenario,
    questionById,
    optionById,
    catalogItemById,
    setEditorData,
    setEffects,
    setEffectOrderDraft,
    clearEffectOrderDraft,
    setCatalogItems,
    setEditorLoading,
    setEditorError,
    setQuestionnaire,
    setAnswers,
    setSelection,
    setQuestionnaireLoading,
    setQuestionnaireError,
    setResolving,
    setComparison,
    clearComparison,
  }
})
