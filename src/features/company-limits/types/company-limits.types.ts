import type { MatchesContract } from '@/types/api.contract'
import type { ProvenanceSource } from '@/components/ui/ProvenanceLine.vue'
import type { CompanyCapacityResponse } from '@/features/subscriptions-admin/types/entitlements.types'

/**
 * <b>Los cupos de una empresa</b>: de dónde sale cada techo, qué se ha consumido,
 * qué pasó cada vez que se topó con él y cómo se corrige un contador (§I4, que es
 * la misma pantalla que §B8).
 *
 * <p>Los nombres son los del contrato para que la atadura de abajo se lea igual
 * aquí que en el backend. Vive en este fichero y no en `src/types/api.contract.ts`
 * por la misma razón que la de `trials`: ese fichero es el punto de serialización
 * de todo el repositorio y varias features escribiendo a la vez en su lista de
 * importaciones es la colisión que el reparto de la campaña prohíbe.
 * `MatchesContract` está exportado y comprueba exactamente lo mismo.
 */

/** Rompe la compilación si el tipo no encaja; el error nombra los campos culpables. */
type Expect<T extends true> = T

/**
 * De dónde sale el techo, en orden de precedencia descendente. Es lo que la
 * pantalla traduce a procedencia (`ProvenanceLine`): sin esto, un cupo es un
 * número que nadie sabe quién manda.
 */
export type LimitSource = 'COMPANY_OVERRIDE' | 'SUBSCRIPTION' | 'CATALOG_DEFAULT' | 'NONE'

/**
 * Qué le pasó al cupo. Los seis son hechos, no estados: cada fila de la bitácora
 * es algo que ocurrió una vez y a una hora.
 *
 * <p>`LIMIT_BLOCKED` es el portazo —alguien intentó crear y no pudo—;
 * `OVER_LIMIT_ON_DOWNGRADE` es lo contrario y no es un error: al bajar el
 * contrato, el cliente se queda por encima del techo, <b>conserva lo suyo</b> y
 * no puede crear más.
 */
export type LimitEventType =
  | 'THRESHOLD_WARNED'
  | 'LIMIT_BLOCKED'
  | 'LIMIT_RAISED'
  | 'USAGE_RECONCILED'
  | 'USAGE_ADJUSTED'
  | 'OVER_LIMIT_ON_DOWNGRADE'

/** Por qué se recalculó lo que la empresa puede usar. */
export type SnapshotTriggerReason =
  'CONTRACT_AMENDMENT' | 'TRIAL_EXPIRED' | 'DUNNING' | 'MANUAL' | 'REPAIR'

/**
 * Un hecho de la bitácora de cupo.
 *
 * <p><b>`limitQuantity` y `usedQuantity` son los de aquel momento, no los de
 * hoy.</b> Es lo que hace que dentro de un año se pueda reconstruir de qué cifra
 * se partía; leerlos como el estado actual es el error que convierte una bitácora
 * en un panel roto.
 */
export interface CompanyLimitEventResponse {
  id: number
  companyId: number
  limitDimensionId: number
  eventType: LimitEventType
  /** El techo en el momento del hecho. */
  limitQuantity: number
  /** El consumo en el momento del hecho, ANTES de aplicar el `requestedDelta`. */
  usedQuantity: number
  /** Cuánto se pidió mover. Negativo en una corrección que resta. */
  requestedDelta: number
  /** De dónde salía el techo en el momento del hecho. */
  limitSource: LimitSource
  overrideId: number | null
  actorEmployeeId: number | null
  actorSystemUserId: number | null
  /** `true` cuando no lo hizo una persona sino un proceso. */
  actorIsProcess: boolean
  reasonCode: string | null
  reason: string | null
  occurredAt: string
}

/**
 * El techo vigente de un eje y de dónde sale.
 *
 * <p><b>`limitQuantity` vacío significa «sin techo», que no es lo mismo que
 * cero.</b> Lo dice el propio contrato, y es exactamente la confusión que
 * `CapacityMeter` evita no pintando barra cuando no hay límite: una barra al
 * 100 % sobre un techo inexistente es un cupo agotado que nadie tiene.
 */
export interface EffectiveLimitResponse {
  companyId: number
  limitDimensionId: number
  /** Vacío significa sin techo, que no es lo mismo que cero. */
  limitQuantity: number | null
  source: LimitSource
  /** La excepción negociada de la que sale, solo con origen `COMPANY_OVERRIDE`. */
  overrideId: number | null
  unlimited: boolean
}

/**
 * `POST /system/company-limit-events/companies/{companyId}/usage-adjustments`.
 *
 * <p><b>Este cuerpo, y no otro.</b> Es el puerto de plataforma
 * (`SystemCompanyLimitEventController`, cerrado a `hasRole('SYSTEM')`), y su
 * javadoc dice por qué existe separado: «si la corrección aterrizara en un puerto
 * cuya autorización ya admite al cliente, la administradora de la clínica
 * recuperaría su cupo cada vez que topa y el cupo dejaría de existir sin que
 * ninguna fila del modelo estuviera mal». No es una preferencia de diseño: es la
 * diferencia entre que el cupo se pueda vender y que no.
 *
 * <p>⚠️ <b>`capacityUnit` NO es la unidad de capacidad del catálogo.</b> El nombre
 * es herencia de un enum que el backend ya borró; hoy es <b>el `code` de la
 * dimensión de límite</b>, y así viaja de punta a punta
 * (`EntitlementCompanyUsageAdjustmentAdapter`: «el identificador del eje viaja
 * como texto de punta a punta: es el `code` de `limit_dimensions`»). La pantalla
 * lo toma del `dimensionCode` de la fila que se está corrigiendo, nunca de un
 * desplegable de cuatro valores: un eje sembrado después no estaría en esa lista
 * y su contador quedaría sin poder corregirse.
 *
 * <p>`delta` es un movimiento, no un total: −500 resta quinientos al contador. El
 * servidor lee el consumo <b>antes</b> de moverlo y lo copia en el hecho.
 * Firmante y fecha los pone el backend con `authz.currentSystemUserId()`: una
 * firma que escribe quien actúa no prueba nada.
 */
export interface AdjustCompanyUsageRequest {
  limitDimensionId: number
  /** El `code` de la dimensión. Ver la nota de arriba: no es una unidad de catálogo. */
  capacityUnit: string
  delta: number
  reasonCode: string
  reason: string
}

/**
 * La foto de lo que la empresa podía usar en un instante, y por qué se recalculó.
 *
 * <p>`payload` es el JSON congelado del cálculo. Esta pantalla <b>no lo pinta</b>:
 * su formato lo versiona `payloadFormatVersion` y renderizarlo campo a campo sería
 * atarse a una forma que el backend puede cambiar sin avisar a nadie. Lo que sí se
 * lee es cuándo y por qué, que es el indicador de salud.
 */
export interface CompanyEntitlementSnapshotResponse {
  id: number
  companyId: number
  recalculatedAt: string
  actorEmployeeId: number | null
  actorSystemUserId: number | null
  actorIsProcess: boolean
  triggerReason: SnapshotTriggerReason
  amendmentId: number | null
  payload: string
  payloadFormatVersion: number
}

/**
 * <b>Una fila de la pantalla de cupos</b>: el contador de un eje, su techo
 * efectivo y de dónde sale. No es un tipo del contrato —no se ata a nada— sino el
 * modelo de vista que arma `useCompanyLimits` y consumen la tarjeta y el modal.
 *
 * <p>Vive aquí y no dentro del componente para que la tarjeta, el modal de
 * corrección y el composable hablen de la misma cosa: tres formas parecidas del
 * mismo dato es cómo acaba el modal corrigiendo el eje que no era.
 */
export interface CompanyLimitRow {
  capacity: CompanyCapacityResponse
  /** El techo efectivo, si su llamada llegó. `null` = no se sabe de dónde sale. */
  effective: EffectiveLimitResponse | null
  /** «Usuarios», «Sedes»… resuelto por código de eje, no por un `Record` cerrado. */
  title: string
  /** El sustantivo en minúscula que cierra el texto del medidor. */
  noun: string
  /** El techo. `null` = no hay techo declarado, que no es un techo de cero. */
  limit: number | null
  /** Lo consumido. `null` = el servidor no lo sabe; no se convierte en cero. */
  used: number | null
  /** Lo dice el servidor. */
  exhausted: boolean
  /** Traducido al vocabulario de `ProvenanceLine`. `null` = no hay origen que nombrar. */
  provenance: ProvenanceSource | null
  /** La frase de «está por encima del techo, y no es un error». `null` si no lo está. */
  overLimit: string | null
}

/**
 * La atadura al contrato (TR-01). Si el backend renombra `usedQuantity` o cambia
 * `limitSource` por otra cosa, esto deja de compilar en vez de pintar `undefined`.
 */
export type CompanyLimitsContractCheck = [
  Expect<MatchesContract<CompanyLimitEventResponse, 'CompanyLimitEventResponse'>>,
  Expect<MatchesContract<EffectiveLimitResponse, 'EffectiveLimitResponse'>>,
  Expect<MatchesContract<AdjustCompanyUsageRequest, 'AdjustCompanyUsageRequest'>>,
  Expect<MatchesContract<CompanyEntitlementSnapshotResponse, 'CompanyEntitlementSnapshotResponse'>>,
]
