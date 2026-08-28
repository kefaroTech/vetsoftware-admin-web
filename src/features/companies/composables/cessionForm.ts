import type {
  BillingPersonKind,
  BillingTaxIdKind,
  BillingTaxRegime,
  CompanyBillingProfileResponse,
  SucceedCompanyBillingProfileRequest,
} from '../types/company-cession.types'

/**
 * <b>El formulario de la cesión, en funciones puras</b> (§I11).
 *
 * <p>Vive aparte de `SucceedContractModal.vue` por los dos motivos de siempre en
 * este repositorio, y aquí los dos aprietan. El práctico: el trinquete fija un
 * techo de 500 líneas por SFC y ese modal pide catorce campos, así que con los
 * validadores dentro se pasaba. El de fondo, que es el que importa: <b>lo que se
 * puede probar sin montar un componente se prueba sin montar un componente</b>.
 * Las reglas de esta pantalla —cuándo una fecha de efecto es imposible, qué
 * campos de nombre viajan según el tipo de persona— son reglas de negocio con
 * consecuencias en una factura, y merecen una prueba unitaria directa y no una
 * que tenga que renderizar un modal para llegar a ellas.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** El modelo del formulario. Todo cadena salvo la ciudad, que es el `id` del select. */
export interface CessionForm {
  personKind: BillingPersonKind
  taxIdKind: BillingTaxIdKind
  taxId: string
  verificationDigit: string
  legalName: string
  firstName: string
  middleName: string
  lastName: string
  secondLastName: string
  address: string
  cityId: number
  billingEmail: string
  taxRegime: BillingTaxRegime
  withholdingAgent: boolean
  effectiveFrom: string
}

/** El formulario en blanco. Cada apertura del modal parte de aquí. */
export function emptyCessionForm(): CessionForm {
  return {
    personKind: 'LEGAL',
    taxIdKind: 'NIT',
    taxId: '',
    verificationDigit: '',
    legalName: '',
    firstName: '',
    middleName: '',
    lastName: '',
    secondLastName: '',
    address: '',
    cityId: 0,
    billingEmail: '',
    taxRegime: 'COMMON',
    withholdingAgent: false,
    effectiveFrom: '',
  }
}

/** Documento alfanumérico de 5 a 20: el validador común del repositorio. */
export function validateTaxId(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'El documento del nuevo titular es obligatorio.'
  if (!/^[A-Za-z0-9-]{5,20}$/.test(trimmed))
    return 'El documento tiene entre 5 y 20 caracteres, sin espacios.'
  return ''
}

/**
 * <b>La fecha desde la que responde el nuevo titular.</b>
 *
 * <p>La regla que no es obvia: tiene que ser <b>posterior</b> al `validFrom` del
 * titular actual. Si fuera igual o anterior, habría dos titulares respondiendo el
 * mismo día y la pregunta «¿a quién se le factura?» dejaría de tener una única
 * respuesta — que es justo lo que la serie de titulares existe para garantizar.
 */
export function validateEffectiveFrom(
  value: string,
  currentHolder: CompanyBillingProfileResponse | null,
): string {
  if (!value) return 'La fecha desde la que responde el nuevo titular es obligatoria.'
  if (!ISO_DATE.test(value)) return 'La fecha no es válida. Usa el calendario del campo.'
  if (currentHolder && value <= currentHolder.validFrom)
    return `El titular actual entró el ${currentHolder.validFrom}: la cesión tiene que empezar después, o quedarían dos titulares el mismo día.`
  return ''
}

export type CessionField =
  | 'taxId'
  | 'legalName'
  | 'firstName'
  | 'lastName'
  | 'address'
  | 'cityId'
  | 'billingEmail'
  | 'effectiveFrom'

/** El orden del resumen de errores: el mismo en el que están los campos. */
export const CESSION_FIELD_ORDER: CessionField[] = [
  'effectiveFrom',
  'taxId',
  'legalName',
  'firstName',
  'lastName',
  'address',
  'cityId',
  'billingEmail',
]

/** Todos los errores del formulario. Cadena vacía = ese campo está bien. */
export function cessionErrors(
  form: CessionForm,
  currentHolder: CompanyBillingProfileResponse | null,
): Record<CessionField, string> {
  const isLegal = form.personKind === 'LEGAL'
  return {
    taxId: validateTaxId(form.taxId),
    legalName:
      isLegal && form.legalName.trim().length < 2
        ? 'La razón social es obligatoria y tiene al menos 2 caracteres.'
        : '',
    firstName:
      !isLegal && form.firstName.trim().length < 2
        ? 'El nombre es obligatorio y tiene al menos 2 caracteres.'
        : '',
    lastName:
      !isLegal && form.lastName.trim().length < 2
        ? 'El apellido es obligatorio y tiene al menos 2 caracteres.'
        : '',
    address: form.address.trim() === '' ? 'La dirección de facturación es obligatoria.' : '',
    cityId: form.cityId > 0 ? '' : 'Selecciona la ciudad.',
    billingEmail: !form.billingEmail.trim()
      ? 'El correo de facturación es obligatorio.'
      : !EMAIL.test(form.billingEmail.trim())
        ? 'Escribe un correo válido.'
        : '',
    effectiveFrom: validateEffectiveFrom(form.effectiveFrom, currentHolder),
  }
}

/**
 * Si el campo está pintado ahora mismo. El tipo de persona apaga la mitad de los
 * campos de nombre, y un error de razón social no puede quedar acusado después de
 * cambiar a persona natural — el campo ya no existe y el resumen enlazaría a la
 * nada.
 */
export function isCessionFieldShown(field: CessionField, personKind: BillingPersonKind): boolean {
  if (field === 'legalName') return personKind === 'LEGAL'
  if (field === 'firstName' || field === 'lastName') return personKind === 'NATURAL'
  return true
}

/** Una cadena en blanco no viaja: el contrato la declara opcional, y vacía no es ausente. */
function optional(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * El cuerpo que sale hacia el servidor.
 *
 * <p><b>Solo viajan los campos de nombre que el tipo de persona usa.</b> Mandar
 * los cuatro de persona natural vacíos en una cesión a una empresa deja cadenas
 * vacías donde el contrato espera ausencia, y eso acaba impreso en una factura
 * como un nombre en blanco detrás de la razón social.
 */
export function toSuccessionRequest(form: CessionForm): SucceedCompanyBillingProfileRequest {
  const isLegal = form.personKind === 'LEGAL'
  return {
    personKind: form.personKind,
    taxIdKind: form.taxIdKind,
    taxId: form.taxId.trim(),
    ...(optional(form.verificationDigit) !== undefined
      ? { verificationDigit: form.verificationDigit.trim() }
      : {}),
    ...(isLegal
      ? { legalName: form.legalName.trim() }
      : {
          firstName: form.firstName.trim(),
          ...(optional(form.middleName) !== undefined
            ? { middleName: form.middleName.trim() }
            : {}),
          lastName: form.lastName.trim(),
          ...(optional(form.secondLastName) !== undefined
            ? { secondLastName: form.secondLastName.trim() }
            : {}),
        }),
    address: form.address.trim(),
    cityId: form.cityId,
    billingEmail: form.billingEmail.trim(),
    taxRegime: form.taxRegime,
    withholdingAgent: form.withholdingAgent,
    effectiveFrom: form.effectiveFrom,
  }
}

/**
 * El aviso de cesión retroactiva. Vacío cuando la fecha es de hoy en adelante.
 *
 * <p>Ceder con efecto en el pasado no está prohibido —un acuerdo puede firmarse
 * tarde— pero mueve de responsable facturas que ya se emitieron a nombre del
 * anterior, y eso no se deshace: la corrección sería otra cesión más.
 */
export function cessionBackdateWarning(effectiveFrom: string, today: string): string {
  if (!ISO_DATE.test(effectiveFrom) || effectiveFrom >= today) return ''
  return `La cesión empieza en el pasado. Todo lo facturado desde el ${effectiveFrom} pasa a responder el nuevo titular, incluidas las facturas que ya se emitieron a nombre del anterior.`
}
