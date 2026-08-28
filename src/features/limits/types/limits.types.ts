/**
 * Los tipos de **cupo**: los ejes de límite de la plataforma, las excepciones de
 * techo negociadas con un cliente, el techo efectivo que resuelve el servidor y
 * la bitácora de avisos y portazos.
 *
 * <p>Se nombran como el esquema del contrato —`LimitDimensionResponse`,
 * `GrantCompanyLimitOverrideRequest`…— para que `MatchesContract<X, 'X'>` se lea
 * igual en los dos repositorios y una deriva del backend falle con el nombre a
 * la vista.
 *
 * <p><b>Regla que se ha seguido campo a campo</b>: lo que el contrato marca
 * `required` se declara aquí **no nulable** (si no, `NullableWhereRequired`
 * rompe la atadura y, peor, obliga a comprobaciones que nunca se cumplen); lo
 * que el contrato deja opcional se declara `| null`, porque por el cable llega
 * ausente y ninguna pantalla puede tratarlo como cero.
 *
 * <p><b>Ningún campo se omite.</b> `UndeclaredFields` existe justamente para el
 * caso en que un `record` de Java estrena un campo y el front lo ignora en
 * silencio; declararlos todos es lo que hace que ese día el build se pare.
 */

/**
 * Qué mide un eje. No es decoración: gobierna si el consumo puede bajar.
 *
 * - `STOCK`: lo que existe ahora mismo (mascotas vivas, usuarios activos, sedes).
 *   Sube y baja.
 * - `CUMULATIVE`: lo acumulado desde el principio. Solo sube.
 * - `FLOW`: lo consumido dentro de una ventana (facturas del mes). Se reinicia.
 */
export type LimitMeasureKind = 'STOCK' | 'CUMULATIVE' | 'FLOW'

/**
 * De dónde sale el techo, **en orden de precedencia descendente**:
 * `COMPANY_OVERRIDE > SUBSCRIPTION > CATALOG_DEFAULT > NONE`.
 *
 * <p>Ese orden lo resuelve el servidor y esta consola no lo recalcula: ver
 * `limitsApi.findEffectiveLimit`.
 */
export type LimitSource = 'COMPANY_OVERRIDE' | 'SUBSCRIPTION' | 'CATALOG_DEFAULT' | 'NONE'

/**
 * La lista cerrada de motivos de una excepción negociada, y también de su
 * revocación.
 *
 * <p><b>Por qué cerrada.</b> La firma existe para que dentro de dos ejercicios
 * alguien pueda contar cuántas excepciones se concedieron «por retención» y
 * cuántas «por migración». Con texto libre esa cuenta no se puede hacer: a
 * quinientos clientes se convierte en cuatrocientas frases distintas que dicen
 * cinco cosas, y el informe de «a quién le hemos hecho excepciones» deja de
 * significar nada. El texto libre sigue estando al lado, en `reason`, para lo
 * que el código no captura — nunca *en lugar* del código.
 */
export type LimitOverrideReasonCode =
  'RETENTION' | 'MIGRATION' | 'COMMERCIAL_AGREEMENT' | 'SUPPORT_INCIDENT' | 'OTHER'

/** Los seis hechos que la bitácora de cupo puede registrar. */
export type LimitEventType =
  | 'THRESHOLD_WARNED'
  | 'LIMIT_BLOCKED'
  | 'LIMIT_RAISED'
  | 'USAGE_RECONCILED'
  | 'USAGE_ADJUSTED'
  | 'OVER_LIMIT_ON_DOWNGRADE'

/** El submódulo al que un eje queda atado, cuando lo hay. */
export interface LimitDimensionSubModuleSummary {
  id: number
  code: string
  /** El contrato no lo garantiza: un submódulo puede llegar solo con su código. */
  name: string | null
}

/** Un eje de cupo de la plataforma. Es global: no pertenece a ninguna empresa. */
export interface LimitDimensionResponse {
  id: number
  /** Identificador estable del eje. **Copiado aguas abajo y por eso inmutable.** */
  code: string
  name: string
  measureKind: LimitMeasureKind
  /** `null` cuando el eje no cuelga de ningún submódulo. */
  subModule: LimitDimensionSubModuleSummary | null
  /** Días de gracia entre la liberación de cupo y su efecto. `null` = ninguno. */
  releaseDelayDays: number | null
  /** Desde cuándo el eje se puede contratar. También inmutable: hay cupos atados. */
  availableFrom: string
  createdDate: string
}

/**
 * Alta de un eje. Trae `code`, `measureKind` y `availableFrom` **porque en el
 * alta sí se eligen**; en la edición no aparecen, y eso no es un descuido:
 * `UpdateLimitDimensionRequest` no los admite.
 */
export interface CreateLimitDimensionRequest {
  code: string
  name: string
  measureKind: LimitMeasureKind
  subModuleId: number | null
  releaseDelayDays: number | null
  availableFrom: string
}

/**
 * Edición de un eje: **solo tres campos**.
 *
 * <p>El código, el tipo de medida y la fecha de disponibilidad no están aquí
 * porque el endpoint no los acepta. El código viaja copiado a cada cupo
 * contratado y el tipo de medida gobierna cómo se cuenta el consumo ya
 * registrado: cambiarlos reinterpretaría hacia atrás datos que ya existen. La
 * pantalla los enseña en solo lectura y dice por qué (R14 · un hueco honesto
 * antes que un control que promete algo que el servidor va a rechazar).
 */
export interface UpdateLimitDimensionRequest {
  name: string
  subModuleId: number | null
  releaseDelayDays: number | null
}

/**
 * Una excepción de techo negociada con un cliente concreto.
 *
 * <p>`alive` es lo que separa la vigente de la histórica: una revocada **no se
 * borra**, se marca. Es la prueba de que se concedió y de que se retiró.
 */
export interface CompanyLimitOverrideResponse {
  id: number
  companyId: number
  limitDimensionId: number
  limitQuantity: number
  validFrom: string
  /** `null` = sin fecha de fin pactada. No significa «caducada». */
  validTo: string | null
  reasonCode: LimitOverrideReasonCode
  reason: string
  grantedBySystemUserId: number
  revokedBySystemUserId: number | null
  revokedAt: string | null
  revokedReasonCode: LimitOverrideReasonCode | null
  revokedReason: string | null
  alive: boolean
}

/** Negociar una excepción. La empresa viaja en la URL, no en el cuerpo. */
export interface GrantCompanyLimitOverrideRequest {
  limitDimensionId: number
  limitQuantity: number
  validFrom: string
  reasonCode: LimitOverrideReasonCode
  reason: string
}

/** Revocar la excepción viva de una empresa sobre un eje. */
export interface RevokeCompanyLimitOverrideRequest {
  revokedReasonCode: LimitOverrideReasonCode
  revokedReason: string
}

/**
 * Un hecho de la bitácora de cupo.
 *
 * <p>Es la ÚNICA respuesta del contrato que trae `usedQuantity` y
 * `limitQuantity` **juntos**, y por eso es la fuente de la pantalla de cuentas
 * desbordadas: `EffectiveLimitResponse` da el techo pero no el consumo.
 */
export interface CompanyLimitEventResponse {
  id: number
  companyId: number
  limitDimensionId: number
  eventType: LimitEventType
  limitQuantity: number
  usedQuantity: number
  /** Cuánto se pidió mover. Negativo al liberar. */
  requestedDelta: number
  /** De dónde salía el techo **en el momento del hecho**, no ahora. */
  limitSource: LimitSource
  overrideId: number | null
  actorEmployeeId: number | null
  actorSystemUserId: number | null
  /** Lo hizo un proceso automático, no una persona. */
  actorIsProcess: boolean
  reasonCode: string | null
  reason: string | null
  occurredAt: string
}

/**
 * **El techo efectivo, tal y como lo resuelve el servidor.**
 *
 * <p>El front NO calcula la precedencia
 * `COMPANY_OVERRIDE > SUBSCRIPTION > CATALOG_DEFAULT > NONE`: la pide. Si la
 * replicara, el día que el backend metiera un quinto origen la consola seguiría
 * respondiendo con seguridad una cifra equivocada, que es peor que no responder.
 *
 * <p><b>`limitQuantity` vacío significa sin techo, y sin techo no es cero.</b>
 * `unlimited` lo dice explícito para que ninguna pantalla tenga que deducirlo.
 */
export interface EffectiveLimitResponse {
  companyId: number
  limitDimensionId: number
  /** `null` = sin techo. Jamás se pinta como 0. */
  limitQuantity: number | null
  source: LimitSource
  /** La excepción de la que sale, y solo con origen `COMPANY_OVERRIDE`. */
  overrideId: number | null
  unlimited: boolean
}
