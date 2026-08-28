import { businessToday } from '@/features/commercial-catalog/composables/priceListValidity'
import type {
  BillingPersonKind,
  BillingTaxIdKind,
  BillingTaxRegime,
  CompanyBillingProfileResponse,
} from '../types/company-cession.types'

/**
 * <b>Los textos y las reglas puras de la cesión del contrato</b> (§I11, D-62).
 *
 * <p>Aquí no hay estado ni peticiones: son funciones puras que una prueba
 * unitaria puede barrer sin montar un componente, y es lo que hace que la regla
 * de «quién era el titular tal día» esté escrita una sola vez.
 *
 * <p><b>«Hoy» se resuelve en la zona del negocio.</b> `validFrom` y `validTo` son
 * `LocalDate` del contrato: fechas civiles sin zona. Compararlas contra el reloj
 * del navegador hace que a un operador conectado desde Madrid una cesión que
 * entra en vigor el día 1 se le vea vigente durante las siete horas en las que en
 * Bogotá todavía es día 31 — y eso es una factura emitida al titular equivocado.
 * Se reusa {@link businessToday} de
 * `commercial-catalog/composables/priceListValidity.ts`, <b>importada y no
 * copiada</b>: la zona del negocio tiene un solo dueño en este repositorio.
 */

export const PERSON_KIND_LABEL: Record<BillingPersonKind, string> = {
  NATURAL: 'Persona natural',
  LEGAL: 'Persona jurídica',
}

export const TAX_ID_KIND_LABEL: Record<BillingTaxIdKind, string> = {
  NIT: 'NIT',
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PASSPORT: 'Pasaporte',
  FOREIGN_ID: 'Documento extranjero',
}

export const BILLING_TAX_REGIME_LABEL: Record<BillingTaxRegime, string> = {
  COMMON: 'Régimen común',
  SIMPLE: 'Régimen simple',
  NOT_RESPONSIBLE_VAT: 'No responsable de IVA',
  SPECIAL: 'Régimen especial',
}

export const PERSON_KIND_OPTIONS = (Object.keys(PERSON_KIND_LABEL) as BillingPersonKind[]).map(
  (value) => ({ value, label: PERSON_KIND_LABEL[value] }),
)

export const TAX_ID_KIND_OPTIONS = (Object.keys(TAX_ID_KIND_LABEL) as BillingTaxIdKind[]).map(
  (value) => ({ value, label: TAX_ID_KIND_LABEL[value] }),
)

export const BILLING_TAX_REGIME_OPTIONS = (
  Object.keys(BILLING_TAX_REGIME_LABEL) as BillingTaxRegime[]
).map((value) => ({ value, label: BILLING_TAX_REGIME_LABEL[value] }))

/**
 * Cómo se llama este titular. Una jurídica tiene razón social; una natural,
 * nombre y apellidos, y el contrato los trae por separado.
 *
 * <p>Devuelve una frase honesta cuando no hay ninguno en vez de una cadena vacía:
 * una celda en blanco en la columna del titular se lee como un fallo de la
 * pantalla, y lo que pasa es que el dato no está.
 */
export function billingProfileName(profile: CompanyBillingProfileResponse): string {
  if (profile.personKind === 'LEGAL') return profile.legalName?.trim() || 'Sin razón social'
  const parts = [profile.firstName, profile.middleName, profile.lastName, profile.secondLastName]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '')
  return parts.length > 0 ? parts.join(' ') : 'Sin nombre'
}

/** El documento con su dígito de verificación, cuando lo hay. */
export function billingProfileTaxId(profile: CompanyBillingProfileResponse): string {
  const digit = profile.verificationDigit?.trim()
  const base = `${TAX_ID_KIND_LABEL[profile.taxIdKind]} ${profile.taxId}`
  return digit ? `${base}-${digit}` : base
}

/**
 * ¿Es este el titular de hoy? <b>No basta con `validTo === null`</b>: una cesión
 * firmada hoy con efecto el día 1 del mes que viene deja el perfil entrante ya
 * creado y con `validTo` nulo, y sigue sin ser el titular actual. Se comprueba el
 * tramo entero.
 */
export function isCurrentHolder(
  profile: CompanyBillingProfileResponse,
  today: string = businessToday(),
): boolean {
  if (profile.validFrom > today) return false
  return profile.validTo === null || profile.validTo >= today
}

export interface HolderState {
  label: string
  variant: 'success' | 'warning' | 'neutral'
}

/** En qué punto está este titular respecto de hoy. Tres casos, sin cuarto. */
export function holderState(
  profile: CompanyBillingProfileResponse,
  today: string = businessToday(),
): HolderState {
  if (profile.validFrom > today)
    return { label: `Entra el ${profile.validFrom}`, variant: 'warning' }
  if (profile.validTo !== null && profile.validTo < today)
    return { label: `Hasta el ${profile.validTo}`, variant: 'neutral' }
  return { label: 'Titular actual', variant: 'success' }
}

/**
 * <b>La consecuencia que se pinta antes de firmar una cesión.</b> Va escrita en
 * la pantalla y no solo en este código: quien cede un contrato tiene que leer qué
 * deja de ser suyo y qué sigue siéndolo, y la mitad de las llamadas de soporte
 * salen de creer que ceder mueve los datos de la clínica.
 */
export const CESSION_CONSEQUENCE =
  'Cierra al titular actual desde el día anterior a la fecha que elijas y abre al nuevo desde esa fecha. Lo facturado antes sigue siendo del titular saliente y no cambia de destinatario. No hay operación que deshaga una cesión: si te equivocas, la corrección es otra cesión más, y las dos quedan en la serie.'

/**
 * <b>Lo que una cesión NO arrastra, y hoy no se puede enseñar.</b>
 *
 * <p>Las autorizaciones de tratamiento de datos las recogió el titular anterior,
 * y no se heredan: el entrante es un responsable distinto y tiene que volver a
 * pedirlas. Es decir, tras una cesión hay un conjunto de titulares de datos
 * pendientes de reconfirmar.
 *
 * <p><b>Esta pantalla no puede listarlos, y por eso lo dice con palabras.</b> El
 * contrato no publica `data_subject_authorizations` —se comprobó sobre
 * `api/openapi.json`, ver `datos-personales.tab.ts`—, así que no hay de dónde
 * sacar ni cuántas son ni cuáles. Pintar un contador en cero diría «no hay nada
 * pendiente», que es exactamente lo contrario de lo que pasa después de una
 * cesión, y sería la clase de cero inventado que R14 prohíbe.
 */
export const CESSION_DATA_AUTHORIZATIONS_GAP =
  'Una cesión no arrastra las autorizaciones de tratamiento de datos que recogió el titular anterior: el entrante es un responsable distinto y tiene que volver a pedirlas. Quedan pendientes de reconfirmar. Esta pantalla no puede decir cuántas ni de quién —el contrato no publica las autorizaciones de tratamiento, ver la pestaña «Datos personales»—, así que la reconfirmación hay que llevarla por fuera hasta que exista ese endpoint.'

/**
 * La otra ausencia deliberada: el cuerpo de la cesión no tiene ni motivo ni nota,
 * así que no se pide ninguno. Pedir una justificación que el borde descarta es
 * peor que no pedirla, porque el operador cree que quedó registrada — mismo
 * criterio que `OpenTrialWindowModal.vue`.
 */
export const CESSION_NO_REASON_FIELD =
  'El contrato no guarda ningún motivo de la cesión: lo que queda es el titular entrante, su documento y la fecha desde la que responde. El acuerdo que la respalda hay que archivarlo por fuera.'

export { businessToday }
