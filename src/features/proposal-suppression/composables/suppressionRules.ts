import type {
  ProposalSuppressionResponse,
  ProposalSuppressionStatus,
} from '../types/proposal-suppression.types'

/**
 * Las dos reglas puras de la pantalla: qué correo se admite y cómo se lee un
 * acuse. Están juntas y fuera de todo componente porque las dos las comprueban
 * dos consumidores distintos —el formulario y el panel de resultado— y una regla
 * escrita dos veces es una regla que un día se corrige en un solo sitio.
 *
 * <p>Vive en su propio módulo —como `platformBillingValidators.ts`— para poder
 * probarlo sin montar nada: es una función pura y es la que decide si se llega a
 * disparar una operación irreversible.
 *
 * <p><b>Por qué se valida aquí además de en el servidor.</b> El backend rechaza
 * con 400 lo que no pase `@Email`, pero un 400 llega DESPUÉS de la confirmación:
 * el operador ya habría leído «esto no se puede deshacer», habría pulsado el
 * botón rojo y se encontraría con un error de formato. La validación local
 * mantiene el diálogo de confirmación reservado para lo que de verdad va a
 * ejecutarse.
 */

/** `@Size(max = 320)` de `SuppressProposalDataRequest`. */
export const CONTACT_EMAIL_MAX = 320

/**
 * El mismo patrón que usan los formularios de los dos fronts. Es deliberadamente
 * laxo —no intenta implementar RFC 5322— porque el árbitro es el `@Email` del
 * servidor; esto solo atrapa lo que es evidentemente no un correo.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Devuelve el mensaje de error, o cadena vacía si el correo sirve.
 *
 * <p>El sujeto va en el mensaje (FORM-06): «El correo del titular …», nunca
 * «Campo requerido».
 */
export function validateContactEmail(value: string): string {
  const v = value.trim()
  if (v === '') return 'El correo del titular es obligatorio.'
  if (v.length > CONTACT_EMAIL_MAX) {
    return `El correo del titular no puede pasar de ${CONTACT_EMAIL_MAX} caracteres.`
  }
  if (!EMAIL_RE.test(v)) {
    return 'El correo del titular no tiene el formato correcto. Ejemplo: titular@clinica.com'
  }
  return ''
}

/**
 * <b>Cómo se lee un acuse, en un único sitio.</b> El endpoint responde 200 tanto
 * cuando borró como cuando no encontró nada, así que esta es literalmente la
 * frontera entre «atendido» y «hay que seguir buscando». La comprueban el
 * composable —para elegir el tono del aviso— y el panel —para elegir el banner—,
 * y tienen que decir siempre lo mismo: un panel verde sobre un aviso de
 * advertencia es peor que cualquiera de los dos por separado.
 *
 * <p>El umbral es `total > 0` y no «los tres pasos movieron algo»: una propuesta
 * sin conversación mueve solo su cabecera, y eso es una supresión de pleno
 * derecho.
 */
/**
 * Una marca del servidor (`LocalDateTime`, ISO-8601 **sin zona**) en la forma en
 * que la lee un operador. Devuelve `null` si el texto no tiene forma de fecha,
 * en vez de pintar `Invalid Date` en el acuse de una obligación legal.
 *
 * <p><b>No pasa por `new Date()`, y es deliberado.</b> `suppressedAt` no lleva
 * zona horaria: dárselo a `Date` lo interpreta como hora local en unos
 * navegadores y como UTC en otros, y una constancia legal que se desplaza cinco
 * horas según quién la mire no sirve de constancia. Se leen los campos tal cual
 * vienen, que es exactamente lo que el servidor quiso decir.
 */
export function formatSuppressionInstant(iso: string | undefined | null): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso)
  if (m === null) return null
  const [, year, month, day, hour, minute] = m
  return `${day}/${month}/${year} a las ${hour}:${minute}`
}

export function suppressionStatusOf(
  counters: ProposalSuppressionResponse,
): Exclude<ProposalSuppressionStatus, 'idle'> {
  return counters.total === 0 ? 'not-found' : 'suppressed'
}
