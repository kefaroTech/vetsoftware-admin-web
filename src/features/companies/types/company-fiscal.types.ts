import type { CompanySummary } from '@/features/quotes/types/quotes.types'

/**
 * <b>El perfil fiscal de una empresa y su numeración</b> (§I7 de
 * `docs/ux/suscripciones-consola-ampliacion-especificacion.md`).
 *
 * <p>Los nombres son los del contrato (`api/openapi.json`), no los del castellano
 * de la pantalla: `CompanyTaxProfileResponse`, `NumberingResolutionResponse`,
 * `WithholdingConfigDto`. Es la condición para que la atadura de
 * `src/types/api.contract.ts` sirva de algo — un tipo que se llama distinto del
 * esquema no se puede afirmar contra él.
 *
 * <p><b>`CompanySummary` no se redeclara.</b> Los tres DTO de arriba anidan el
 * mismo esquema `CompanySummary` que ya está escrito y —lo que importa— ya está
 * atado al contrato desde las cotizaciones. Una segunda copia homónima sería una
 * copia sin atar, que es exactamente el fallo TR-01 que esa atadura existe para
 * impedir.
 */

/**
 * Tipo de documento del titular del perfil fiscal.
 *
 * <p><b>Tres de los cuatro son de persona natural</b>, y esa distinción no es
 * decorativa: gobierna qué exige el reporte anual a la administración. Ver
 * `isNaturalPerson` en `companyFiscalText.ts`.
 *
 * <p>El contrato lo declara como una unión cerrada anónima dentro de
 * `CompanyTaxProfileResponse` —springdoc no le da nombre propio a los enums
 * anidados—, así que aquí lleva el nombre del enum de Java
 * (`CompanyDocumentType`), que es lo más cercano a «como el esquema».
 */
export type CompanyDocumentType = 'NIT' | 'CEDULA_CIUDADANIA' | 'CEDULA_EXTRANJERIA' | 'PASAPORTE'

/** Régimen de IVA declarado por la empresa. Unión cerrada del contrato. */
export type TaxRegime = 'RESPONSABLE_IVA' | 'NO_RESPONSABLE_IVA'

/** El tipo de documento que ampara una resolución de numeración. */
export type ElectronicDocumentType = 'FE_VENTA' | 'DOC_EQUIV_POS' | 'NOTA_CREDITO' | 'NOTA_DEBITO'

/** La actividad económica del perfil, tal y como la anida el contrato. */
export interface EconomicActivitySummary {
  id: number
  code: string
  name: string
}

/**
 * <b>El perfil fiscal vigente de la empresa.</b> Hay como mucho uno:
 * `GET /company-tax-profile` responde por la empresa de la cabecera
 * `X-Company-Id` y devuelve <b>un</b> perfil o un 404.
 *
 * <p><b>Lo que este tipo NO tiene, y la pantalla por tanto no puede pintar.</b>
 * No hay `validFrom`/`validTo`, ni `supersededAt`, ni identificador del perfil
 * anterior: el contrato de hoy no expresa la vigencia de un perfil ni su serie.
 * Es la razón por la que `/fiscal` es de solo lectura y lo dice con palabras en
 * vez de ofrecer un «editar» que reescribiría el pasado. Ver
 * `TAX_PROFILE_HISTORY_GAP`.
 *
 * <p>`companyDocumentVerificationDigit` lo <b>calcula el servidor</b> (módulo 11)
 * y es autoritativo: ignora cualquier valor entrante y solo existe para `NIT`.
 * Por eso se pinta pegado al documento y nunca como un campo aparte que alguien
 * pueda creer que se teclea.
 */
export interface CompanyTaxProfileResponse {
  id: number
  company: CompanySummary
  companyDocumentType: CompanyDocumentType
  companyDocumentId: string
  /** Solo para `NIT`. Lo calcula el backend; `null` en los demás tipos. */
  companyDocumentVerificationDigit: string | null
  legalName: string
  taxRegime: TaxRegime
  fiscalEmail: string
  commercialName: string | null
  economicActivity: EconomicActivitySummary | null
  /** Códigos de responsabilidad fiscal. Lista vacía = no declara ninguna. */
  responsibilities: string[]
  createdDate: string
  enabled: boolean
}

/**
 * <b>Una resolución de numeración de la clínica.</b>
 * `GET /numbering-resolutions` responde la lista de la empresa de la cabecera.
 *
 * <p><b>`currentNumber` es el PRÓXIMO consecutivo a emitir, no el último
 * emitido.</b> No es una interpretación: lo dice el dominio del backend
 * (`NumberingResolution.java:25-28` — «Próximo consecutivo a emitir dentro del
 * rango. Se gestiona al emitir documentos, no por el CRUD: el create lo
 * inicializa en `rangeFrom` y el update lo conserva»), y el invariante
 * `rangeFrom ≤ currentNumber ≤ rangeTo` está validado allí mismo.
 *
 * <p>De ahí salen las dos cuentas de la pantalla, y el signo importa: emitidos =
 * `currentNumber − rangeFrom`, y <b>quedan = `rangeTo − currentNumber + 1`</b>.
 * Con la lectura contraria («el último emitido») las dos saldrían desplazadas en
 * uno, que en una resolución a punto de agotarse es la diferencia entre avisar y
 * no avisar.
 *
 * <p>`enabled` viene siempre `true` en el listado: la entidad JPA lleva
 * `@SQLRestriction("enabled = true")`, así que las retiradas no se devuelven. Por
 * eso la pantalla <b>no pinta una columna de estado</b> — sería una columna que
 * siempre dice lo mismo, que es un dato inventado con otra cara.
 */
export interface NumberingResolutionResponse {
  id: number
  company: CompanySummary
  /** Sede a la que aplica el prefijo. `null` = resolución de empresa. */
  branchId: number | null
  documentType: ElectronicDocumentType
  resolutionNumber: string
  resolutionDate: string
  prefix: string | null
  rangeFrom: number
  rangeTo: number
  validFrom: string
  validTo: string
  technicalKey: string | null
  /** El próximo consecutivo a emitir. Ver la cabecera de este tipo. */
  currentNumber: number
  createdDate: string
  enabled: boolean
}

/**
 * <b>Las tarifas de retención que se espera que aplique la empresa.</b>
 * `GET /withholding-configs`, también por cabecera.
 *
 * <p>Todos los campos son opcionales en el contrato —`WithholdingConfigDto` no
 * declara ni uno como requerido—, así que aquí van nulables. Una tarifa ausente
 * <b>no es una tarifa del cero por ciento</b> y la pantalla las dice distinto:
 * confundirlas es cómo un giro sale corto sin que nada falle.
 */
export interface WithholdingConfigDto {
  id: number | null
  companyId: number | null
  reteFuenteRate: number | null
  reteIvaRate: number | null
  reteIcaRate: number | null
  createdDate: string | null
  enabled: boolean | null
}
