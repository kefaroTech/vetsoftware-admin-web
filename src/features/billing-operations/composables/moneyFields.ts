import { parseISODate } from '@/composables/format'

/**
 * <b>Los cuatro campos que se repiten en todos los formularios del dinero</b>:
 * un importe, un identificador, una fecha y un instante.
 *
 * <p>Existe para que no haya once copias de la misma regla. Las once pantallas del
 * circuito de cobro —aplicar, contra-aplicar, retener, acreditar, devolver,
 * reintentar, reversar, conceder y consumir saldo— piden exactamente estos cuatro
 * tipos de dato, y cada copia suelta de «acepta coma o punto» es una copia que
 * mañana solo se arregla en diez sitios.
 *
 * <p><b>Los importes son siempre positivos.</b> El signo lo da el tipo del
 * documento y el sentido de la operación, nunca un menos tecleado en el campo. Un
 * formulario que aceptara «−40000» dejaría convivir dos convenciones de signo, y a
 * partir de ahí ninguna suma de pantalla cuadra con ninguna suma del servidor. Por
 * eso el validador rechaza el menos con un mensaje que lo explica en vez de
 * limitarse a decir «no válido».
 */

/** Hasta dos decimales, con coma o con punto. Nada más: ni signo, ni separador de miles. */
const AMOUNT_RE = /^\d{1,13}([.,]\d{1,2})?$/

/**
 * El importe escrito, convertido a número. `null` si no es un importe válido.
 *
 * <p>Acepta coma y punto porque el teclado numérico de es-CO produce coma y el
 * teclado de portátil produce punto, y obligar a uno de los dos convierte un
 * formulario de cobranza en una trampa. No acepta separador de miles: «1.200»
 * sería mil doscientos o uno coma dos según quién lo escriba, y esa ambigüedad
 * vale mil pesos por cada punto.
 */
export function parseAmount(raw: string): number | null {
  const text = raw.trim()
  if (!AMOUNT_RE.test(text)) return null
  const value = Number(text.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

/** «El importe» → «El importe es obligatorio.» / «… tiene que ser mayor que cero.» */
export function validateAmount(raw: string, label: string): string {
  const text = raw.trim()
  if (!text) return `${label} es obligatorio.`
  if (text.startsWith('-'))
    return `${label} se escribe en positivo: el signo lo da el tipo de la operación, no el campo.`
  const value = parseAmount(text)
  if (value === null)
    return `${label} tiene que ser un número con hasta dos decimales, sin separador de miles. Ejemplo: 213010,50`
  if (value <= 0) return `${label} tiene que ser mayor que cero.`
  return ''
}

/** Un porcentaje de retención: positivo y por debajo de 100. */
export function validatePercent(raw: string, label: string): string {
  const text = raw.trim()
  if (!text) return `${label} es obligatorio.`
  const value = parseAmount(text)
  if (value === null) return `${label} tiene que ser un número. Ejemplo: 2,5`
  if (value <= 0) return `${label} tiene que ser mayor que cero.`
  if (value >= 100) return `${label} es un porcentaje: tiene que ser menor que 100.`
  return ''
}

/** El identificador de otra fila —un pago, un documento, un usuario— tal como lo pide el contrato. */
export function validateId(raw: string, label: string, required = true): string {
  const text = raw.trim()
  if (!text) return required ? `${label} es obligatorio.` : ''
  return /^\d+$/.test(text) && Number(text) > 0 ? '' : `${label} es un número entero. Ejemplo: 42`
}

/** El identificador escrito, o `null` si el campo quedó vacío. */
export function parseId(raw: string): number | null {
  const text = raw.trim()
  return /^\d+$/.test(text) && Number(text) > 0 ? Number(text) : null
}

/** Medianoche local de hoy. Es con lo que se compara «no puede ser futura». */
function today(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Una fecha `yyyy-MM-dd` de un `<input type="date">`.
 *
 * <p>`allowFuture` no tiene valor por defecto a propósito: hay fechas del circuito
 * que <b>tienen</b> que ser futuras —cuándo caduca un lote de saldo a favor, cuándo
 * se reintenta un cobro— y otras que no pueden serlo —cuándo se practicó una
 * retención, cuándo se giró una devolución—. Un defecto silencioso acertaría en la
 * mitad de los casos.
 */
export function validateDate(raw: string, label: string, allowFuture: boolean): string {
  const text = raw.trim()
  if (!text) return `${label} es obligatoria.`
  const parsed = parseISODate(text)
  if (!parsed) return `${label} no es válida. Ejemplo: 03/03/2026`
  if (!allowFuture && parsed.getTime() > today().getTime()) return `${label} no puede ser futura.`
  if (allowFuture && parsed.getTime() < today().getTime())
    return `${label} no puede estar en el pasado.`
  return ''
}

/**
 * Un instante `yyyy-MM-ddTHH:mm` de un `<input type="datetime-local">`.
 *
 * <p>Se valida aparte de la fecha porque el contrato distingue los dos: los campos
 * `date-time` del circuito —cuándo se intentó el cobro, cuándo llegó la queja,
 * cuándo se notificó al emisor— llevan hora, y perderla convierte cuatro intentos
 * de un martes en cuatro intentos indistinguibles.
 */
export function validateInstant(raw: string, label: string, allowFuture: boolean): string {
  const text = raw.trim()
  if (!text) return `${label} es obligatoria.`
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return `${label} no es válida. Ejemplo: 03/03/2026 14:30`
  const now = Date.now()
  if (!allowFuture && parsed.getTime() > now) return `${label} no puede ser futura.`
  if (allowFuture && parsed.getTime() < now) return `${label} no puede estar en el pasado.`
  return ''
}

/**
 * El instante local del `<input type="datetime-local">`, en el ISO con zona que
 * espera el backend.
 *
 * <p>El control devuelve `2026-08-27T14:30` <b>sin zona</b>. Mandarlo tal cual deja
 * que el servidor lo interprete como UTC, y en Bogotá eso son cinco horas de
 * diferencia: un intento de cobro de las 20:00 del lunes pasaría a la 01:00 del
 * martes y rompería el conteo de «cuatro intentos en dos semanas» justo en los
 * bordes. `new Date(local)` sí lo interpreta como hora local, que es lo que el
 * operador escribió.
 */
export function toInstant(local: string): string {
  return new Date(local).toISOString()
}

/**
 * Un instante ISO del servidor, en el formato que acepta `datetime-local`.
 * Sirve para proponer un valor —el reintento que ya estaba programado— sin que el
 * operador tenga que reescribirlo.
 */
export function toLocalInstant(iso: string | null | undefined): string {
  if (!iso) return ''
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

/**
 * La llave de idempotencia que exigen las escrituras del circuito
 * (`clientRequestId`).
 *
 * <p>Se genera <b>al abrir el formulario</b> y no al enviar: es lo que hace que el
 * reintento del mismo envío —doble clic, red que se cortó tras salir la petición—
 * sea el mismo envío y no un segundo movimiento de dinero. Una llave nueva por
 * llamada no serviría de nada.
 */
export function newRequestId(): string {
  return crypto.randomUUID()
}
