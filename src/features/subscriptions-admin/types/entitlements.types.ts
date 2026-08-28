import type { SubModuleSummary } from '@/features/platform-setup/types/platform-setup.types'
import type { SubscriptionStatus } from './subscriptions-admin.types'

/**
 * `/acceso` — la sub-vista <b>derivada</b> del expediente del contrato (§4.4.2,
 * tarea W2-D).
 *
 * <p><b>Nada de esto se edita.</b> La tabla de permisos no contiene ninguna
 * decisión: es el resultado de aplicar el contrato vigente, y si se corrompe se
 * reconstruye entera desde los contratos, que son la verdad. Por eso aquí no hay
 * ni un solo tipo de petición: los tres endpoints del slice son de lectura o de
 * reparación y <b>ninguno lleva cuerpo</b>
 * (`CompanyEntitlementController.java:33-34`).
 *
 * <p><b>Ninguno recibe `companyId` tampoco</b>, ni en la ruta ni en el cuerpo: lo
 * pone el controller con `authz.currentCompanyId()`, que para el operador de esta
 * consola lee la cabecera `X-Company-Id` (§1.1). Ver `entitlements.api.ts`.
 *
 * <p>`SubModuleSummary` se importa de `platform-setup` y no se redeclara: el
 * contrato lo define UNA vez y `api-contract.spec.ts` agrupa por nombre, así que
 * dos interfaces homónimas dejarían una de las dos sin atar.
 */

/**
 * Qué puede hacer una empresa con un submódulo <em>ahora mismo</em>
 * (`entitlement/domain/AccessLevel.java`).
 *
 * <p>El orden de declaración es el orden de restricción, de menos a más, y el
 * significado de cada uno es literal:
 *
 * <ul>
 *   <li>`FULL` — uso normal: crea y modifica.</li>
 *   <li>`READ_ONLY` — consulta e impresión, <b>ni crear ni modificar</b>.</li>
 *   <li>`NONE` — ese submódulo no existe para él.</li>
 * </ul>
 *
 * <p><b>No hay, ni se añadirá, un valor que signifique un corte total de
 * acceso</b> (R18 del modelo). El grado máximo de restricción es `READ_ONLY`
 * incluso para un moroso, y la interfaz no puede sugerir lo contrario: por eso
 * los rótulos de este slice están fijados en `entitlementText.ts` y hay una
 * prueba que barre el vocabulario.
 */
export type EntitlementAccessLevel = 'FULL' | 'READ_ONLY' | 'NONE'

/**
 * De dónde sale un permiso (`entitlement/domain/EntitlementSource.java`). Es lo
 * que permite responder «¿por qué esta clínica ve facturación?» sin abrir el
 * contrato — <b>el puente de vuelta al dinero</b>.
 *
 * <p>`SUBSCRIPTION` y `TRIAL` exigen contrato detrás (`requiresSubscription()`,
 * espejo de `chk_company_entitlements_origin`), así que sus filas siempre traen
 * `subscriptionId` y pueden enlazar a la línea que las justifica. `CORE` viene
 * con el núcleo del producto y `MANUAL_GRANT` <b>no se deriva del contrato</b>:
 * es lo único de esta tabla que una persona puso a mano, el recálculo lo
 * preserva a propósito, y por eso se distingue en pantalla.
 */
export type EntitlementSource = 'SUBSCRIPTION' | 'TRIAL' | 'CORE' | 'MANUAL_GRANT'

/**
 * Los ejes de capacidad que esta consola sabe nombrar en español.
 *
 * <p><b>Ya NO es un enum del contrato.</b> Era el calco de
 * `entitlement/domain/CapacityUnit.java`, «cuatro valores, cerrados» — y ese fichero ya no
 * existe: el backend sustituyó el enum por una dimensión con fila propia, así que
 * `CompanyCapacityResponse.dimensionCode` es un `string` libre y el servidor puede sembrar un
 * eje nuevo sin tocar una línea de Java.
 *
 * <p>Lo que queda aquí es <b>una tabla de traducción, no una restricción</b>: el conjunto de
 * códigos para los que hay etiqueta escrita. Un código fuera de esta lista es legal y hay que
 * pintarlo igual, así que <b>nunca se indexa directamente</b> — se pasa por `capacityTitle()` o
 * `capacityNoun()`, que caen al propio código cuando no lo conocen. Indexar un `Record` cerrado
 * con un `string` del servidor es exactamente cómo se pinta `undefined` en pantalla.
 */
export type CapacityUnit = 'USER' | 'BRANCH' | 'TERMINAL' | 'STORAGE_GB'

/**
 * Una fila de la tabla derivada: un submódulo y el nivel con el que la empresa
 * lo tiene hoy.
 *
 * <p><b>`subscriptionId` y `subscriptionItemId` son el puente de vuelta al
 * contrato</b>, y por eso se declaran nulables de forma explícita: un `CORE` no
 * tiene línea que lo justifique y un `MANUAL_GRANT` tampoco. Confundir «no hay
 * línea» con «no llegó el dato» es lo que convertiría un enlace ausente en un
 * enlace roto.
 *
 * <p>`validUntil` nulo significa «sin fecha de fin», no «caducado».
 */
export interface CompanyEntitlementResponse {
  id: number
  companyId: number
  subModule: SubModuleSummary
  accessLevel: EntitlementAccessLevel
  source: EntitlementSource
  /** La línea de contrato que lo paga. Nulo en `CORE` y en `MANUAL_GRANT`. */
  subscriptionId: number | null
  /** La línea exacta. Nulo cuando el permiso no se deriva de una línea. */
  subscriptionItemId: number | null
  validFrom: string | null
  validUntil: string | null
  recalculatedAt: string | null
}

/**
 * Un contador, no una pantalla: «7 de 10 usuarios».
 *
 * <p>`exhausted` lo dice el servidor y no se recalcula aquí a ojo: `used >=
 * limit` en el cliente daría un veredicto distinto al del backend en el caso de
 * un límite nulo, que es justamente el que hay que tratar aparte.
 */
export interface CompanyCapacityResponse {
  id: number
  companyId: number
  /**
   * <b>El eje ya no es un enum de cuatro valores.</b> `capacityUnit` desapareció del contrato
   * y en su lugar el servidor identifica la dimensión con `limitDimensionId` + `dimensionCode`,
   * que son datos de una tabla y no constantes de Java: el backend borró
   * `entitlement/domain/CapacityUnit.java`. Cualquier código que trate `dimensionCode` como si
   * tuviera exactamente cuatro valores posibles volverá a romperse en cuanto se siembre un eje
   * nuevo — por eso las etiquetas se resuelven con una función que sabe caer de pie
   * (`capacityTitle`/`capacityNoun`) y no indexando un `Record` cerrado.
   */
  limitDimensionId: number
  dimensionCode: string
  /**
   * Cómo se mide el eje. Un eje ACUMULATIVO cuenta lo registrado históricamente y uno de flujo
   * cuenta lo del periodo: llamar «activas» a lo acumulado es el error que R-LIMIT-40 nombra.
   */
  measureKind: string
  /** De qué periodo habla un eje de flujo. Nulo en los ejes que no se reinician. */
  periodKey: string | null
  /** Nulo cuando la capacidad no tiene techo declarado. */
  limitQuantity: number | null
  usedQuantity: number | null
  exhausted: boolean
  subscriptionId: number | null
  /**
   * Cuándo se recalculó el LÍMITE. No es lo mismo que `usageReconciledAt` —cuándo se comprobó
   * el CONSUMO contra las filas reales—, y por eso el contrato manda los dos (R-ENT-13).
   * `usageReconciledAt` llega nulo mientras no se haya reconciliado nunca.
   */
  limitRecalculatedAt: string | null
  usageReconciledAt: string | null
}

/**
 * `GET /entitlements/access` — <b>la consulta caliente</b>: qué puede usar la
 * clínica ahora mismo, con sus contadores.
 *
 * <p>Es la que gobierna la pantalla. La otra —`GET /entitlements`— es el listado
 * de auditoría, «con los caducados y los ocultos», y responde otra pregunta.
 *
 * <p><b>`recalculatedAt` es un indicador de salud, no un adorno</b>: si esta
 * fecha se queda vieja, hay un proceso caído. Ver `recalculationHealth()`.
 */
export interface CompanyAccessResponse {
  companyId: number
  entitlements: CompanyEntitlementResponse[]
  capacities: CompanyCapacityResponse[]
  recalculatedAt: string | null
}

/**
 * `POST /entitlements/recalculate` — lo que devuelve la reparación.
 *
 * <p>No es un refresco de página: reconstruye la tabla entera desde los
 * contratos. Los tres contadores son lo que se le enseña al operador después,
 * porque son la única prueba de que el recálculo hizo algo — y `manualGrantCount`
 * en particular es la que confirma por escrito que las concesiones hechas a mano
 * <b>se conservaron</b>.
 *
 * <p>`contractStatus` es el enum de seis valores de
 * `entitlement/domain/ContractStatus.java`, un companion literal de
 * `subscriptions.status` (el vertical slicing prohíbe importarlo del otro slice,
 * así que allí se copia). Aquí se tipa con `SubscriptionStatus`, que es el mismo
 * conjunto ya declarado en este repositorio, para no acabar con dos uniones
 * idénticas que puedan divergir.
 */
export interface EntitlementRecalculationResponse {
  companyId: number
  subscriptionId: number | null
  contractStatus: SubscriptionStatus | null
  entitlementCount: number
  manualGrantCount: number
  capacityCount: number
  recalculatedAt: string | null
}

/** Los dos modos de la tabla: la consulta caliente o el listado de auditoría. */
export type EntitlementScope = 'current' | 'audit'
