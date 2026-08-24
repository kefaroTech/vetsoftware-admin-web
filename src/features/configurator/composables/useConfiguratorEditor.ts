import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useToast } from '@/composables/useToast'
import { useConfiguratorStore } from '../stores/configurator.store'
import {
  configuratorEffectsApi,
  configuratorOptionsApi,
  configuratorQuestionsApi,
} from '../api/configurator.api'
import { useConfiguratorTester } from './useConfiguratorTester'
import { fetchAllPages } from './fetch-all-pages'
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
 * La consecuencia, literal y sin suavizar, de cualquier escritura del
 * cuestionario (especificación §3.6, decisión 2).
 *
 * `configurator_questions`, `configurator_options` y `configurator_effects` no
 * tienen columna `status` y ninguna de sus nueve rutas expone publicación,
 * mientras que `price_lists` sí tiene `DRAFT → PUBLISHED → ARCHIVED`. Fingir un
 * borrador que no existe es peor que decirlo. Ver el issue B-2.
 */
export const CONSEQUENCE_LIVE =
  'El cuestionario no tiene borrador: este cambio afecta al siguiente prospecto que entre en el configurador.'

export const CONSEQUENCE_EFFECT = `${CONSEQUENCE_LIVE} Un efecto mal puesto se traduce en cotizar de menos.`

export function useConfiguratorEditor() {
  const store = useConfiguratorStore()
  const {
    questions,
    optionsByQuestion,
    effects,
    catalogItems,
    editorLoading,
    editorError,
    editorErrorTraceId,
    truncated,
    comparisonBefore,
    comparisonAfter,
    comparisonLabel,
    comparisonScenario,
    catalogItemById,
  } = storeToRefs(store)
  const { success, errorFrom } = useToast()
  const { confirm } = useConfirmDialog()
  const tester = useConfiguratorTester()

  /** Las preguntas en el orden en que las ve el prospecto. */
  const orderedQuestions = computed(() =>
    [...questions.value].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
  )

  const effectsByOption = computed(() => {
    const index = new Map<number, ConfiguratorEffectResponse[]>()
    for (const effect of effects.value) {
      if (effect.optionId == null) continue
      const list = index.get(effect.optionId) ?? []
      list.push(effect)
      index.set(effect.optionId, list)
    }
    return index
  })

  const effectsByQuestion = computed(() => {
    const index = new Map<number, ConfiguratorEffectResponse[]>()
    for (const effect of effects.value) {
      if (effect.questionId == null || effect.optionId != null) continue
      const list = index.get(effect.questionId) ?? []
      list.push(effect)
      index.set(effect.questionId, list)
    }
    return index
  })

  /** Recarga completa. Se llama al abrir la pantalla y tras cada escritura. */
  async function loadAll() {
    store.setEditorLoading(true)
    store.setEditorError(null)
    try {
      const [questionsPage, effectsPage] = await Promise.all([
        fetchAllPages<ConfiguratorQuestionResponse>((page, pageSize) =>
          configuratorQuestionsApi.listAll(page, pageSize),
        ),
        fetchAllPages<ConfiguratorEffectResponse>((page, pageSize) =>
          configuratorEffectsApi.listAll(page, pageSize),
        ),
        tester.loadCatalogItems(),
      ])
      const optionLists = await Promise.all(
        questionsPage.items.map((question) =>
          configuratorOptionsApi
            .listByQuestion(question.id)
            .then((options) => [question.id, options] as const),
        ),
      )
      const byQuestion: Record<number, ConfiguratorOptionResponse[]> = {}
      for (const [questionId, options] of optionLists) {
        byQuestion[questionId] = [...options].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
        )
      }
      store.setEditorData({
        questions: questionsPage.items,
        optionsByQuestion: byQuestion,
        effects: effectsPage.items,
        truncated: questionsPage.truncated || effectsPage.truncated,
      })
    } catch (error) {
      store.setEditorError(
        getProblemDetailMessage(error, 'No se pudo cargar el cuestionario'),
        getTraceId(error) ?? null,
      )
      errorFrom('Error al cargar el cuestionario', error)
    } finally {
      store.setEditorLoading(false)
    }
  }

  /**
   * Toda escritura pasa por aquí, y por eso la comparación no se puede olvidar.
   *
   * <p>El orden es el que hace que la comparación signifique algo: se toma la
   * foto de «antes» **inmediatamente** antes de escribir —no al abrir la
   * pantalla— y la de «después» tras recargar, porque los ids del cuestionario
   * cambian con la escritura.
   *
   * <p>Si la comparación no se puede calcular (el servidor rechaza el escenario,
   * o el límite de tasa corta), la escritura NO se deshace: ya ocurrió. La
   * pantalla lo dice con `comparisonAfter === null` en vez de pintar una
   * comparación inventada.
   */
  async function write(options: {
    message: string
    consequence: string
    confirmLabel: string
    successMessage: string
    label: string
    action: () => Promise<void>
  }): Promise<boolean> {
    const confirmed = await confirm({
      message: options.message,
      consequence: options.consequence,
      confirmLabel: options.confirmLabel,
    })
    if (!confirmed) return false

    store.clearComparison()
    const before = await tester.snapshot()
    try {
      await options.action()
    } catch (error) {
      errorFrom(`Error al ${options.label.toLowerCase()}`, error)
      return false
    }
    success(options.successMessage)
    await loadAll()
    const after = await tester.snapshot()
    store.setComparison({
      before: before.items,
      after: after.items,
      label: options.label,
      scenario: after.label,
    })
    return true
  }

  const questionLabel = (question: ConfiguratorQuestionResponse) =>
    `«${question.questionText}» (${question.code})`

  function createQuestion(payload: CreateConfiguratorQuestionRequest) {
    return write({
      message: `¿Crear la pregunta «${payload.questionText}»?`,
      consequence: CONSEQUENCE_LIVE,
      confirmLabel: 'Crear pregunta',
      successMessage: 'Pregunta creada',
      label: 'Crear la pregunta',
      action: async () => void (await configuratorQuestionsApi.create(payload)),
    })
  }

  function updateQuestion(
    question: ConfiguratorQuestionResponse,
    payload: UpdateConfiguratorQuestionRequest,
  ) {
    return write({
      message: `¿Guardar los cambios de la pregunta ${questionLabel(question)}?`,
      consequence: CONSEQUENCE_LIVE,
      confirmLabel: 'Guardar pregunta',
      successMessage: 'Pregunta actualizada',
      label: 'Guardar la pregunta',
      action: async () => void (await configuratorQuestionsApi.update(question.id, payload)),
    })
  }

  function removeQuestion(question: ConfiguratorQuestionResponse) {
    return write({
      message: `¿Dar de baja la pregunta ${questionLabel(question)}?`,
      consequence: `${CONSEQUENCE_LIVE} Sus opciones y los efectos que cuelgan de ellas dejan de dispararse.`,
      confirmLabel: 'Dar de baja la pregunta',
      successMessage: 'Pregunta dada de baja',
      label: 'Dar de baja la pregunta',
      action: () => configuratorQuestionsApi.remove(question.id),
    })
  }

  function createOption(
    question: ConfiguratorQuestionResponse,
    payload: CreateConfiguratorOptionRequest,
  ) {
    return write({
      message: `¿Añadir la respuesta «${payload.label}» a la pregunta ${questionLabel(question)}?`,
      consequence: CONSEQUENCE_LIVE,
      confirmLabel: 'Añadir respuesta',
      successMessage: 'Respuesta añadida',
      label: 'Añadir la respuesta',
      action: async () => void (await configuratorOptionsApi.create(payload)),
    })
  }

  function updateOption(
    option: ConfiguratorOptionResponse,
    payload: UpdateConfiguratorOptionRequest,
  ) {
    return write({
      message: `¿Guardar los cambios de la respuesta «${option.label}»?`,
      consequence: CONSEQUENCE_LIVE,
      confirmLabel: 'Guardar respuesta',
      successMessage: 'Respuesta actualizada',
      label: 'Guardar la respuesta',
      action: async () => void (await configuratorOptionsApi.update(option.id, payload)),
    })
  }

  function removeOption(option: ConfiguratorOptionResponse) {
    return write({
      message: `¿Dar de baja la respuesta «${option.label}»?`,
      consequence: `${CONSEQUENCE_LIVE} Los efectos que cuelgan de esta respuesta dejan de dispararse.`,
      confirmLabel: 'Dar de baja la respuesta',
      successMessage: 'Respuesta dada de baja',
      label: 'Dar de baja la respuesta',
      action: () => configuratorOptionsApi.remove(option.id),
    })
  }

  function createEffect(sentence: string, payload: CreateConfiguratorEffectRequest) {
    return write({
      message: `¿Crear este efecto? ${sentence}`,
      consequence: CONSEQUENCE_EFFECT,
      confirmLabel: 'Crear efecto',
      successMessage: 'Efecto creado',
      label: 'Crear el efecto',
      action: async () => void (await configuratorEffectsApi.create(payload)),
    })
  }

  function updateEffect(
    effect: ConfiguratorEffectResponse,
    sentence: string,
    payload: UpdateConfiguratorEffectRequest,
  ) {
    return write({
      message: `¿Guardar este efecto? ${sentence}`,
      consequence: CONSEQUENCE_EFFECT,
      confirmLabel: 'Guardar efecto',
      successMessage: 'Efecto actualizado',
      label: 'Guardar el efecto',
      action: async () => void (await configuratorEffectsApi.update(effect.id, payload)),
    })
  }

  function removeEffect(effect: ConfiguratorEffectResponse, sentence: string) {
    return write({
      message: `¿Dar de baja este efecto? ${sentence}`,
      consequence: CONSEQUENCE_EFFECT,
      confirmLabel: 'Dar de baja el efecto',
      successMessage: 'Efecto dado de baja',
      label: 'Dar de baja el efecto',
      action: () => configuratorEffectsApi.remove(effect.id),
    })
  }

  return {
    questions,
    orderedQuestions,
    optionsByQuestion,
    effects,
    effectsByOption,
    effectsByQuestion,
    catalogItems,
    catalogItemById,
    loading: editorLoading,
    error: editorError,
    errorTraceId: editorErrorTraceId,
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
    clearComparison: store.clearComparison,
  }
}
