/**
 * Las dos marcas de tiempo que el expediente <b>envía</b> al backend, en el
 * formato que el backend sabe leer.
 *
 * <p>`src/composables/format.ts` (W1-A) resuelve el camino de vuelta —lo que se
 * <i>pinta</i>—; esto es el de ida, que tiene una trampa propia y distinta.
 *
 * <p><b>Por qué no `new Date().toISOString()`.</b> `CancelSubscriptionRequest`
 * declara `requestedAt` como `LocalDateTime` y `effectiveDate` como `LocalDate`:
 * dos tipos de Java <b>sin zona horaria</b>. `toISOString()` devuelve la hora en
 * UTC con sufijo `Z`, así que en Bogotá (UTC−5) una cancelación pedida a las
 * 20:00 del día 10 viajaría como el día 11, y la fecha efectiva calculada a
 * partir de ella se correría un día entero. Es el mismo corrimiento que
 * `parseISODate` evita al leer, solo que al escribir nadie lo ve hasta que un
 * cliente reclama que se le dio de baja un día antes.
 *
 * <p>Estas dos funciones construyen la cadena con los componentes <b>locales</b>
 * del reloj del operador, que es la hora que él acaba de ver en pantalla.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `yyyy-MM-dd` local — lo que espera un `LocalDate` y lo que come un `<input type="date">`. */
export function todayISODate(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** `yyyy-MM-ddTHH:mm:ss` local — lo que espera un `LocalDateTime`, sin zona ni sufijo `Z`. */
export function nowLocalDateTime(now = new Date()): string {
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  return `${todayISODate(now)}T${time}`
}
