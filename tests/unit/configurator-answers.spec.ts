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
    expect(buildResolveRequest(ARBOL, answers, 'MONTHLY')).toEqual({
      selectedOptionIds: [10],
      numericAnswers: { '2': 4 },
      billingCycle: 'MONTHLY',
    })
  })

  /**
   * El ciclo no es decorativo: el techo de capacidad incluida es una columna de
   * la fila de precio y hay una por ciclo, así que las mismas respuestas
   * resueltas en anual pueden devolver otras cantidades. Si el cuerpo no lo
   * llevara —o lo llevara siempre fijo— el servidor restaría un techo mensual de
   * una cotización anual y devolvería un número plausible que nadie contradice.
   */
  it('viaja el ciclo elegido y no uno fijo', () => {
    const answers = selectOption(ARBOL, emptyAnswers(), CAJA, 11, true)
    expect(buildResolveRequest(ARBOL, answers, 'ANNUAL').billingCycle).toBe('ANNUAL')
    expect(buildResolveRequest(ARBOL, answers, 'MONTHLY').billingCycle).toBe('MONTHLY')
  })

  it('el ciclo es lo ÚNICO que cambia entre dos cuerpos con las mismas respuestas', () => {
    let answers = selectOption(ARBOL, emptyAnswers(), CAJA, 10, true)
    answers = setNumericAnswer(ARBOL, answers, 2, 4)
    const mensual = buildResolveRequest(ARBOL, answers, 'MONTHLY')
    const anual = buildResolveRequest(ARBOL, answers, 'ANNUAL')
    expect({ ...mensual, billingCycle: 'ANNUAL' }).toEqual(anual)
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

/**
 * <b>Estas filas se identifican por `code` y no por `catalogItemId`.</b> No es
 * una preferencia: `/configurator/resolve` es anónimo y devolver el id interno
 * `int64` lo convertía en un oráculo de enumeración del catálogo, así que el
 * contrato lo retiró y puso el código. La versión anterior de esta prueba
 * afirmaba la forma del defecto —comparaba por un campo que el servidor ya no
 * manda— y habría seguido en verde mientras la tabla se llenaba de `undefined`.
 */
describe('qué cambió al guardar', () => {
  it('marca cada diferencia con la palabra, no solo con un color', () => {
    const antes = [
      { code: 'AGENDA', quantity: 1 },
      { code: 'CAJA', quantity: 1 },
      { code: 'TERMINAL', quantity: 2 },
    ]
    const despues = [
      { code: 'AGENDA', quantity: 3 },
      { code: 'HISTORIA', quantity: 1 },
      { code: 'TERMINAL', quantity: 2 },
    ]
    expect(diffSelections(antes, despues)).toEqual([
      { code: 'AGENDA', before: 1, after: 3, change: 'QUANTITY', changeText: 'cantidad: 1 → 3' },
      { code: 'CAJA', before: 1, after: null, change: 'REMOVED', changeText: 'QUITADO' },
      { code: 'HISTORIA', before: null, after: 1, change: 'ADDED', changeText: 'AÑADIDO' },
      { code: 'TERMINAL', before: 2, after: 2, change: 'SAME', changeText: '' },
    ])
  })

  /**
   * El orden lo fija el código y no el orden de llegada: dos ejecuciones de la
   * misma comparación tienen que dar la misma tabla o dejan de ser comparables.
   */
  it('ordena por código, no por el orden en que vinieron', () => {
    const filas = diffSelections(
      [
        { code: 'TERMINAL', quantity: 1 },
        { code: 'AGENDA', quantity: 1 },
      ],
      [
        { code: 'CAJA', quantity: 1 },
        { code: 'AGENDA', quantity: 1 },
      ],
    )
    expect(filas.map((row) => row.code)).toEqual(['AGENDA', 'CAJA', 'TERMINAL'])
  })
})
