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
  /** Orden de aplicación, ascendente. A igualdad, desempata el id. */
  priority: number
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
 * El ciclo de facturación con el que se resuelve una selección.
 *
 * <p>Se declara **aquí** y no se importa de `commercial-catalog` ni de `quotes`,
 * que ya tienen el suyo: cada uno espeja un campo distinto del contrato y su
 * atadura `MatchesContract` tiene que fallar por separado. Si el backend
 * añadiera un tercer ciclo a `/configurator/resolve` y no a las cotizaciones,
 * una unión compartida haría pasar en verde justamente el sitio que se movió.
 *
 * <p><b>Ojo con el reverso</b>, igual que en `QuoteBillingCycle`: el contrato
 * declara el campo como `string` con `pattern`, así que un ciclo NUEVO no rompe
 * esta unión — hay que ampliarla a mano.
 */
export type ConfiguratorBillingCycle = 'MONTHLY' | 'ANNUAL'

export const CONFIGURATOR_BILLING_CYCLE_LABEL: Record<ConfiguratorBillingCycle, string> = {
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
}

export const CONFIGURATOR_BILLING_CYCLE_OPTIONS: {
  value: ConfiguratorBillingCycle
  label: string
}[] = [
  { value: 'MONTHLY', label: CONFIGURATOR_BILLING_CYCLE_LABEL.MONTHLY },
  { value: 'ANNUAL', label: CONFIGURATOR_BILLING_CYCLE_LABEL.ANNUAL },
]

/**
 * `POST /configurator/resolve` — cuerpo.
 *
 * `numericAnswers` va **indexado por id de pregunta** (no por código): el
 * backend lo lee como `answers.numericAnswers().containsKey(questionId)`
 * (`ConfiguratorResolver.seDispara`). JSON obliga a que la clave sea string,
 * así que aquí es `Record<string, number>` con el id en texto.
 *
 * <p><b>`billingCycle` es obligatorio y no tiene valor por defecto en el tipo.</b>
 * El techo de capacidad incluida es una columna de la **fila de precio**, y hay
 * una por ciclo: resolver sin decir el ciclo permitía restar un techo mensual de
 * una cotización anual y devolver dos números igual de plausibles que nunca se
 * contradicen en voz alta. Por eso el campo viaja explícito desde quien llama en
 * vez de tener un `= 'MONTHLY'` escondido aquí: un valor por defecto reintroduce
 * exactamente el fallo silencioso que el contrato acaba de cerrar.
 */
export interface ResolveConfiguratorSelectionRequest {
  selectedOptionIds: number[]
  numericAnswers: Record<string, number>
  billingCycle: ConfiguratorBillingCycle
}

/**
 * Un artículo del carrito resuelto.
 *
 * <p><b>Lleva `code`, no `catalogItemId`.</b> El endpoint es anónimo: devolver
 * el id interno `int64` del artículo convertía `/configurator/resolve` en un
 * oráculo de enumeración —pedir y contar hasta dibujar el catálogo entero, y de
 * paso su tamaño y su ritmo de crecimiento— sin autenticarse. El `code` es el
 * mismo rótulo que ya aceptan `/catalog` y `/quotes/self-serve`, así que además
 * es el que sirve para construir la línea de la cotización.
 */
export interface SelectedItemResponse {
  code: string
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

/**
 * Una fila del reordenamiento: «este efecto pasa a aplicarse en esta posición».
 *
 * <p>`priority` es el orden **de aplicación, ascendente**, y el backend lo acota
 * a `0..9999` (`@Min`/`@Max` de `EffectPriorityRequest`). A igualdad de
 * prioridad desempata el `id`, así que dos efectos con el mismo número no son un
 * empate irresoluble — pero tampoco un orden que nadie eligió, y por eso la
 * pantalla renumera siempre la lista entera en vez de mandar solo lo que se
 * movió.
 */
export interface EffectPriorityRequest {
  effectId: number
  priority: number
}

/** `PUT /configurator/effects/priorities` — cuerpo. `minItems: 1` en el contrato. */
export interface ReorderConfiguratorEffectsRequest {
  priorities: EffectPriorityRequest[]
}
