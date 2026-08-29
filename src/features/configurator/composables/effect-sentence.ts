import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'
import {
  EFFECT_VERB,
  type ConfiguratorEffectResponse,
  type ConfiguratorEffectType,
  type ConfiguratorOptionResponse,
  type ConfiguratorQuestionResponse,
} from '../types/configurator.types'

/**
 * Un efecto, leído como una frase en castellano.
 *
 * <p>Es la mitad de la decisión de §3.6 que no se ve: la otra mitad es
 * `EffectSentence.vue`, que la deja editar. Esta función produce el MISMO texto
 * para las tres cosas que tienen que decir lo mismo — la lista del editor, el
 * modal de confirmación y el aviso — porque un efecto descrito de tres maneras
 * distintas obliga al comercial a traducir entre ellas, y traducir es donde se
 * equivoca.
 *
 * <p>Los códigos internos (`optionId`, `catalogItemId`, `SET_QUANTITY`) NO
 * aparecen: aparecen los rótulos. El código del artículo sí, entre paréntesis,
 * porque es el que el comercial ve en el catálogo y en la cotización.
 */

export interface EffectSentenceContext {
  optionById: Map<number, ConfiguratorOptionResponse>
  questionById: Map<number, ConfiguratorQuestionResponse>
  catalogItemById: Map<number, CatalogItemResponse>
}

/** «Terminal (TERMINAL)», o «artículo #12» si el catálogo todavía no trae ese id. */
export function catalogItemLabel(
  catalogItemId: number | null,
  catalogItemById: Map<number, CatalogItemResponse>,
): string {
  if (catalogItemId == null) return 'un artículo sin elegir'
  const item = catalogItemById.get(catalogItemId)
  return item ? `${item.name} (${item.code})` : `artículo #${String(catalogItemId)}`
}

/**
 * Lo mismo, pero partiendo del **código** del artículo.
 *
 * <p>Existen las dos y no una sola porque los dos lados del configurador
 * identifican el artículo de forma distinta, y ninguna de las dos es un error
 * que haya que unificar: un **efecto** (`ConfiguratorEffectResponse`) es una fila
 * de la consola de plataforma y sigue apuntando al `catalogItemId` interno,
 * mientras que un artículo **resuelto** (`SelectedItemResponse`) viene del
 * endpoint anónimo, que a propósito ya no expone ids internos. Colapsar las dos
 * en una obligaría a traducir código↔id justo donde el catálogo puede no estar
 * cargado, y esa traducción fallaría en silencio.
 *
 * <p>Si el catálogo aún no trae ese código, el rótulo lo dice con el código
 * delante —«artículo «TERMINAL»»— en vez de dejar la celda en `undefined`: el
 * código es un dato útil por sí solo, es el que el operador ve en el catálogo.
 */
export function catalogItemLabelByCode(
  code: string,
  catalogItemByCode: Map<string, CatalogItemResponse>,
): string {
  const item = catalogItemByCode.get(code)
  return item ? `${item.name} (${item.code})` : `artículo «${code}»`
}

/** El disparador, en palabras: la respuesta marcada o la pregunta numérica. */
export function triggerLabel(
  effect: Pick<ConfiguratorEffectResponse, 'optionId' | 'questionId'>,
  context: EffectSentenceContext,
): string {
  if (effect.optionId != null) {
    const option = context.optionById.get(effect.optionId)
    if (!option) return `la respuesta #${String(effect.optionId)}`
    const question = context.questionById.get(option.questionId)
    const from = question ? ` (de «${question.questionText}»)` : ''
    return `«${option.label}»${from}`
  }
  if (effect.questionId != null) {
    const question = context.questionById.get(effect.questionId)
    return question
      ? `«${question.questionText}» con un número`
      : `la pregunta #${String(effect.questionId)} con un número`
  }
  return 'una respuesta sin elegir'
}

/** La cola de la frase: lo que va detrás del artículo. */
export function quantityTail(effect: ConfiguratorEffectType, quantity: number | null): string {
  if (effect === 'SET_QUANTITY') return ` en ${quantity == null ? '—' : String(quantity)}`
  if (effect === 'QUANTITY_FROM_ANSWER') return ' en el número que escriba el cliente'
  return ''
}

/**
 * La frase completa. Es también el texto que se le enseña al operador en el
 * diálogo de confirmación, para que confirme lo que va a quedar escrito y no
 * una descripción distinta de lo mismo.
 */
export function describeEffect(
  effect: Pick<
    ConfiguratorEffectResponse,
    'optionId' | 'questionId' | 'catalogItemId' | 'effect' | 'quantity'
  >,
  context: EffectSentenceContext,
): string {
  const trigger = triggerLabel(effect, context)
  const verb = EFFECT_VERB[effect.effect]
  const item = catalogItemLabel(effect.catalogItemId, context.catalogItemById)
  return `Si responde ${trigger} → ${verb} ${item}${quantityTail(effect.effect, effect.quantity)}.`
}

/** El borrador que edita `EffectSentence.vue`. Cadenas, como el resto de formularios del repo. */
export interface EffectDraft {
  /** `'o:<id>'` para una respuesta marcada, `'q:<id>'` para una pregunta numérica, `''` sin elegir. */
  trigger: string
  effect: ConfiguratorEffectType | ''
  catalogItemId: number | null
  quantity: string
}

/** Una entrada del desplegable de disparadores. `numeric` distingue las preguntas NUMBER. */
export interface EffectTriggerOption {
  value: string
  label: string
  numeric: boolean
}

/** Traduce el valor del desplegable al par de ids que espera el contrato. */
export function parseTrigger(trigger: string): {
  optionId: number | null
  questionId: number | null
} {
  const [kind, raw] = trigger.split(':')
  const id = Number(raw)
  if (!raw || Number.isNaN(id)) return { optionId: null, questionId: null }
  if (kind === 'o') return { optionId: id, questionId: null }
  if (kind === 'q') return { optionId: null, questionId: id }
  return { optionId: null, questionId: null }
}
