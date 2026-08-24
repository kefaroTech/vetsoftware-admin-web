/**
 * Tipos del configurador — el asistente de venta.
 *
 * El cuestionario es **datos, no código**: las preguntas, sus opciones y lo
 * que cada respuesta mete en el carrito son filas que un comercial edita sin
 * desplegar nada (`docs/ux/suscripciones-consola-especificacion.md` §3.6).
 *
 * Los nombres son los del contrato (`api/openapi.json`) para que
 * `MatchesContract<X, 'X'>` en `src/types/api.contract.ts` se lea igual en los
 * dos repositorios y una deriva del backend falle con el nombre a la vista.
 */

/**
 * Cómo se responde una pregunta (`AnswerType` del backend).
 *
 * `BOOLEAN` es «sí o no» **modelado como dos opciones**, no un booleano suelto:
 * el cuerpo de `POST /configurator/resolve` solo sabe de `selectedOptionIds` y
 * `numericAnswers`, así que un BOOLEAN sin opciones cargadas no puede influir
 * en el resultado. Ver `ConfiguratorAnswerCoherence.assertTypesFit` en el
 * backend.
 */
export type ConfiguratorAnswerType = 'SINGLE' | 'MULTI' | 'NUMBER' | 'BOOLEAN'

/** Qué le hace una respuesta al carrito (`EffectType` del backend). */
export type ConfiguratorEffectType = 'ADD' | 'REMOVE' | 'SET_QUANTITY' | 'QUANTITY_FROM_ANSWER'

export interface ConfiguratorQuestionResponse {
  id: number
  code: string
  questionText: string
  helpText: string | null
  answerType: ConfiguratorAnswerType
  /** Condicional: la pregunta solo se muestra si esta opción está marcada. */
  parentOptionId: number | null
  required: boolean
  sortOrder: number
  createdDate: string
  enabled: boolean
  /**
   * Las opciones activas de la pregunta, que el servidor ya trae en la misma respuesta
   * (incidencia #448). <b>Obligatorio, no opcional</b>: en las preguntas `NUMBER` viaja como lista
   * vacía, nunca nula, así que recorrerla siempre es seguro y no hace falta una segunda llamada
   * por pregunta para pintar el cuestionario.
   */
  options: ConfiguratorOptionResponse[]
}

export interface CreateConfiguratorQuestionRequest {
  code: string
  questionText: string
  helpText: string | null
  answerType: ConfiguratorAnswerType
  parentOptionId: number | null
  required: boolean
  sortOrder: number
}

/** El código no se cambia: identifica la pregunta en las respuestas ya guardadas. */
export type UpdateConfiguratorQuestionRequest = Omit<CreateConfiguratorQuestionRequest, 'code'>

export interface ConfiguratorOptionResponse {
  id: number
  questionId: number
  code: string
  label: string
  helpText: string | null
  sortOrder: number
  createdDate: string
  enabled: boolean
}

export interface CreateConfiguratorOptionRequest {
  questionId: number
  code: string
  label: string
  helpText: string | null
  sortOrder: number
}

export type UpdateConfiguratorOptionRequest = Omit<
  CreateConfiguratorOptionRequest,
  'questionId' | 'code'
>

/**
 * Un efecto lo dispara **o** una opción marcada **o** una pregunta numérica
 * respondida, nunca las dos: es la invariante de `ConfiguratorEffect` en el
 * backend, y `ConfiguratorResolver.seDispara` la da por cierta.
 */
export interface ConfiguratorEffectResponse {
  id: number
  optionId: number | null
  questionId: number | null
  catalogItemId: number
  effect: ConfiguratorEffectType
  quantity: number | null
  createdDate: string
  enabled: boolean
}

export interface CreateConfiguratorEffectRequest {
  optionId: number | null
  questionId: number | null
  catalogItemId: number
  effect: ConfiguratorEffectType
  quantity: number | null
}

/** El disparador no se cambia: se borra el efecto y se crea otro. */
export type UpdateConfiguratorEffectRequest = Omit<
  CreateConfiguratorEffectRequest,
  'optionId' | 'questionId'
>

/** `GET /configurator/questionnaire` — lo que ve el prospecto, sin ids internos de más. */
export interface QuestionnaireOptionResponse {
  id: number
  code: string
  label: string
  helpText: string | null
  sortOrder: number
}

export interface QuestionnaireQuestionResponse {
  id: number
  code: string
  questionText: string
  helpText: string | null
  answerType: ConfiguratorAnswerType
  parentOptionId: number | null
  required: boolean
  sortOrder: number
  options: QuestionnaireOptionResponse[]
}

/**
 * `POST /configurator/resolve` — cuerpo.
 *
 * `numericAnswers` va **indexado por id de pregunta** (no por código): el
 * backend lo lee como `answers.numericAnswers().containsKey(questionId)`
 * (`ConfiguratorResolver.seDispara`). JSON obliga a que la clave sea string,
 * así que aquí es `Record<string, number>` con el id en texto.
 */
export interface ResolveConfiguratorSelectionRequest {
  selectedOptionIds: number[]
  numericAnswers: Record<string, number>
}

export interface SelectedItemResponse {
  catalogItemId: number
  quantity: number
}

export interface ConfiguratorSelectionResponse {
  items: SelectedItemResponse[]
}

export const ANSWER_TYPE_LABEL: Record<ConfiguratorAnswerType, string> = {
  SINGLE: 'Una sola opción',
  MULTI: 'Varias opciones',
  NUMBER: 'Un número',
  BOOLEAN: 'Sí o no',
}

export const ANSWER_TYPE_OPTIONS: { value: ConfiguratorAnswerType; label: string }[] = [
  { value: 'SINGLE', label: ANSWER_TYPE_LABEL.SINGLE },
  { value: 'MULTI', label: ANSWER_TYPE_LABEL.MULTI },
  { value: 'NUMBER', label: ANSWER_TYPE_LABEL.NUMBER },
  { value: 'BOOLEAN', label: ANSWER_TYPE_LABEL.BOOLEAN },
]

/**
 * El verbo de cada efecto, en castellano y sin códigos visibles
 * (especificación §3.6, tabla de los cuatro efectos). Es la mitad izquierda de
 * la frase con huecos: «… → [fija la cantidad de] [Terminal] en [3]».
 */
export const EFFECT_VERB: Record<ConfiguratorEffectType, string> = {
  ADD: 'añade',
  REMOVE: 'quita',
  SET_QUANTITY: 'fija la cantidad de',
  QUANTITY_FROM_ANSWER: 'fija la cantidad de',
}

export const EFFECT_TYPE_OPTIONS: { value: ConfiguratorEffectType; label: string }[] = [
  { value: 'ADD', label: 'añade' },
  { value: 'REMOVE', label: 'quita' },
  { value: 'SET_QUANTITY', label: 'fija la cantidad de' },
  { value: 'QUANTITY_FROM_ANSWER', label: 'fija la cantidad, con el número del cliente, de' },
]
