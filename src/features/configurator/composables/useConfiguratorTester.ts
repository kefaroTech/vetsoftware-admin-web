import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { catalogItemsApi } from '@/features/commercial-catalog/api/commercial-catalog.api'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'
import { useConfiguratorStore } from '../stores/configurator.store'
import { configuratorPublicApi } from '../api/configurator.api'
import { fetchAllPages } from './fetch-all-pages'
import {
  buildResolveRequest,
  emptyAnswers,
  missingRequired,
  referenceScenario,
  selectOption,
  setNumericAnswer,
  visibleQuestions,
  type ConfiguratorAnswerState,
} from './configurator-answers'
import type {
  QuestionnaireQuestionResponse,
  SelectedItemResponse,
} from '../types/configurator.types'

/** Cómo se nombra en pantalla el escenario con el que se comparó. */
export const REFERENCE_SCENARIO_LABEL = 'Spa Ana Pet (escenario de referencia)'
export const OWN_SCENARIO_LABEL = 'el escenario cargado en «Probar»'

/**
 * La pestaña «Probar» y las instantáneas de la comparación.
 *
 * <p><b>Cuándo se llama a `POST /configurator/resolve`, que es la decisión
 * cara.</b> El endpoint es anónimo y está limitado a **60 peticiones por minuto
 * y por IP** — un límite que comparte toda la oficina detrás de la misma IP
 * pública, incluidos los prospectos reales que estén cotizando en ese momento.
 * Así que NO se resuelve al marcar una opción ni al teclear un número. Se
 * resuelve exactamente en tres sitios:
 *
 * <ol>
 *   <li>Al pulsar «Ver el resultado» en `/configurador/probar`.</li>
 *   <li>Justo antes de una escritura del cuestionario (la foto de «antes»).</li>
 *   <li>Justo después de esa escritura (la foto de «después»).</li>
 * </ol>
 *
 * <p>Además se valida en el cliente antes de enviar: una petición que se sabe
 * que va a volver con un 400 es una petición del cupo tirada a la basura.
 */
export function useConfiguratorTester() {
  const store = useConfiguratorStore()
  const {
    questionnaire,
    answers,
    selection,
    questionnaireLoading,
    questionnaireError,
    questionnaireErrorTraceId,
    resolving,
  } = storeToRefs(store)
  const { errorFrom, warnFrom } = useToast()

  const visible = computed<QuestionnaireQuestionResponse[]>(() =>
    visibleQuestions(questionnaire.value, answers.value),
  )

  const missing = computed(() => missingRequired(questionnaire.value, answers.value))

  const hasAnswers = computed(
    () =>
      answers.value.selectedOptionIds.length > 0 ||
      Object.keys(answers.value.numericAnswers).length > 0,
  )

  /**
   * Recarga siempre al abrir la pantalla: el cuestionario es un dato vivo que
   * otro operador puede haber cambiado hace un segundo, y comparar contra una
   * copia vieja es peor que no comparar.
   */
  async function loadQuestionnaire(): Promise<QuestionnaireQuestionResponse[]> {
    store.setQuestionnaireLoading(true)
    store.setQuestionnaireError(null)
    try {
      const data = await configuratorPublicApi.questionnaire()
      store.setQuestionnaire(data)
      return data
    } catch (error) {
      store.setQuestionnaireError(
        getProblemDetailMessage(error, 'No se pudo cargar el cuestionario'),
        getTraceId(error) ?? null,
      )
      errorFrom('Error al cargar el cuestionario', error)
      return []
    } finally {
      store.setQuestionnaireLoading(false)
    }
  }

  /**
   * Los artículos del catálogo, para poder decir «Terminal (TERMINAL)» en vez
   * de «artículo #12». Las dos sub-vistas los necesitan —el carrito de aquí y
   * la frase del efecto de al lado— así que se cargan una vez en el store.
   */
  async function loadCatalogItems() {
    try {
      const { items } = await fetchAllPages<CatalogItemResponse>((page, pageSize) =>
        catalogItemsApi.listAll(page, pageSize),
      )
      store.setCatalogItems(items)
    } catch (error) {
      // No es el dato de la pantalla, es su vocabulario: sin él el carrito se
      // lee con ids en vez de con nombres, pero se lee. No se rompe la vista.
      warnFrom('No se pudieron cargar los nombres del catálogo', error)
    }
  }

  function toggleOption(
    question: QuestionnaireQuestionResponse,
    optionId: number,
    checked: boolean,
  ) {
    store.setAnswers(selectOption(questionnaire.value, answers.value, question, optionId, checked))
    // El resultado deja de corresponder a lo respondido: se retira en vez de
    // quedarse en pantalla como si siguiera siendo la respuesta a lo de ahora.
    store.setSelection(null)
  }

  function updateNumber(questionId: number, value: number | null) {
    store.setAnswers(setNumericAnswer(questionnaire.value, answers.value, questionId, value))
    store.setSelection(null)
  }

  function clearAnswers() {
    store.setAnswers(emptyAnswers())
    store.setSelection(null)
  }

  function loadReferenceScenario() {
    store.setAnswers(referenceScenario(questionnaire.value))
    store.setSelection(null)
  }

  /** Resuelve un estado concreto. Propaga el error para que lo trate quien llama. */
  async function resolveState(state: ConfiguratorAnswerState): Promise<SelectedItemResponse[]> {
    const response = await configuratorPublicApi.resolve(
      buildResolveRequest(questionnaire.value, state),
    )
    return response.items
  }

  /**
   * Lo que dispara el botón «Ver el resultado». Valida antes de gastar cupo.
   *
   * @returns `false` si no llegó a llamar al servidor porque faltan respuestas.
   */
  async function resolveNow(): Promise<boolean> {
    if (missing.value.length > 0) return false
    if (resolving.value) return false
    store.setResolving(true)
    try {
      store.setSelection(await resolveState(answers.value))
      return true
    } catch (error) {
      store.setSelection(null)
      errorFrom('Error al resolver la selección', error)
      return false
    } finally {
      store.setResolving(false)
    }
  }

  /**
   * El escenario con el que se compara una escritura del cuestionario.
   *
   * Usa lo que el operador tenga respondido en «Probar» si está completo, y si
   * no el escenario de referencia. La distinción importa: tras añadir una
   * pregunta obligatoria, las respuestas del operador dejan de estar completas
   * y resolverlas devolvería un 400 en vez de una comparación.
   */
  function comparisonScenarioFor(loaded: QuestionnaireQuestionResponse[]): {
    state: ConfiguratorAnswerState
    label: string
  } {
    const own = answers.value
    const ownIsUsable =
      (own.selectedOptionIds.length > 0 || Object.keys(own.numericAnswers).length > 0) &&
      missingRequired(loaded, own).length === 0
    return ownIsUsable
      ? { state: own, label: OWN_SCENARIO_LABEL }
      : { state: referenceScenario(loaded), label: REFERENCE_SCENARIO_LABEL }
  }

  /**
   * Una foto del carrito con el cuestionario tal y como está AHORA.
   *
   * Recarga el cuestionario antes de resolver porque los ids cambian: la foto
   * de «después» de haber creado una opción tiene que conocer esa opción.
   * Devuelve `null` si no se pudo tomar —el aviso sale en tono `warn`, no
   * `error`, porque la escritura sí ocurrió y el operador tiene que saber
   * exactamente eso.
   */
  async function snapshot(): Promise<{ items: SelectedItemResponse[] | null; label: string }> {
    const loaded = await loadQuestionnaire()
    const { state, label } = comparisonScenarioFor(loaded)
    try {
      return { items: await resolveState(state), label }
    } catch (error) {
      warnFrom('No se pudo calcular la comparación', error)
      return { items: null, label }
    }
  }

  return {
    questionnaire,
    answers,
    selection,
    loading: questionnaireLoading,
    error: questionnaireError,
    errorTraceId: questionnaireErrorTraceId,
    resolving,
    visible,
    missing,
    hasAnswers,
    loadQuestionnaire,
    loadCatalogItems,
    toggleOption,
    updateNumber,
    clearAnswers,
    loadReferenceScenario,
    resolveNow,
    snapshot,
  }
}
