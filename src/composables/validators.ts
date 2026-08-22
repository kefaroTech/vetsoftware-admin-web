/**
 * Validadores de formulario de la consola (FORM-06).
 *
 * Los 17 formularios de catálogo repetían el mismo literal —«Campo requerido»,
 * 35 veces— para 35 campos distintos. Un mensaje sin sujeto no dice CUÁL de los
 * cinco campos del modal falta, y en un formulario con desplegables el usuario
 * tiene que recorrerlos todos para averiguarlo.
 *
 * Reglas de redacción (NN/g Error Message Guidelines #3 y #10; GOV.UK error
 * wording), en este orden:
 *
 *  1. Sujeto siempre. «El nombre es obligatorio.», no «Campo requerido».
 *  2. La regla real, no la genérica. Los máximos que aparecen aquí salen de las
 *     anotaciones `@Size`/`@NotBlank`/`@NotNull` de los DTO de request del
 *     backend, no de una convención del front: si el servidor acepta 100
 *     caracteres, el mensaje dice 100.
 *  3. Punto final. El mensaje es una frase.
 *  4. Segunda persona y sin culpabilizar. «Debes seleccionar la especie.», no
 *     «Especie inválida».
 *
 * `label` se pasa CON artículo («El nombre», «La descripción») porque el mensaje
 * es una frase y el artículo depende del género del sustantivo.
 */

/**
 * Concuerda el adjetivo con el género que delata el artículo del propio
 * sujeto. Sin esto, «La descripción» producía «La descripción es obligatorio.»,
 * que es justo el tipo de descuido que hace que un mensaje de error se lea como
 * texto de relleno y no como algo escrito para el usuario.
 *
 * Se deduce del artículo y no de un parámetro aparte a propósito: un booleano
 * `femenino` en cada llamada es un dato que se puede olvidar o poner al revés
 * sin que nada falle, mientras que el artículo ya está ahí y ya es obligatorio.
 */
function esObligatorio(label: string): string {
  return /^(la|las)\s/i.test(label) ? 'es obligatoria' : 'es obligatorio'
}

/** «El nombre es obligatorio.» / «La descripción es obligatoria.» */
export function required(value: string, label: string): string {
  return value.trim() ? '' : `${label} ${esObligatorio(label)}.`
}

/**
 * Requerido + longitud máxima. `max` es el `@Size(max = …)` del DTO del
 * backend: sin él, el usuario descubre el límite cuando el servidor rechaza el
 * envío, con el formulario ya lleno.
 */
export function length(value: string, label: string, min: number, max: number): string {
  const n = value.trim().length
  if (n === 0) return `${label} ${esObligatorio(label)}.`
  if (n < min) return `${label} debe tener al menos ${min} caracteres.`
  if (n > max) return `${label} no puede pasar de ${max} caracteres.`
  return ''
}

/** Longitud máxima de un campo que el backend NO exige (`@Size` sin `@NotBlank`). */
export function maxLength(value: string, label: string, max: number): string {
  return value.trim().length > max ? `${label} no puede pasar de ${max} caracteres.` : ''
}

/**
 * Desplegable obligatorio. `label` va con artículo y en el caso que pide la
 * frase: `selection(id, 'la especie')` produce «Debes seleccionar la especie.»
 *
 * El `0` cuenta como vacío: varios formularios de esta consola representan
 * «sin elegir» con `0` y no con `null`, y sin esta rama el desplegable nunca
 * daría error.
 */
export function selection(value: number | string | null | undefined, label: string): string {
  const vacio = value === null || value === undefined || value === '' || value === 0
  return vacio ? `Debes seleccionar ${label}.` : ''
}

/**
 * Formato con ejemplo. El ejemplo NO es opcional: sin él el mensaje no enseña
 * nada y el usuario vuelve a probar a ciegas.
 */
export function pattern(value: string, label: string, re: RegExp, example: string): string {
  if (!value.trim()) return `${label} ${esObligatorio(label)}.`
  return re.test(value.trim()) ? '' : `${label} no tiene el formato correcto. Ejemplo: ${example}`
}
