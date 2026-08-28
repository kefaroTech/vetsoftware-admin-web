import type { CompanyCitySummary } from './companies.types'

/**
 * <b>La cesión del contrato</b> (§I11, decisión D-62 del modelo).
 *
 * <p><b>Esta pestaña estaba declarada como bloqueada y ya no lo está.</b> Su
 * `blockedBy` decía «no hay ningún endpoint de cesión de contrato en
 * api/openapi.json», y era cierto cuando se escribió. La regeneración del
 * contrato trajo `POST /company-billing-profile/succession`, que es exactamente
 * la operación: el perfil de facturación vigente se cierra y se abre otro a
 * nombre del nuevo titular, desde una fecha.
 *
 * <p><b>Ceder es sustituir al titular, no mover una empresa.</b> Conviene
 * decirlo porque el nombre engaña: la empresa —sus mascotas, su historia
 * clínica, sus usuarios— no se toca. Lo que cambia es <b>quién es el
 * contribuyente que factura y paga</b>. Por eso el cuerpo es un perfil fiscal
 * completo y no una referencia a otra empresa.
 *
 * <p><b>La sucesión es una serie, no un estado que se sobrescribe.</b>
 * `validFrom`/`validTo` en la respuesta y `GET /company-billing-profile/history`
 * paginado son la prueba: cada titular deja su tramo, y se puede contestar
 * cuántas veces se cedió el contrato y a quién en cada momento. Una factura del
 * año pasado sigue apuntando al titular que la recibió — que es la razón de que
 * esto no sea un `PUT`.
 */

/** Persona natural o jurídica. Decide qué campos de nombre tienen sentido. */
export type BillingPersonKind = 'NATURAL' | 'LEGAL'

/** El tipo de documento del contribuyente. */
export type BillingTaxIdKind = 'NIT' | 'CC' | 'CE' | 'PASSPORT' | 'FOREIGN_ID'

/**
 * El régimen del perfil de facturación.
 *
 * <p>⚠️ <b>No es el mismo enum que `TaxRegime` de `company-fiscal.types.ts`</b>,
 * aunque el campo se llame igual en los dos sitios. Aquel es
 * `RESPONSABLE_IVA | NO_RESPONSABLE_IVA` y pertenece a `CompanyTaxProfileResponse`;
 * este tiene cuatro valores y pertenece a `CompanyBillingProfileResponse`. Son dos
 * esquemas distintos del contrato y reusar el tipo los mezclaría: el compilador
 * dejaría pasar un `SPECIAL` donde el otro esquema solo admite dos valores, y el
 * error saldría en la respuesta del servidor y no aquí.
 */
export type BillingTaxRegime = 'COMMON' | 'SIMPLE' | 'NOT_RESPONSIBLE_VAT' | 'SPECIAL'

/**
 * Un titular del contrato con su tramo de vigencia.
 *
 * <p><b>`validTo` nulo es el titular actual</b>, no un dato que falte. Un perfil
 * con `validTo` puesto es un titular anterior, y sigue existiendo a propósito:
 * es lo que explica a quién se facturó en marzo.
 *
 * <p>`city` reusa `CompanyCitySummary` en vez de declarar un `CitySummary`
 * homónimo: son la misma forma (`id` + `name`) y dos interfaces iguales dejarían
 * una de las dos sin atar al contrato, que es el fallo TR-01 que la atadura
 * existe para impedir.
 */
export interface CompanyBillingProfileResponse {
  id: number
  personKind: BillingPersonKind
  taxIdKind: BillingTaxIdKind
  taxId: string
  verificationDigit: string | null
  /** El nombre de una persona jurídica. Nulo en una natural. */
  legalName: string | null
  firstName: string | null
  middleName: string | null
  lastName: string | null
  secondLastName: string | null
  address: string
  city: CompanyCitySummary
  billingEmail: string
  taxRegime: BillingTaxRegime
  withholdingAgent: boolean
  /** Primer día de este titular. */
  validFrom: string
  /** Último día de este titular. Nulo = es el vigente. */
  validTo: string | null
  createdDate: string
}

/**
 * `POST /company-billing-profile/succession` — <b>ceder el contrato</b>.
 *
 * <p><b>`effectiveFrom` es la línea que parte la responsabilidad.</b> Todo lo
 * facturado antes es del titular saliente y todo lo posterior del entrante; no
 * es un metadato, es quién paga. Por eso la pantalla lo pide explícitamente y no
 * lo rellena con hoy en silencio.
 *
 * <p><b>El cuerpo no lleva ni motivo ni nota</b>, igual que `OpenTrialWindowRequest`.
 * Lo que justifica una cesión es el documento que la acordó, y el contrato no
 * publica campo para él. Ver `companyCessionText.ts`.
 */
export interface SucceedCompanyBillingProfileRequest {
  personKind: BillingPersonKind
  taxIdKind: BillingTaxIdKind
  taxId: string
  verificationDigit?: string
  legalName?: string
  firstName?: string
  middleName?: string
  lastName?: string
  secondLastName?: string
  address: string
  cityId: number
  billingEmail: string
  taxRegime: BillingTaxRegime
  withholdingAgent: boolean
  effectiveFrom: string
}
