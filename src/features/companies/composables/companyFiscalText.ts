import { parseISODate } from '@/composables/format'
import type {
  CompanyDocumentType,
  CompanyTaxProfileResponse,
  ElectronicDocumentType,
  NumberingResolutionResponse,
  TaxRegime,
} from '../types/company-fiscal.types'

/**
 * Los rótulos y las cuentas de la pestaña <b>Fiscal</b> (§I7), en un solo sitio.
 *
 * <p>Están aquí y no repartidos por los SFC por dos motivos prácticos: son lo que
 * un operador <b>lee por teléfono a un cliente</b> —y a veces a su contador—, así
 * que si cambian tienen que cambiar una vez; y son funciones puras, que es la
 * única forma barata de comprobar con una prueba que la cuenta de una resolución
 * a punto de agotarse sigue saliendo bien, sin montar ningún componente.
 */

/* ------------------------------------------------------------------ *
 * Rótulos de las uniones cerradas del contrato
 * ------------------------------------------------------------------ */

/**
 * El tipo de documento, en palabras. `Record` completo y no un `switch` con
 * `default`: si el backend añade un quinto tipo, el compilador para aquí en vez
 * de que la pantalla enseñe `CEDULA_EXTRANJERIA` en crudo.
 */
export const COMPANY_DOCUMENT_TYPE_LABEL: Record<CompanyDocumentType, string> = {
  NIT: 'NIT',
  CEDULA_CIUDADANIA: 'Cédula de ciudadanía',
  CEDULA_EXTRANJERIA: 'Cédula de extranjería',
  PASAPORTE: 'Pasaporte',
}

export const TAX_REGIME_LABEL: Record<TaxRegime, string> = {
  RESPONSABLE_IVA: 'Responsable de IVA',
  NO_RESPONSABLE_IVA: 'No responsable de IVA',
}

/**
 * El documento que ampara cada resolución. Nombres largos a propósito: «FE_VENTA»
 * y «DOC_EQUIV_POS» son claves de base de datos, y quien atiende la llamada tiene
 * que poder decir en voz alta cuál se está agotando.
 */
export const ELECTRONIC_DOCUMENT_TYPE_LABEL: Record<ElectronicDocumentType, string> = {
  FE_VENTA: 'Factura electrónica de venta',
  DOC_EQUIV_POS: 'Documento equivalente POS',
  NOTA_CREDITO: 'Nota crédito',
  NOTA_DEBITO: 'Nota débito',
}

/**
 * <b>Los tres tipos de documento que identifican a una persona natural.</b>
 *
 * <p>No es una clasificación cosmética: decide qué exige el reporte anual a la
 * administración. Para una persona natural los <b>apellidos y los nombres van por
 * separado</b>, y ese dato no se rellena hacia atrás — el día en que haga falta,
 * partir una razón social ya guardada («JUAN CARLOS PEREZ GOMEZ») en dos campos es
 * adivinar, no migrar. Ver `NATURAL_PERSON_NAME_GAP`.
 *
 * <p>Un `NIT` puede ser de persona natural en Colombia, y este predicado no lo
 * detecta; por eso el texto del hueco dice «el tipo de documento es de persona
 * natural» y no «esta empresa es una persona natural». Se afirma lo que el dato
 * sostiene y nada más.
 */
const NATURAL_PERSON_DOCUMENT_TYPES: readonly CompanyDocumentType[] = [
  'CEDULA_CIUDADANIA',
  'CEDULA_EXTRANJERIA',
  'PASAPORTE',
]

export function isNaturalPerson(type: CompanyDocumentType): boolean {
  return NATURAL_PERSON_DOCUMENT_TYPES.includes(type)
}

/**
 * El documento completo: `NIT 900123456-7`, o `Cédula de ciudadanía 1020304050`.
 *
 * <p>El dígito de verificación va pegado con guion y <b>solo si el backend lo
 * mandó</b> —lo calcula él por módulo 11 y solo aplica al NIT—. Nunca se pinta un
 * guion suelto al final: un documento con un guion y nada detrás se copia mal en
 * un correo y se rechaza en el portal de la DIAN.
 */
export function formatCompanyDocument(profile: CompanyTaxProfileResponse): string {
  const label = COMPANY_DOCUMENT_TYPE_LABEL[profile.companyDocumentType]
  const dv = profile.companyDocumentVerificationDigit
  const numero = dv ? `${profile.companyDocumentId}-${dv}` : profile.companyDocumentId
  return `${label} ${numero}`
}

/** El prefijo y el rango, como se leen en la resolución: `FA 1 – 5000`. */
export function formatResolutionRange(resolution: NumberingResolutionResponse): string {
  const prefijo = resolution.prefix ? `${resolution.prefix} ` : ''
  return `${prefijo}${resolution.rangeFrom} – ${resolution.rangeTo}`
}

/* ------------------------------------------------------------------ *
 * La cuenta de una resolución
 * ------------------------------------------------------------------ */

/** A cuántos días de caducar empieza a avisar la pantalla. */
export const RESOLUTION_EXPIRY_WARNING_DAYS = 30

/** Con qué fracción del rango sin emitir empieza a avisar. */
export const RESOLUTION_RANGE_WARNING_RATIO = 0.1

export interface ResolutionUsage {
  /** Números que ampara la resolución, extremos incluidos. */
  capacity: number
  /** Emitidos: `currentNumber − rangeFrom`. */
  issued: number
  /** Sin emitir: `rangeTo − currentNumber + 1`. */
  remaining: number
  /** Días naturales hasta `validTo`. `null` si la fecha no es un ISO parseable. */
  daysLeft: number | null
  /** `true` cuando `validTo` ya pasó. */
  expired: boolean
}

/** Medianoche local del día de `date`. Evita que la hora del navegador cuente como medio día. */
function atLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * <b>Lo que queda de una resolución</b>: números y días.
 *
 * <p>Las dos cuentas salen del invariante del dominio, no de una suposición:
 * `currentNumber` es el <b>próximo</b> consecutivo a emitir y vive dentro del
 * rango (`NumberingResolution.java:25-28` y su `validate`). Así que lo emitido es
 * `currentNumber − rangeFrom` y lo que <b>queda</b> es `rangeTo − currentNumber +
 * 1`. Los dos valores se acotan al rango porque un dato a la deriva —una
 * resolución cuyo rango se recortó por debajo de lo ya emitido— no puede producir
 * un negativo que se pinte como si sobraran números.
 *
 * <p>`today` se inyecta para que la prueba no dependa del día en que se ejecuta.
 */
export function resolutionUsage(
  resolution: NumberingResolutionResponse,
  today: Date = new Date(),
): ResolutionUsage {
  const capacity = Math.max(resolution.rangeTo - resolution.rangeFrom + 1, 0)
  const issued = clamp(resolution.currentNumber - resolution.rangeFrom, 0, capacity)
  const remaining = clamp(resolution.rangeTo - resolution.currentNumber + 1, 0, capacity)

  const validTo = parseISODate(resolution.validTo)
  const daysLeft =
    validTo === null
      ? null
      : Math.round((validTo.getTime() - atLocalMidnight(today).getTime()) / 86_400_000)

  return {
    capacity,
    issued,
    remaining,
    daysLeft,
    expired: daysLeft !== null && daysLeft < 0,
  }
}

/**
 * <b>Los avisos de una resolución, en orden de daño.</b> Lista vacía = no hay nada
 * que avisar.
 *
 * <p>Son dos relojes independientes y los dos pueden sonar a la vez: una
 * resolución caduca por fecha <b>y</b> se agota por rango. Devolver una sola frase
 * obligaría a elegir cuál se calla, y la que se callara sería la que rompiera la
 * facturación de esa clínica.
 *
 * <p><b>Por qué avisa antes y no el día del fallo.</b> Conseguir una resolución
 * nueva no es instantáneo: se pide a la DIAN. Enterarse el día en que una factura
 * no sale es enterarse tarde, y el coste de avisar de más es un banner que alguien
 * lee dos veces.
 */
export function resolutionWarnings(usage: ResolutionUsage): string[] {
  const avisos: string[] = []

  if (usage.expired) {
    avisos.push('Esta resolución ya caducó: con ella no se puede emitir ni un documento más.')
  } else if (usage.daysLeft !== null && usage.daysLeft <= RESOLUTION_EXPIRY_WARNING_DAYS) {
    avisos.push(
      usage.daysLeft === 0
        ? 'Caduca hoy. Una resolución nueva se pide a la DIAN y no es inmediata.'
        : `Caduca en ${usage.daysLeft} ${usage.daysLeft === 1 ? 'día' : 'días'}. Una resolución nueva se pide a la DIAN y no es inmediata.`,
    )
  }

  if (usage.remaining === 0) {
    avisos.push('El rango está agotado: no queda ningún número por emitir.')
  } else if (
    usage.capacity > 0 &&
    usage.remaining / usage.capacity <= RESOLUTION_RANGE_WARNING_RATIO
  ) {
    avisos.push(
      `Quedan ${usage.remaining} ${usage.remaining === 1 ? 'número' : 'números'} de ${usage.capacity}.`,
    )
  }

  return avisos
}

/**
 * El titular de la sección de numeración: cuántas resoluciones hay y cuántas
 * piden atención. Una frase y no un número suelto, porque «2» junto al rótulo
 * «Resoluciones» no se puede leer por teléfono.
 */
export function resolutionsSummaryText(total: number, conAviso: number): string {
  if (total === 0) return 'Esta empresa no tiene ninguna resolución de numeración registrada.'
  const resoluciones = total === 1 ? '1 resolución' : `${total} resoluciones`
  if (conAviso === 0) return `${resoluciones}, ninguna a punto de caducar ni de agotarse.`
  return conAviso === 1
    ? `${resoluciones}, 1 necesita atención.`
    : `${resoluciones}, ${conAviso} necesitan atención.`
}

/* ------------------------------------------------------------------ *
 * Las tarifas de retención
 * ------------------------------------------------------------------ */

const rateFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 })

/**
 * <b>Una tarifa de retención, con su unidad — y las unidades NO son la misma.</b>
 *
 * <p>Es la trampa de este bloque y no se ve en el contrato: `WithholdingConfigDto`
 * declara los tres campos como el mismo `number`. Lo que hace el backend con cada
 * uno es distinto (`WithholdingCalculator.compute`):
 *
 * <ul>
 *   <li>`reteFuenteRate` → `Money.percentOf(base, tarifa)` — <b>por ciento</b>.</li>
 *   <li>`reteIvaRate` → `Money.percentOf(iva, tarifa)` — <b>por ciento</b>.</li>
 *   <li>`reteIcaRate` → `Money.perMilOf(base, tarifa)` — <b>por mil</b>, y el
 *       propio código lo anota: «reteICA: tarifa en ‰ (por mil)».</li>
 * </ul>
 *
 * <p>Pintar el ICA con un `%` sería enseñar una tarifa <b>diez veces mayor</b> que
 * la que el sistema aplica, sobre la pantalla en la que un contador la comprueba.
 * Por eso la unidad viaja con el número y nunca se asume.
 *
 * <p>Devuelve `null` cuando no hay tarifa. Una tarifa ausente no es una tarifa del
 * cero por ciento: la pantalla las dice distinto.
 */
export function formatWithholdingRate(
  value: number | null | undefined,
  unit: '%' | '‰',
): string | null {
  if (value == null || Number.isNaN(value)) return null
  return `${rateFormatter.format(value)} ${unit}`
}

/* ------------------------------------------------------------------ *
 * Los huecos honestos: lo que §I7 pide y el contrato de hoy no da
 * ------------------------------------------------------------------ */

/** El rótulo compartido de todos los huecos de esta pantalla. Ver `MISSING_DATA_TITLE`. */
export const FISCAL_MISSING_DATA_TITLE = 'Este dato todavía no existe'

/**
 * <b>El hueco mayor de la pantalla: el perfil fiscal no tiene ni vigencia ni
 * serie, y por eso aquí no se edita.</b>
 *
 * <p>La regla del negocio es que un perfil fiscal <b>no se corrige: se cierra el
 * vigente y se abre otro</b>. El motivo es que una factura emitida hace un año
 * tiene que seguir diciendo a quién se le emitió; si cambiar la razón social
 * reescribe la fila, esa factura pasa a estar a nombre de alguien que en su día
 * no existía.
 *
 * <p>Lo que el contrato de hoy ofrece es lo contrario, y está comprobado sobre
 * `api/openapi.json` y sobre el propio backend:
 *
 * <ul>
 *   <li>`PUT /company-tax-profile` <b>reescribe la fila en sitio</b>
 *       (`UpdateCompanyTaxProfileService.execute` carga el perfil por empresa y le
 *       llama `update`). No hay cierre ni copia.</li>
 *   <li>`POST /company-tax-profile` <b>responde 409</b> si la empresa ya tiene
 *       perfil (`CreateCompanyTaxProfileService` comprueba `existsByCompanyId` y
 *       lanza `CompanyTaxProfileAlreadyExistsException`). No es la puerta para
 *       «abrir otro»: es la puerta para el primero.</li>
 *   <li>`CompanyTaxProfileResponse` no trae `validFrom`, ni `validTo`, ni el
 *       perfil al que sucede — así que la serie no se puede pintar aunque
 *       existiera.</li>
 * </ul>
 *
 * <p>Tres salidas y solo una es aceptable: ofrecer «editar» (sería ofrecer
 * reescribir el pasado), pintar una serie de un solo elemento como si fuera la
 * historia (un dato inventado con cara de dato), o <b>decir que no está</b>. Es la
 * tercera.
 */
export const TAX_PROFILE_HISTORY_GAP = {
  what: 'Desde cuándo rige este perfil fiscal, cuál lo precedió y con qué datos se facturó antes.',
  why: 'Una factura de hace un año tiene que seguir diciendo a quién se le emitió. Sin la serie, cambiar la razón social de una clínica reescribe hacia atrás lo que ya se le facturó a otro nombre.',
  trap: 'Esta pantalla NO ofrece «editar» a propósito: el perfil no se corrige, se cierra el vigente y se abre otro. El «PUT /company-tax-profile» del contrato hace justo lo contrario —reescribe la fila— y el «POST» responde 409 cuando ya hay perfil.',
  blockedBy:
    '«CompanyTaxProfileResponse» no expone vigencia («valid_from»/«valid_to») ni sucesión, y no hay ningún endpoint que cierre un perfil y abra el siguiente.',
} as const

/**
 * <b>Apellidos y nombres por separado</b> — solo se pinta cuando el titular es una
 * persona natural, que es cuando el hueco duele.
 */
export const NATURAL_PERSON_NAME_GAP = {
  what: 'Los apellidos y los nombres del titular, en campos separados.',
  why: 'El tipo de documento de este perfil es de persona natural, y la información anual a la administración los exige separados. Ese dato no se rellena hacia atrás: partir después «JUAN CARLOS PEREZ GOMEZ» en dos campos es adivinar cuál es cuál, no migrar.',
  blockedBy:
    'El contrato guarda un solo campo, «legalName», para los dos casos: la razón social de una empresa y el nombre completo de una persona.',
} as const

/**
 * <b>De quién es el correo de facturación.</b>
 *
 * <p>Casi nunca es el del dueño de la clínica: es el de su contadora. La pantalla
 * lo pinta, pero no puede decir a nombre de quién está, y esa es justo la línea
 * que evita la llamada de vuelta.
 */
export const FISCAL_EMAIL_OWNER_GAP = {
  what: 'A nombre de quién está este correo: el dueño de la clínica, su contador o un buzón compartido.',
  why: 'El correo de facturación casi nunca es el del dueño. Sin saber de quién es, un correo que nadie reconoce se marca como no deseado y la factura se da por no entregada; y quien atiende la llamada no sabe a quién avisar de que rebotó.',
  blockedBy:
    '«CompanyTaxProfileResponse» expone «fiscalEmail» y nada más: ni el titular del buzón ni su papel.',
} as const

/**
 * El medio de pago y el estado de su mandato. §I7 lo pide con una razón concreta y
 * la razón se conserva aquí: los tres estados no se pueden aplastar en uno.
 */
export const PAYMENT_MANDATE_GAP = {
  what: 'El medio de pago de la clínica y el estado de su mandato: activo, con la tarjeta vencida o con la domiciliación revocada.',
  why: 'Una tarjeta vencida y una domiciliación revocada se ven exactamente igual que un impago voluntario, y las tres se tratan distinto. Sin este dato, a un cliente que quiere pagar se le persigue como a uno que no.',
  blockedBy:
    'No hay ningún endpoint de medios de pago ni de mandatos en «api/openapi.json»: «/subscription-payments» registra pagos ya ocurridos, no el instrumento con el que se cobran.',
} as const

/**
 * Las tarifas de retención esperadas existen a medias: `/withholding-configs` da
 * tres porcentajes de empresa, y §I7 (con J5) pide la regla por naturaleza del
 * servicio y municipio. Se dice lo que hay y se dice lo que falta.
 */
export const WITHHOLDING_RULES_GAP = {
  what: 'La tarifa esperada por naturaleza del servicio y por municipio, con su base mínima y su vigencia.',
  why: 'Las tres tarifas de arriba son de la empresa entera. La retención real depende del servicio y del municipio, y si una naturaleza de servicio no tiene regla, la retención esperada sale cero y el giro llega corto sin que nada falle.',
  blockedBy:
    'El catálogo «withholding_rate_rules» de la ficha J5 no tiene endpoint: «/withholding-configs» solo expone «reteFuenteRate», «reteIvaRate» y «reteIcaRate».',
} as const

/** Lo que se dice cuando la empresa todavía no tiene perfil fiscal. No es un error. */
export const NO_TAX_PROFILE_TEXT =
  'Esta empresa todavía no tiene perfil fiscal. No es un fallo de carga: el servidor respondió que no hay ninguno. Sin perfil no puede emitir factura electrónica.'

/** Y cuando no hay ninguna resolución. Tampoco es un error. */
export const NO_RESOLUTIONS_TEXT =
  'Esta empresa no tiene ninguna resolución de numeración registrada. Sin resolución vigente no puede emitir el documento correspondiente.'

/** Y cuando no hay configuración de retenciones. */
export const NO_WITHHOLDING_TEXT =
  'Esta empresa no tiene configuradas tarifas de retención. No es lo mismo que retener al 0 %: es que nadie ha declarado ninguna.'
