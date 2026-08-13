/**
 * Correlación de la traza entre el navegador y el backend (TR-05).
 *
 * <p>El backend habla W3C Trace Context: si la petición llega con `traceparent`, Micrometer
 * adopta ese `trace-id` en vez de generar uno, y `X-Trace-Id` devuelve el mismo identificador.
 * Sin esa cabecera, cada llamada abre una traza nueva en el borde HTTP y no hay forma de coserla
 * con lo que pasó en el navegador.
 *
 * <p><b>Por qué generarlo aquí y no solo leer la respuesta.</b> Hasta ahora el identificador se
 * sacaba de la cabecera de respuesta, así que en una petición que muere sin respuesta —un
 * *timeout*, la red caída— no había nada que enseñar. Es decir: fallaba justo en el caso que dio
 * origen al hallazgo, «se quedó cargando». Generándolo antes de salir, el identificador existe
 * aunque el servidor no conteste nunca.
 */

/** Hex de `n` caracteres. `randomUUID` ya se usa en este repositorio para claves de idempotencia. */
function hex(n: number): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, n)
}

/**
 * `traceparent` para una petición nueva, y el `trace-id` que lleva dentro.
 *
 * <p>El último campo son las banderas: `01` pide conservar la traza. Hoy la política del backend
 * es conservar el 100 %, así que no cambia nada; el día que se introduzca muestreo, esta es la
 * línea donde se decide si manda el cliente o el servidor.
 */
export function nextTraceparent(): { traceId: string; traceparent: string } {
  const traceId = hex(32)
  return { traceId, traceparent: `00-${traceId}-${hex(16)}-01` }
}
