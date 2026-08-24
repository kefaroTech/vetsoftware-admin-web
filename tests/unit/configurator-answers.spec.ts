import { describe, expect, it } from 'vitest'
import {
  buildResolveRequest,
  diffSelections,
  emptyAnswers,
  missingRequired,
  pruneAnswers,
  referenceScenario,
  selectOption,
  setNumericAnswer,
  visibleQuestions,
} from '@/features/configurator/composables/configurator-answers'
import type {
  ConfiguratorAnswerType,
  QuestionnaireQuestionResponse,
} from '@/features/configurator/types/configurator.types'

/**
 * El cuerpo de `POST /configurator/resolve` es donde se cotiza de menos: un
 * `optionId` de una rama que el prospecto no activó dispara su efecto, la
 * cotización se acepta, se vuelve contrato y devenga cargos — para cuando se
 * detecta ya no se corrige editando, se corrige con una nota crédito. El
 * backend lo rechaza con un 400 (`ConfiguratorAnswerCoherence`); estas pruebas
 * comprueban que el front no llega a mandarlo, que además ahorra cupo del
 * límite de 60 peticiones por minuto.
 */
function question(
  id: number,
  answerType: ConfiguratorAnswerType,
  extra: Partial<QuestionnaireQuestionResponse> = {},
): QuestionnaireQuestionResponse {
  return {
    id,
    code: `Q${String(id)}`,
    questionText: `Pregunta ${String(id)}`,
    helpText: null,
    answerType,
    parentOptionId: null,
    required: false,
    sortOrder: id,
    options: [],
    ...extra,
  }
}

function option(id: number, label = `Opción ${String(id)}`) {
  return { id, code: `O${String(id)}`, label, helpText: null, sortOrder: id }
}

/**
 * «¿Cobras en mostrador?» (SINGLE, obligatoria) → si sí, «¿Cuántas cajas?»
 * (NUMBER, obligatoria). Es el ejemplo con el que la especificación explica
 * `parent_option_id`.
 */
const CAJA = question(1, 'SINGLE', {
  required: true,
  options: [option(10, 'Sí, tengo punto de venta'), option(11, 'No')],
})
const CUANTAS = question(2, 'NUMBER', { required: true, parentOptionId: 10 })
const MODULOS = question(3, 'MULTI', { options: [option(30), option(31)] })
const ARBOL = [CAJA, CUANTAS, MODULOS]

describe('qué preguntas se ven', () => {
  it('la condicional no aparece hasta que su opción está marcada', () => {
    expect(visibleQuestions(ARBOL, emptyAnswers()).map((q) => q.id)).toEqual([1, 3])

    const conCaja = selectOption(ARBOL, emptyAnswers(), CAJA, 10, true)
    expect(visibleQuestions(ARBOL, conCaja).map((q) => q.id)).toEqual([1, 2, 3])
  })
})

describe('poda de respuestas inalcanzables', () => {
  it('cambiar la respuesta del padre se lleva por delante lo respondido debajo', () => {
    let answers = selectOption(ARBOL, emptyAnswers(), CAJA, 10, true)
    answers = setNumericAnswer(ARBOL, answers, 2, 3)
    expect(answers.numericAnswers).toEqual({ '2': 3 })

    // El prospecto se corrige: ya no cobra en mostrador.
    answers = selectOption(ARBOL, answers, CAJA, 11, true)
    expect(answers.selectedOptionIds).toEqual([11])
    expect(answers.numericAnswers).toEqual({})
  })

  it('descarta una respuesta numérica de una pregunta que no es NUMBER', () => {
    const answers = pruneAnswers(ARBOL, { selectedOptionIds: [], numericAnswers: { '1': 5 } })
    expect(answers.numericAnswers).toEqual({})
  })

  it('descarta un id de opción que el cuestionario ya no tiene', () => {
    const answers = pruneAnswers(ARBOL, { selectedOptionIds: [999], numericAnswers: {} })
    expect(answers.selectedOptionIds).toEqual([])
  })
})

describe('cardinalidad por tipo de respuesta', () => {
  it('SINGLE deja una sola opción marcada', () => {
    let answers = selectOption(ARBOL, emptyAnswers(), CAJA, 10, true)
    answers = selectOption(ARBOL, answers, CAJA, 11, true)
    expect(answers.selectedOptionIds).toEqual([11])
  })

  it('MULTI acumula', () => {
    let answers = selectOption(ARBOL, emptyAnswers(), MODULOS, 30, true)
    answers = selectOption(ARBOL, answers, MODULOS, 31, true)
    expect([...answers.selectedOptionIds].sort((a, b) => a - b)).toEqual([30, 31])
  })

  it('desmarcar quita solo esa opción', () => {
    let answers = selectOption(ARBOL, emptyAnswers(), MODULOS, 30, true)
    answers = selectOption(ARBOL, answers, MODULOS, 31, true)
    answers = selectOption(ARBOL, answers, MODULOS, 30, false)
    expect(answers.selectedOptionIds).toEqual([31])
  })
})

describe('el cuerpo que se envía', () => {
  it('indexa numericAnswers por id de pregunta, no por código', () => {
    let answers = selectOption(ARBOL, emptyAnswers(), CAJA, 10, true)
    answers = setNumericAnswer(ARBOL, answers, 2, 4)
    expect(buildResolveRequest(ARBOL, answers)).toEqual({
      selectedOptionIds: [10],
      numericAnswers: { '2': 4 },
    })
  })
})

describe('lo que falta por responder', () => {
  it('solo cuenta las obligatorias de una rama activa', () => {
    expect(missingRequired(ARBOL, emptyAnswers()).map((m) => m.questionId)).toEqual([1])

    const conCaja = selectOption(ARBOL, emptyAnswers(), CAJA, 10, true)
    expect(missingRequired(ARBOL, conCaja).map((m) => m.questionId)).toEqual([2])
  })

  it('el mensaje nombra la pregunta, para que el resumen distinga entre varias', () => {
    const [falta] = missingRequired(ARBOL, emptyAnswers())
    expect(falta?.message).toBe('Falta responder «Pregunta 1».')
  })
})

describe('escenario de referencia «Spa Ana Pet»', () => {
  it('responde todo lo visible bajando por las condicionales', () => {
    const escenario = referenceScenario(ARBOL)
    expect(escenario.selectedOptionIds).toContain(10)
    expect(escenario.selectedOptionIds).toContain(30)
    expect(escenario.numericAnswers).toEqual({ '2': 1 })
    expect(missingRequired(ARBOL, escenario)).toEqual([])
  })

  it('es fijo: dos ejecuciones dan el mismo escenario y por eso son comparables', () => {
    expect(referenceScenario(ARBOL)).toEqual(referenceScenario(ARBOL))
  })

  it('no inventa respuesta para una pregunta sin opciones, y esa queda delatada', () => {
    const rota = [question(1, 'SINGLE', { required: true, options: [] })]
    const escenario = referenceScenario(rota)
    expect(escenario.selectedOptionIds).toEqual([])
    expect(missingRequired(rota, escenario)).toHaveLength(1)
  })
})

describe('qué cambió al guardar', () => {
  it('marca cada diferencia con la palabra, no solo con un color', () => {
    const antes = [
      { catalogItemId: 1, quantity: 1 },
      { catalogItemId: 2, quantity: 1 },
      { catalogItemId: 4, quantity: 2 },
    ]
    const despues = [
      { catalogItemId: 1, quantity: 3 },
      { catalogItemId: 3, quantity: 1 },
      { catalogItemId: 4, quantity: 2 },
    ]
    expect(diffSelections(antes, despues)).toEqual([
      { catalogItemId: 1, before: 1, after: 3, change: 'QUANTITY', changeText: 'cantidad: 1 → 3' },
      { catalogItemId: 2, before: 1, after: null, change: 'REMOVED', changeText: 'QUITADO' },
      { catalogItemId: 3, before: null, after: 1, change: 'ADDED', changeText: 'AÑADIDO' },
      { catalogItemId: 4, before: 2, after: 2, change: 'SAME', changeText: '' },
    ])
  })
})
