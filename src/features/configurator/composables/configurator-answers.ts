import type {
  QuestionnaireOptionResponse,
  QuestionnaireQuestionResponse,
  ResolveConfiguratorSelectionRequest,
  SelectedItemResponse,
} from '../types/configurator.types'

/**
 * La lógica pura del asistente de venta: qué preguntas se ven, qué cuerpo se
 * manda y qué cambió entre dos carritos.
 *
 * <p>Vive aparte de los composables y de los componentes **porque es donde se
 * cotiza de menos**: un cuerpo mal armado no da una excepción, da una
 * cotización equivocada. Al ser funciones puras se prueban sin montar nada ni
 * levantar el backend (`tests/unit/configurator-answers.spec.ts`).
 *
 * <p>Las cuatro reglas que el backend impone al cuerpo de
 * `POST /configurator/resolve` y que aquí se respetan **antes** de gastar una
 * de las 60 peticiones por minuto que permite el límite de tasa
 * (`ConfiguratorAnswerCoherence` del backend):
 *
 * <ol>
 *   <li><b>Nada inalcanzable.</b> Responder una pregunta cuya rama no se
 *       activó es 400 `CONFIGURATOR_ANSWER_UNREACHABLE`. Por eso las
 *       respuestas se PODAN en cada cambio: desmarcar «Sí, cobro en mostrador»
 *       tiene que llevarse por delante lo que se respondió debajo.</li>
 *   <li><b>Nada en la forma equivocada.</b> `NUMBER` admite un número y
 *       ninguna opción; `SINGLE` y `BOOLEAN` admiten <b>como mucho una</b>
 *       opción y ningún número; `MULTI` admite varias.</li>
 *   <li><b>Nada que falte.</b> Una pregunta obligatoria y alcanzable sin
 *       responder es 400.</li>
 *   <li><b>El índice de `numericAnswers` es el id de la pregunta</b>, en
 *       texto, no su código.</li>
 * </ol>
 */

/** Lo que el operador lleva respondido. Es el estado, no el cuerpo de la petición. */
export interface ConfiguratorAnswerState {
  selectedOptionIds: number[]
  /** Indexado por id de pregunta en texto, como exige el contrato. */
  numericAnswers: Record<string, number>
}

export interface MissingAnswer {
  questionId: number
  code: string
  questionText: string
  /**
   * El texto del error, UNA sola vez.
   *
   * El mensaje en línea bajo la pregunta y el del `ErrorSummary` de la cabecera
   * tienen que ser literalmente el mismo string (GOV.UK, *Validation pattern*):
   * si se reformulan, el usuario cree que son dos problemas. Nombra la pregunta
   * porque el resumen enumera varias y «Falta responder» repetido cuatro veces
   * no distingue ninguna.
   */
  message: string
}

export type SelectionChange = 'ADDED' | 'REMOVED' | 'QUANTITY' | 'SAME'

export interface SelectionDiffRow {
  catalogItemId: number
  before: number | null
  after: number | null
  change: SelectionChange
  /**
   * La diferencia **en palabras**, que es el requisito de accesibilidad de la
   * especificación (§5.2): «AÑADIDO», «QUITADO», «cantidad: 1 → 3». Un color
   * de fondo no es un portador válido de información (WCAG 2.2 §1.4.1).
   */
  changeText: string
}

export function emptyAnswers(): ConfiguratorAnswerState {
  return { selectedOptionIds: [], numericAnswers: {} }
}

type IndexedOption = QuestionnaireOptionResponse & { questionId: number }

function optionIndex(questions: QuestionnaireQuestionResponse[]): Map<number, IndexedOption> {
  const index = new Map<number, IndexedOption>()
  for (const question of questions) {
    for (const option of question.options) {
      index.set(option.id, { ...option, questionId: question.id })
    }
  }
  return index
}

/**
 * Si la rama de la pregunta está activa con esas opciones marcadas.
 *
 * Sube encadenando `parentOptionId → questionId` hasta la raíz, igual que
 * `ConfiguratorAnswerCoherence.alcanceDe` del backend. El conjunto de
 * visitadas evita colgarse con un ciclo en los datos: allí es una excepción
 * con nombre propio, aquí sería un bucle infinito en el navegador.
 */
export function isReachable(
  question: QuestionnaireQuestionResponse,
  questions: QuestionnaireQuestionResponse[],
  selected: ReadonlySet<number>,
): boolean {
  const options = optionIndex(questions)
  const byId = new Map(questions.map((q) => [q.id, q]))
  const visited = new Set<number>()
  let current: QuestionnaireQuestionResponse | undefined = question
  while (current) {
    if (visited.has(current.id)) return false
    visited.add(current.id)
    const parentOptionId = current.parentOptionId
    if (parentOptionId == null) return true
    if (!selected.has(parentOptionId)) return false
    const parentOption = options.get(parentOptionId)
    if (!parentOption) return false
    current = byId.get(parentOption.questionId)
  }
  return false
}

/** Las preguntas que el asistente muestra ahora mismo, en orden de `sortOrder`. */
export function visibleQuestions(
  questions: QuestionnaireQuestionResponse[],
  answers: ConfiguratorAnswerState,
): QuestionnaireQuestionResponse[] {
  const selected = new Set(answers.selectedOptionIds)
  return [...questions]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .filter((question) => isReachable(question, questions, selected))
}

/**
 * Quita lo respondido en ramas que ya no están activas.
 *
 * Se aplica en CADA cambio de respuesta, no solo antes de enviar: si no, el
 * estado y lo que se ve en pantalla dejan de coincidir y el operador cree que
 * sigue contestada una pregunta que desapareció.
 *
 * Poda por punto fijo porque una poda abre la siguiente: al soltar la opción
 * de primer nivel, las de segundo dejan de ser alcanzables, y con ellas las de
 * tercero.
 */
export function pruneAnswers(
  questions: QuestionnaireQuestionResponse[],
  answers: ConfiguratorAnswerState,
): ConfiguratorAnswerState {
  let current = answers
  for (let pass = 0; pass <= questions.length; pass++) {
    const visible = visibleQuestions(questions, current)
    const allowedOptions = new Set<number>()
    for (const question of visible) {
      if (question.answerType === 'NUMBER') continue
      for (const option of question.options) allowedOptions.add(option.id)
    }
    const numericQuestionIds = new Set(
      visible.filter((q) => q.answerType === 'NUMBER').map((q) => String(q.id)),
    )
    const selectedOptionIds = current.selectedOptionIds.filter((id) => allowedOptions.has(id))
    const numericAnswers: Record<string, number> = {}
    for (const [key, value] of Object.entries(current.numericAnswers)) {
      if (numericQuestionIds.has(key)) numericAnswers[key] = value
    }
    const unchanged =
      selectedOptionIds.length === current.selectedOptionIds.length &&
      Object.keys(numericAnswers).length === Object.keys(current.numericAnswers).length
    current = { selectedOptionIds, numericAnswers }
    if (unchanged) break
  }
  return current
}

/**
 * Marca o desmarca una opción respetando la cardinalidad del tipo de pregunta.
 *
 * `SINGLE` y `BOOLEAN` sueltan la que hubiera: el backend rechaza dos marcadas
 * de la misma pregunta con un 400, y con radios nativos no puede ocurrir por
 * accidente — pero esta función es la que garantiza que tampoco ocurra al
 * restaurar un escenario, que es cuando el marcado no interviene.
 */
export function selectOption(
  questions: QuestionnaireQuestionResponse[],
  answers: ConfiguratorAnswerState,
  question: QuestionnaireQuestionResponse,
  optionId: number,
  checked: boolean,
): ConfiguratorAnswerState {
  const siblings = new Set(question.options.map((option) => option.id))
  const kept = answers.selectedOptionIds.filter((id) =>
    question.answerType === 'MULTI' ? id !== optionId : !siblings.has(id),
  )
  const next = checked ? [...kept, optionId] : kept
  return pruneAnswers(questions, { ...answers, selectedOptionIds: next })
}

export function setNumericAnswer(
  questions: QuestionnaireQuestionResponse[],
  answers: ConfiguratorAnswerState,
  questionId: number,
  value: number | null,
): ConfiguratorAnswerState {
  const numericAnswers: Record<string, number> = {}
  for (const [key, current] of Object.entries(answers.numericAnswers)) {
    if (key !== String(questionId)) numericAnswers[key] = current
  }
  if (value != null) numericAnswers[String(questionId)] = value
  return pruneAnswers(questions, { ...answers, numericAnswers })
}

/** Preguntas obligatorias, visibles y sin responder. Se comprueba ANTES de gastar una petición. */
export function missingRequired(
  questions: QuestionnaireQuestionResponse[],
  answers: ConfiguratorAnswerState,
): MissingAnswer[] {
  const selected = new Set(answers.selectedOptionIds)
  return visibleQuestions(questions, answers)
    .filter((question) => question.required)
    .filter((question) =>
      question.answerType === 'NUMBER'
        ? !(String(question.id) in answers.numericAnswers)
        : !question.options.some((option) => selected.has(option.id)),
    )
    .map((question) => ({
      questionId: question.id,
      code: question.code,
      questionText: question.questionText,
      message:
        question.answerType === 'NUMBER'
          ? `Falta escribir un número en «${question.questionText}».`
          : `Falta responder «${question.questionText}».`,
    }))
}

/** El cuerpo de `POST /configurator/resolve`, ya podado. */
export function buildResolveRequest(
  questions: QuestionnaireQuestionResponse[],
  answers: ConfiguratorAnswerState,
): ResolveConfiguratorSelectionRequest {
  const pruned = pruneAnswers(questions, answers)
  return {
    selectedOptionIds: [...pruned.selectedOptionIds].sort((a, b) => a - b),
    numericAnswers: pruned.numericAnswers,
  }
}

/**
 * El escenario de referencia, «Spa Ana Pet».
 *
 * <p><b>Es una regla, no una lista de códigos escritos a mano.</b> Se responde
 * la PRIMERA opción de cada pregunta visible y un `1` en cada campo numérico,
 * bajando por las condicionales hasta que no se abre ninguna rama nueva.
 *
 * <p>Se hace así, y no con un `['POS_SI', 'HISTORIA_SI', …]` fijo, porque el
 * cuestionario es datos: los códigos los escribe un comercial y hoy la
 * plataforma arranca **sin catálogo sembrado** (especificación §3.7). Un
 * escenario atado a códigos concretos saldría vacío en cuanto alguien
 * renombrara uno, y saldría vacío siempre hasta que se siembre — sin decir por
 * qué. La regla, en cambio, es igual de fija —dos ejecuciones separadas en el
 * tiempo dan el mismo escenario, que es lo que las hace comparables— y
 * funciona sobre cualquier cuestionario.
 *
 * <p>Una pregunta sin opciones que no sea `NUMBER` se deja sin responder: no
 * hay forma de responderla. Si además es obligatoria, `missingRequired` la
 * delata, que es justo lo que hay que ver.
 */
export function referenceScenario(
  questions: QuestionnaireQuestionResponse[],
): ConfiguratorAnswerState {
  let answers = emptyAnswers()
  for (let pass = 0; pass <= questions.length; pass++) {
    const pending = visibleQuestions(questions, answers).filter((question) =>
      question.answerType === 'NUMBER'
        ? !(String(question.id) in answers.numericAnswers)
        : !question.options.some((option) => answers.selectedOptionIds.includes(option.id)),
    )
    if (pending.length === 0) break
    let changed = false
    for (const question of pending) {
      if (question.answerType === 'NUMBER') {
        answers = setNumericAnswer(questions, answers, question.id, 1)
        changed = true
        continue
      }
      const [first] = [...question.options].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      if (!first) continue
      answers = selectOption(questions, answers, question, first.id, true)
      changed = true
    }
    if (!changed) break
  }
  return answers
}

/**
 * Qué cambió entre dos carritos, **con la palabra** y no solo con un color.
 *
 * Devuelve la unión de artículos de los dos lados, ordenada por id para que dos
 * ejecuciones iguales den la misma tabla — el mismo criterio con el que el
 * backend ordena `ConfiguratorResolver.resolve`.
 */
export function diffSelections(
  before: SelectedItemResponse[],
  after: SelectedItemResponse[],
): SelectionDiffRow[] {
  const beforeById = new Map(before.map((item) => [item.catalogItemId, item.quantity]))
  const afterById = new Map(after.map((item) => [item.catalogItemId, item.quantity]))
  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])].sort((a, b) => a - b)

  return ids.map((catalogItemId) => {
    const antes = beforeById.get(catalogItemId) ?? null
    const despues = afterById.get(catalogItemId) ?? null
    if (antes == null && despues != null) {
      return { catalogItemId, before: null, after: despues, change: 'ADDED', changeText: 'AÑADIDO' }
    }
    if (antes != null && despues == null) {
      return { catalogItemId, before: antes, after: null, change: 'REMOVED', changeText: 'QUITADO' }
    }
    if (antes !== despues) {
      return {
        catalogItemId,
        before: antes,
        after: despues,
        change: 'QUANTITY',
        changeText: `cantidad: ${String(antes)} → ${String(despues)}`,
      }
    }
    return { catalogItemId, before: antes, after: despues, change: 'SAME', changeText: '' }
  })
}

/** Cuántas diferencias reales hay. Cero es una respuesta legítima y hay que decirla. */
export function countChanges(rows: SelectionDiffRow[]): number {
  return rows.filter((row) => row.change !== 'SAME').length
}
