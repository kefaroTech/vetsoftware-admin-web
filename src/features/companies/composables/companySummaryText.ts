/**
 * Los textos del resumen del expediente de empresa (§I2), en un solo sitio.
 *
 * <p>Están aquí y no repartidos por seis SFC por dos motivos prácticos: son lo
 * que un operador <b>lee por teléfono a un cliente</b>, así que si cambian tienen
 * que cambiar una vez; y son barribles por una prueba sin montar ningún
 * componente, que es la única forma barata de comprobar que ningún hueco se ha
 * convertido con el tiempo en un cero.
 */

/**
 * <b>El estado comercial no está en el contrato del backend.</b>
 *
 * <p>§I2 lo pide como una de las seis tarjetas y describe sus cuatro valores
 * —`PAYING` / `FREE` / `TRIAL_ONLY` / `CHURNED`— con la razón por la que la
 * columna existe: «sin esta columna, una clínica de medio millón al mes y otra
 * perpetuamente gratuita son las dos "activa", y el ingreso medio por cliente
 * sale tres veces más bajo de lo real».
 *
 * <p>Hoy no hay de dónde sacarlo: `CompanyResponse` no lo trae y ningún endpoint
 * del contrato lo expone (comprobado sobre `api/openapi.json`). Había tres
 * salidas y solo una es aceptable (R14):
 *
 * <ol>
 *   <li>Pintar el estado del contrato —«Activa»— con el rótulo «Estado
 *       comercial». Es <b>exactamente el error que la columna existe para
 *       impedir</b>: una clínica gratuita y una que paga medio millón salen las
 *       dos «Activa». Descartada.</li>
 *   <li>Deducirlo en el cliente de los pagos. Sería inventar la regla de negocio
 *       en el front, y la primera vez que el backend la escriba de verdad las dos
 *       darán respuestas distintas. Descartada.</li>
 *   <li><b>Decir que no está.</b> Elegida.</li>
 * </ol>
 */
export const COMMERCIAL_STATE_GAP = {
  what: 'Si esta clínica paga, es gratuita con cupo, se quedó en la prueba o se fue.',
  why: 'Sin este dato, una clínica de medio millón al mes y otra perpetuamente gratuita se ven las dos como «activa», y el ingreso medio por cliente sale tres veces más bajo de lo real.',
  /** Lo que hay que arreglar para cerrarlo. Va escrito en la pantalla, no solo aquí. */
  blockedBy:
    'El contrato del backend no expone «commercial_state» en ninguna respuesta: ni en «CompanyResponse» ni en otra.',
  /** La trampa concreta, dicha en la pantalla para que nadie la resuelva mal. */
  trap: 'El estado del contrato (activa, en prueba, cancelada) NO sirve de sustituto: dice si el contrato está vivo, no si la empresa paga.',
} as const

/**
 * El importe vencido de una empresa tampoco está.
 *
 * <p>`/system/subscription-billing/documents/overdue` es un listado de plataforma
 * —el trabajo del cierre de mes—, no un saldo por empresa, y
 * `SubscriptionResponse` trae <b>cuándo</b> empezó la mora (`pastDueSince`) y los
 * días de cortesía, pero no <b>cuánto</b>. Así que la tarjeta de cartera dice el
 * reloj, que es real, y no dice el importe, que no lo tiene.
 */
export const RECEIVABLES_AMOUNT_GAP =
  'El importe vencido no se pinta aquí: el contrato no da un saldo por empresa, y un cero puesto por defecto se leería como «no debe nada».'

/**
 * De la ventana de prueba, §I2 pide dos cosas y el contrato solo da una.
 * `trialEndDate` es real; «3 artículos probados» necesita las líneas de prueba,
 * que son de la pantalla C2/I5.
 */
export const TRIAL_ITEMS_GAP =
  'Qué artículos se probaron y cuántos se convirtieron se cuentan en la pestaña «Prueba», con las líneas del contrato.'

/**
 * La frase que acompaña a cualquier hueco. Es una sola en toda la pantalla a
 * propósito: seis redacciones distintas del mismo «esto todavía no existe» hacen
 * pensar que son seis problemas distintos.
 */
export const MISSING_DATA_TITLE = 'Este dato todavía no existe'

/** Y el rótulo del otro caso, que no es lo mismo: la pantalla está por construir. */
export const PENDING_SCREEN_TITLE = 'Esta pestaña todavía no está construida'

/**
 * Lo que se dice cuando la empresa no tiene contrato. <b>No es un error</b>: el
 * servidor respondió, y respondió que no hay.
 */
export const NO_CONTRACT_TEXT =
  'Esta empresa no tiene contrato vigente. No es un fallo de carga: el servidor respondió que no hay ninguno.'

/**
 * Cuántos cupos están desbordados, en palabras. Devuelve una frase y no un número
 * suelto porque «1» junto a un rótulo «Cupos» no se puede leer por teléfono.
 *
 * <p>Función pura y exportada porque es lo que una prueba puede barrer sin montar
 * nada.
 */
export function capacitySummaryText(total: number, exhausted: number): string {
  if (total === 0) return 'El contrato no declara ningún cupo con techo.'
  const cupos = total === 1 ? '1 cupo' : `${total} cupos`
  if (exhausted === 0) return `${cupos}, ninguno desbordado.`
  return exhausted === 1 ? `${cupos}, 1 desbordado.` : `${cupos}, ${exhausted} desbordados.`
}

/**
 * Lo mismo para el acceso. `manual` se dice aparte porque es lo único de esa
 * tabla que una persona puso a mano: el recálculo lo preserva a propósito y por
 * eso se distingue en pantalla.
 */
export function accessSummaryText(total: number, manual: number): string {
  if (total === 0) return 'Esta empresa no tiene ningún submódulo habilitado.'
  const submodulos = total === 1 ? '1 submódulo' : `${total} submódulos`
  if (manual === 0) return `${submodulos} habilitados, todos derivados del contrato.`
  return manual === 1
    ? `${submodulos} habilitados, 1 concedido a mano.`
    : `${submodulos} habilitados, ${manual} concedidos a mano.`
}
