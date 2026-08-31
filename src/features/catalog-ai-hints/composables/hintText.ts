import { formatDate } from '@/composables/format'
import type { CatalogItemAiHintResponse } from '../types/catalog-ai-hints.types'

/**
 * La regla de la pista, escrita UNA vez y sin nada de Vue.
 *
 * <p>Aquí vive todo lo que se puede comprobar sin montar un componente: partir y
 * unir bloques, validar, nombrar el sujeto de una acción, etiquetar una revisión
 * del historial y componer su pie de procedencia. Que sea un módulo puro es lo
 * que permite que `tests/unit/hint-text.spec.ts` cubra la lógica de verdad en
 * vez de la plantilla que la pinta.
 */

/** `CatalogItemAiHint.MAX_HINT_TEXT` y el `@Size(max = …)` de los dos requests. */
export const HINT_MAX_LENGTH = 1000

/** `CatalogItemAiHint.PARTES_DE_LA_PISTA`: al menos tres bloques. */
export const HINT_MIN_BLOCKS = 3

/**
 * Espejo de `"\\R\\s*\\R"` en `CatalogItemAiHint.exigirLasTresPartes`.
 *
 * <p>Se escribe igual a propósito: si el cliente partiera de otra forma que el
 * servidor, un texto que aquí sale en verde se rechazaría allí — y al revés, que
 * es peor, porque el operador vería un error sobre un texto que sí cumple.
 */
const BLOQUE = /\r?\n\s*\r?\n/

/** Los bloques no vacíos del texto, ya recortados. */
export function splitBlocks(text: string): string[] {
  return text
    .split(BLOQUE)
    .map((bloque) => bloque.trim())
    .filter((bloque) => bloque !== '')
}

/** Une los campos con exactamente una línea en blanco entre ellos. */
export function joinBlocks(blocks: string[]): string {
  return blocks.map((bloque) => bloque.trim()).join('\n\n')
}

/**
 * El primer bloque, para la columna del listado.
 *
 * <p>El encabezado de esa columna dice «Primer bloque» y no «Definición»: que el
 * primero sea la definición es la convención de las catorce pistas sembradas por
 * el changeset 382, no una invariante — el dominio exige estructura y no
 * vocabulario, y su javadoc explica por qué.
 */
export function hintFirstBlock(text: string): string {
  return splitBlocks(text)[0] ?? ''
}

/** Lo mínimo que hace falta para nombrar el artículo de una pista. */
type SujetoDeLaPista = Pick<
  CatalogItemAiHintResponse,
  'catalogItemId' | 'catalogItemCode' | 'catalogItemName'
>

/**
 * <b>El punto ÚNICO donde se decide qué forma toma el sujeto.</b>
 *
 * <p>Los dos primeros campos son nulables, así que el sujeto sale en una de dos
 * formas con GRAMÁTICA DISTINTA: un nombre propio («Peluquería») o un
 * descriptor genérico que pide artículo determinado («artículo #42»). Esa
 * diferencia arrastra dos consecuencias —si contrae detrás de «de» y si se
 * puede entrecomillar— y las dos se resuelven <b>aquí</b>, no en los rótulos.
 *
 * <p>Repartir la regla entre los llamadores es exactamente lo que produjo
 * «Retirar la pista de el artículo #903»: tres `aria-label` interpolaban el
 * sujeto detrás de una preposición sin saber cuál de las dos formas les tocaba,
 * y la contracción del español —obligatoria— no la hacía nadie. Lo oye justo
 * quien depende del lector de pantalla, porque esos tres botones son iconos sin
 * texto visible.
 */
function formaDelSujeto(hint: SujetoDeLaPista): { texto: string; esNombre: boolean } {
  const nombrado = hint.catalogItemName ?? hint.catalogItemCode
  return nombrado !== null
    ? { texto: nombrado, esNombre: true }
    : { texto: `artículo #${hint.catalogItemId}`, esNombre: false }
}

/**
 * El sujeto <b>ya preposicionado con «de»</b>, con la contracción resuelta.
 *
 * <p>Es lo que consumen los rótulos de la forma «… la pista {sujeto}». Devuelve
 * la preposición dentro a propósito: si devolviera solo el sujeto, cada
 * llamador tendría que volver a decidir si escribe «de» o «del», que es el
 * defecto que esta función existe para hacer imposible.
 */
export function deSujeto(hint: SujetoDeLaPista): string {
  const { texto, esNombre } = formaDelSujeto(hint)
  return esNombre ? `de ${texto}` : `del ${texto}`
}

/**
 * Igual que {@link deSujeto}, pero entrecomillando <b>solo lo que es un nombre
 * de verdad</b>. Lo usa la pregunta del diálogo de retirada.
 *
 * <p>Las comillas angulares delimitan dónde empieza y acaba un nombre largo, y
 * para eso sirven. Un descriptor genérico no es un nombre: «el artículo #903»
 * entre comillas se lee como si lo fuera, y además obliga a escribir «de» sin
 * contraer para no romper la cita. Por eso el caso sin nombre sale sin comillas
 * y con la contracción hecha.
 */
export function deSujetoEntrecomillado(hint: SujetoDeLaPista): string {
  const { texto, esNombre } = formaDelSujeto(hint)
  return esNombre ? `de «${texto}»` : `del ${texto}`
}

/** El sujeto a secas, prefiriendo el código: es lo que titula los modales. */
export function sujetoCorto(hint: SujetoDeLaPista): string {
  return hint.catalogItemCode ?? hint.catalogItemName ?? `#${hint.catalogItemId}`
}

/**
 * El código entre paréntesis que sigue al sujeto en la pregunta del diálogo de
 * retirada — <b>o cadena vacía cuando no desambiguaría nada</b>.
 *
 * <p>El paréntesis existe para decir el código cuando el sujeto es un NOMBRE:
 * «¿Retirar la pista vigente de «Peluquería» (GROOMING)?» contesta dos
 * preguntas distintas. Pero {@link sujetoCorto} tiene sus propios respaldos, y
 * en tres de las cuatro combinaciones acaba repitiendo lo que el sujeto ya
 * dijo:
 *
 * <ul>
 *   <li>sin nombre → «de «GROOMING» (GROOMING)»</li>
 *   <li>sin código → «de «Peluquería» (Peluquería)»</li>
 *   <li>sin ninguno → «del artículo #903 (#903)»</li>
 * </ul>
 *
 * <p>Repetir el identificador en la frase que confirma una acción destructiva
 * hace dudar de si el sistema sabe qué va a apagar, que es lo último que debe
 * pasar ahí. La condición vive junto a {@link formaDelSujeto} a propósito: es
 * su hermana —depende de qué forma tomó el sujeto— y repartirla entre la
 * plantilla y este módulo es el reparto que ya produjo el «de el artículo».
 */
export function parentesisDelCodigo(hint: SujetoDeLaPista): string {
  const { texto, esNombre } = formaDelSujeto(hint)
  // Sin nombre el sujeto YA es el identificador: el paréntesis lo repetiría.
  if (!esNombre) return ''
  // Con nombre, pero `sujetoCorto` cayó al mismo texto por falta de código.
  const corto = sujetoCorto(hint)
  return corto === texto ? '' : ` (${corto})`
}

/** Los rótulos de los tres bloques, en el orden del formulario. */
export const HINT_BLOCK_LABELS = [
  'Qué es este artículo',
  'Qué señales lo activan',
  'Cuándo NO aplica',
] as const

/** Las ayudas, tomadas del javadoc del dominio y no de mi cosecha. */
export const HINT_BLOCK_HINTS = [
  'En palabras del negocio, como lo diría un cliente. No copies la descripción comercial.',
  'Las palabras literales que un prospecto escribiría y que deben hacer que el asistente lo proponga.',
  'El contraejemplo. Es el bloque que más trabaja: sin él, el modelo propone de más.',
] as const

const FALTA_BLOQUE = [
  'Falta el qué es. Los tres bloques son obligatorios.',
  'Faltan las señales. Los tres bloques son obligatorios.',
  'Falta el contraejemplo. Los tres bloques son obligatorios.',
] as const

export const HINT_EMPTY_MESSAGE =
  'Escribe la pista: sin texto el asistente no puede proponer este artículo.'

export const HINT_TOO_FEW_BLOCKS_MESSAGE =
  'La pista necesita al menos tres bloques separados por una línea en blanco: qué es, qué señales lo activan y cuándo NO aplica.'

/** El error de uno de los tres campos del compositor. Cadena vacía = válido. */
export function validateHintBlock(block: string, index: number): string {
  if (block.trim() !== '') return ''
  return FALTA_BLOQUE[index] ?? HINT_EMPTY_MESSAGE
}

/**
 * El error del texto COMPLETO. Cadena vacía = válido.
 *
 * <p>⚠️ <b>La longitud se mide sobre el texto ya unido</b>, separadores
 * incluidos, porque es lo que mide el `@Size(max = 1000)` del servidor. Medirla
 * campo a campo daría un formulario en verde que el servidor rechaza.
 */
export function validateHintLength(text: string): string {
  if (text.length <= HINT_MAX_LENGTH) return ''
  return `La pista no puede pasar de ${HINT_MAX_LENGTH} caracteres. Ahora tiene ${text.length}: sobran ${text.length - HINT_MAX_LENGTH}.`
}

export function validateHintText(text: string): string {
  if (text.trim() === '') return HINT_EMPTY_MESSAGE
  if (splitBlocks(text).length < HINT_MIN_BLOCKS) return HINT_TOO_FEW_BLOCKS_MESSAGE
  return validateHintLength(text)
}

/** Firmante de una revisión: `usuario #{id}`, o `tú (usuario #{id})` si es quien mira. */
export function signerLabel(id: number, meId: number | null): string {
  return meId !== null && meId === id ? `tú (usuario #${id})` : `usuario #${id}`
}

export type RevisionState = 'current' | 'retired' | 'superseded'

/**
 * Vigente / Retirada / Reemplazada, <b>por posición y no por aritmética</b>.
 *
 * <p>La API no distingue los dos últimos: en los dos casos `supersededAt` está
 * puesto. La revisión de arriba del todo con `current === false` es una retirada
 * —nadie la sucedió, o habría una más nueva encima—; cualquier otra es un
 * reemplazo. Se resuelve así para no depender de que la numeración sea contigua,
 * y funciona con el historial paginado porque el orden es descendente.
 */
export function revisionState(hint: CatalogItemAiHintResponse, index: number): RevisionState {
  if (hint.current) return 'current'
  return index === 0 ? 'retired' : 'superseded'
}

export const REVISION_STATE_LABEL: Record<RevisionState, string> = {
  current: 'Vigente',
  retired: 'Retirada',
  superseded: 'Reemplazada',
}

/**
 * El pie de procedencia de una revisión. Es el punto de la pantalla donde más
 * fácil es mentir, así que la tabla de verdad va entera y sin ramas implícitas.
 *
 * <p>El caso `supersededAt` puesto con `supersededBySystemUserId` nulo <b>no es
 * un dato que falte, es información</b>: significa «no consta». Pintar
 * `usuario #null`, esconder la línea o caer al firmante de publicación
 * convertiría una laguna conocida en un dato falso, en la única constancia de
 * quién apagó comercialmente un artículo.
 */
export function provenanceText(hint: CatalogItemAiHintResponse, meId: number | null): string {
  const publicada = `Publicada el ${formatDate(hint.publishedAt)} por ${signerLabel(hint.publishedBySystemUserId, meId)}`
  if (hint.supersededAt === null) {
    if (hint.supersededBySystemUserId !== null) {
      return 'Dato incoherente: figura firmante de retirada sin fecha.'
    }
    return `${publicada}. Vigente.`
  }
  const retirada = `retirada el ${formatDate(hint.supersededAt)}`
  if (hint.supersededBySystemUserId === null) {
    return `${publicada} · ${retirada}. No consta quién: la firma de retirada no existía cuando ocurrió.`
  }
  return `${publicada} · ${retirada} por ${signerLabel(hint.supersededBySystemUserId, meId)}.`
}

/**
 * Los errores del servidor que el operador puede arreglar <b>editando el
 * formulario que tiene delante</b>, y su texto exacto.
 *
 * <p>Van al `ErrorSummary` del formulario y no a un toast: un aviso flotante que
 * dice «ese texto ya se publicó» mientras el texto ofensor sigue en el
 * `textarea` se desvanece, no está asociado a ningún control y no da nada que
 * pulsar. Todo lo que no esté en este mapa sale por `errorFrom` con su traza.
 *
 * <p>Las claves son los `code` que emite `GlobalExceptionHandler`. Los cuatro
 * primeros los deriva `errorCode(ex)` del nombre de la excepción de dominio
 * (404 y 409). `INVALID_INPUT` es el 400 genérico de `handleBadRequest`, que es
 * adonde va a parar la regla de los tres bloques: el dominio la lanza como
 * `IllegalArgumentException` y el manejador global la mapea a 400 con un
 * `detail` constante —«Los datos enviados no son válidos.»— que no dice cuál es
 * el problema. Por eso el texto lo pone el cliente, y por eso la regla se valida
 * aquí antes de enviar: esto es el respaldo, no el camino.
 */
export const HINT_SERVER_ERRORS: Record<string, string> = {
  CATALOG_ITEM_AI_HINT_TEXT_ALREADY_PUBLISHED:
    'Ese texto exacto ya se publicó antes para este artículo. Cambia algo: dos revisiones idénticas dejan el historial sin poder responder con qué texto se generó una propuesta.',
  CATALOG_ITEM_AI_HINT_ALREADY_PUBLISHED:
    'Este artículo ya tiene una pista vigente —quizá la publicó otra persona mientras escribías—. Se ha cargado la que hay: revísala y publica una corrección.',
  HINT_CATALOG_ITEM_NOT_FOUND:
    'Este artículo ya no está a la venta, así que no se le puede publicar una pista. Compruébalo en Catálogo y precios.',
  CATALOG_ITEM_AI_HINT_NOT_FOUND:
    'Este artículo ya no tiene pista vigente. Puede que alguien la haya retirado mientras tenías la pantalla abierta.',
  INVALID_INPUT: HINT_TOO_FEW_BLOCKS_MESSAGE,
}

/** El texto del formulario para un `code` del servidor, o `null` si no es de este tipo. */
export function hintServerError(code: string | null): string | null {
  if (code === null) return null
  return HINT_SERVER_ERRORS[code] ?? null
}
