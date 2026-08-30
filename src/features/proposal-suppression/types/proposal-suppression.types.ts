/**
 * Supresión de datos del asistente, a petición del titular.
 *
 * <p>Los dos tipos de arriba espejan `SuppressProposalDataRequest` y
 * `ProposalSuppressionResponse` del contrato y están atados en
 * `src/types/api.contract.ts`. Los de abajo son de esta pantalla y NO viajan por
 * la red: existen porque la respuesta del servidor, a propósito, **no devuelve
 * el correo** —devolverlo lo metería en el cuerpo de una respuesta que puede
 * acabar en un log de acceso—, así que si la pantalla quiere decir «se
 * suprimieron los datos DE ESTA dirección» tiene que conservar lo que envió.
 * <b>La fecha ya no</b>: desde que el acuse trae `suppressedAt`, la pone el
 * servidor.
 */

/**
 * Lo que se envía. **Un solo campo, y esa es la restricción que manda sobre todo
 * el diseño de la pantalla**: el backend no admite ni el token de la propuesta
 * ni su identificador, solo el correo de contacto. Quien atienda una petición de
 * habeas data y no tenga la dirección exacta no tiene ninguna otra llave.
 *
 * <p>`@NotBlank @Email @Size(max = 320)` en el DTO
 * (`SuppressProposalDataRequest.java:20`).
 */
export interface SuppressProposalDataRequest {
  contactEmail: string
}

/**
 * El acuse: tres contadores de FILAS, su suma y las dos fechas.
 *
 * <p><b>El desglose no es cosmético</b> — lo dice el javadoc de
 * `ProposalSuppressionDto.java:9-13`: un total único deja indistinguibles «ese
 * correo no está» y «el paso que borra los motivos no tocó nada porque su
 * subconsulta está rota». Por eso esta pantalla enseña los tres números y no
 * solo la suma.
 *
 * <p>Qué cuenta cada uno, leído de las tres consultas de
 * `AiProposalRetentionJpaRepository.java:196-246`:
 *
 * <ul>
 *   <li>`proposals` — cabeceras a las que se les vació `contact_email` y la
 *       clave de idempotencia.</li>
 *   <li>`turns` — turnos a los que se les vació el texto que escribió el
 *       prospecto y la respuesta cruda del modelo.</li>
 *   <li>`lines` — motivos por línea que se borraron.</li>
 *   <li>`total` — la suma de los tres (`SuppressionResult.total()`), no un
 *       recuento de personas ni de propuestas distintas.</li>
 * </ul>
 *
 * <p><b>`suppressedAt` es el reloj del SERVIDOR</b>, y esa es toda la razón de
 * que exista. Hasta ahora esta pantalla se fabricaba la fecha con `Date.now()`
 * del navegador porque el contrato no publicaba ninguna. Una fecha del reloj del
 * cliente no vale como prueba de cumplimiento ante la SIC: se puede cambiar
 * desde el panel de control del equipo, y el acuse de una obligación legal no
 * puede descansar en eso.
 *
 * <p><b>`previouslySuppressedAt` es lo que separa los dos ceros.</b> Un acuse de
 * tres ceros no distingue «este correo nunca pidió una propuesta» de «ya se le
 * borró todo el 3 de julio», y son dos respuestas distintas para el titular. Si
 * viene con fecha, el operador puede decir cuándo se atendió la vez anterior en
 * lugar de mandarle a probar otra dirección. Es `undefined` en la primera
 * petición de un titular, y por eso va opcional: el contrato lo declara
 * `NOT_REQUIRED`.
 */
export interface ProposalSuppressionResponse {
  proposals: number
  turns: number
  lines: number
  total: number
  /** ISO-8601 sin zona (`LocalDateTime`), reloj del servidor. Siempre viene. */
  suppressedAt: string
  /** ISO-8601 sin zona. Ausente si es la primera supresión de este correo. */
  previouslySuppressedAt?: string
}

/**
 * El acuse ya en poder de la pantalla, con las dos cosas que el servidor no
 * devuelve pegadas al lado.
 *
 * <p><b>`email`</b> es el que se envió, ya recortado. Sin él, el panel de
 * resultado no podría nombrar a quién se le borró: la respuesta no lo trae, y
 * leerlo del cuadro de texto sería peor —el operador puede haberlo cambiado
 * mientras la petición viajaba, y entonces el acuse quedaría bajo una dirección
 * que no es la suya—.
 *
 * <p><b>Ya no lleva fecha propia, y su ausencia es el arreglo.</b> Antes
 * guardaba un `at` con el reloj del NAVEGADOR porque el contrato no publicaba
 * ninguna. Ahora `ProposalSuppressionResponse.suppressedAt` trae la del
 * SERVIDOR, que es la única que vale como prueba; conservar además una local al
 * lado solo crearía una segunda fecha capaz de discrepar de la del acuse.
 */
export interface ProposalSuppressionOutcome {
  email: string
  counters: ProposalSuppressionResponse
}

/**
 * Cómo se lee un acuse. Es el tipo que existe para que **cero coincidencias no
 * se pinte como éxito**.
 *
 * <p>El endpoint responde 200 con ceros cuando no encuentra nada, y lo hace a
 * propósito para no convertirse en un oráculo que diga si una dirección pidió
 * propuesta alguna vez (`AiProposalRetentionController.java:47-51`). Ese 200 es
 * correcto en HTTP y **no** es un «hecho» para quien atiende la petición: si no
 * se borró nada, hay que buscar por otra dirección. Traducir los dos casos al
 * mismo cartel verde es como se cierra una petición de habeas data sin haberla
 * atendido.
 */
export type ProposalSuppressionStatus = 'idle' | 'suppressed' | 'not-found'
