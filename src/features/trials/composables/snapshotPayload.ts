import type { CompanyEntitlementSnapshotResponse } from '@/features/company-limits/types/company-limits.types'

/**
 * <b>Leer una foto de permisos sin inventarle una forma.</b>
 *
 * <p>`payload` llega como una <b>cadena</b> con el JSON congelado del cálculo, y
 * el contrato no documenta ni un solo campo de dentro: `payloadFormatVersion` es
 * la confesión de que esa forma puede cambiar. `company-limits` resolvió eso no
 * pintándolo nunca, y para su pregunta —«¿está vivo el proceso de recálculo?»—
 * es la decisión correcta.
 *
 * <p>Aquí la pregunta es otra: «¿qué veía esta empresa el día que llamó?». El
 * `payload` <b>es</b> la respuesta, así que no pintarlo sería no contestar. Lo
 * que no se puede hacer es tratarlo como un tipo: renderizar `fila.accessLevel`
 * campo a campo ata la pantalla a una forma no publicada, y el día que el
 * backend la cambie no habrá error — habrá celdas vacías donde antes había
 * permisos, que es la peor forma de romperse.
 *
 * <p>El camino de en medio, que es el que se toma: se intenta leer el JSON y se
 * describe <b>estructuralmente</b> lo que haya —cuántas entradas, con qué
 * claves— sin exigir ninguna clave concreta; y se ofrece el texto crudo, que es
 * lo único que con seguridad es cierto. Si no se puede ni parsear, se dice: una
 * foto ilegible es un hallazgo, no un vacío.
 */

/** Lo que se pudo entender del `payload`, sin comprometerse con ningún esquema. */
export interface SnapshotPayloadReading {
  /** `true` si el texto era JSON válido. `false` = no se pudo leer, y se dice. */
  parsed: boolean
  /**
   * Cuántas entradas trae, cuando el JSON es una lista o un objeto. `null`
   * cuando es un escalar o no se pudo leer: no se cuenta lo que no se entiende.
   */
  entryCount: number | null
  /**
   * Las claves que aparecen en las entradas, en orden alfabético. Es lo que
   * permite enseñar una tabla sin haber declarado sus columnas de antemano.
   */
  keys: string[]
  /** Las entradas como registros planos, si las hubo. Vacío en cualquier otro caso. */
  entries: Record<string, unknown>[]
  /** El JSON reformateado para leerlo, o el texto crudo si no se pudo parsear. */
  pretty: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Convierte un valor de JSON en algo pintable en una celda, <b>sin perderlo</b>.
 *
 * <p>Un `null` se dice con palabras y no se pinta como celda vacía: «vacío» y «el
 * servidor dijo explícitamente que no hay» se ven igual y no son lo mismo. Un
 * objeto anidado se serializa en vez de acabar como `[object Object]`.
 */
export function snapshotCell(value: unknown): string {
  if (value === null) return '— (nulo)'
  if (value === undefined) return '— (ausente)'
  if (typeof value === 'boolean') return value ? 'sí' : 'no'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

/**
 * Lee el `payload` de una foto.
 *
 * <p><b>Acepta tres formas y no privilegia ninguna</b>, porque las tres son
 * plausibles y el contrato no dice cuál es: una lista de entradas, un objeto que
 * envuelve una lista bajo alguna clave, o un objeto suelto. Lo que no hace es
 * exigir una clave con un nombre concreto — eso sería volver a atarse a la forma
 * por la puerta de atrás.
 */
export function readSnapshotPayload(payload: string): SnapshotPayloadReading {
  const raw = payload ?? ''
  let value: unknown
  try {
    value = JSON.parse(raw) as unknown
  } catch {
    return { parsed: false, entryCount: null, keys: [], entries: [], pretty: raw }
  }

  const pretty = JSON.stringify(value, null, 2)

  /** La lista de entradas, venga suelta o envuelta en un objeto de un solo array. */
  let list: unknown[] | null = null
  if (Array.isArray(value)) {
    list = value
  } else if (isRecord(value)) {
    const arrays = Object.values(value).filter(Array.isArray) as unknown[][]
    // Solo se desenvuelve cuando no hay ambigüedad: con dos listas dentro,
    // elegir una sería adivinar cuál es «la buena».
    list = arrays.length === 1 ? (arrays[0] ?? null) : null
  }

  if (list) {
    const entries = list.filter(isRecord)
    const keys = [...new Set(entries.flatMap((entry) => Object.keys(entry)))].sort()
    return { parsed: true, entryCount: list.length, keys, entries, pretty }
  }

  if (isRecord(value)) {
    const keys = Object.keys(value).sort()
    return { parsed: true, entryCount: keys.length, keys, entries: [value], pretty }
  }

  return { parsed: true, entryCount: null, keys: [], entries: [], pretty }
}

/** Por qué se recalculó. Los cinco valores del contrato, dichos en negocio. */
export const SNAPSHOT_TRIGGER_LABEL: Record<
  CompanyEntitlementSnapshotResponse['triggerReason'],
  string
> = {
  CONTRACT_AMENDMENT: 'Cambió el contrato',
  TRIAL_EXPIRED: 'Venció una prueba',
  DUNNING: 'Lo movió la cobranza',
  MANUAL: 'Alguien lo pidió a mano',
  REPAIR: 'Reparación',
}

/**
 * <b>Quién lo hizo.</b> Los tres campos de actor son excluyentes en la práctica y
 * ninguno se rellena por defecto: una foto sin actor conocido lo dice.
 */
export function snapshotActor(snapshot: CompanyEntitlementSnapshotResponse): string {
  if (snapshot.actorIsProcess) return 'Un proceso automático'
  if (snapshot.actorSystemUserId !== null)
    return `Un usuario de plataforma (#${snapshot.actorSystemUserId})`
  if (snapshot.actorEmployeeId !== null)
    return `Un empleado de la clínica (#${snapshot.actorEmployeeId})`
  return 'No consta quién'
}

/**
 * <b>El aviso de que la foto no es del día que se pidió.</b>
 *
 * <p>El endpoint devuelve la última foto tomada <i>en o antes</i> del instante
 * pedido, así que casi nunca coincide. Y esa diferencia importa: significa que
 * entre el recálculo y el día por el que se pregunta no cambió nada, lo cual es
 * la respuesta —pero solo si se dice—. Sin esta frase, el operador lee la fecha
 * de la tarjeta y cree que se equivocó de día.
 *
 * <p>Devuelve cadena vacía cuando la foto sí cae en el día preguntado.
 */
export function snapshotAsOfNotice(recalculatedAt: string, askedDay: string): string {
  const snapshotDay = (recalculatedAt ?? '').slice(0, 10)
  if (!snapshotDay || snapshotDay === askedDay) return ''
  return `No hay ninguna foto del ${askedDay}: esta es la última anterior, del ${snapshotDay}. Es la respuesta correcta —entre esa fecha y el ${askedDay} no se recalculó nada, así que la empresa seguía viendo esto—, pero lo que se calculó se calculó el ${snapshotDay}.`
}
