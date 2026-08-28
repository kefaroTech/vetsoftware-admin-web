import { formatDate } from '@/composables/format'
import type {
  CapacityUnit,
  CompanyCapacityResponse,
  CompanyEntitlementResponse,
  EntitlementAccessLevel,
  EntitlementSource,
} from '../types/entitlements.types'

/**
 * <b>Todo el vocabulario de `/acceso`, en funciones puras y en un solo sitio</b>
 * (§4.4.2, tarea W2-D).
 *
 * <p>Vive aparte del SFC por el mismo motivo que `subscriptionStatusText.ts`: es
 * lo que la prueba unitaria puede barrer. La política de §3.4 —<b>no existe ni
 * existirá un corte total de acceso</b>, y un moroso nunca pierde la consulta de
 * su propia historia clínica— no es una preferencia de estilo, es riesgo legal, y
 * una pantalla de niveles de acceso es donde más fácil se cuela la palabra
 * equivocada. Con los rótulos aquí, `tests/unit/subscription-access.spec.ts` los
 * recorre todos y rompe el build antes de que lleguen a la pantalla de un
 * operador —que es quien se los repetiría al cliente por teléfono—.
 *
 * <p>El propio dominio lo respalda: `AccessLevel.java` declara por escrito que no
 * hay —ni debe añadirse— un valor que signifique un corte total de acceso, y que
 * el máximo grado de restricción es `READ_ONLY` incluso para un moroso.
 */

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

/**
 * La frase que encabeza la sub-vista: <b>esto es una tabla derivada</b>.
 *
 * <p>Es lo primero que hay que entender para no leer mal la pantalla. Ninguna
 * fila contiene una decisión: todas son el resultado de aplicar el contrato
 * vigente. Por eso la única acción es recalcular, y por eso la pregunta «¿por qué
 * tiene esto?» se responde en «Lo contratado» y no aquí.
 */
export const DERIVED_NOTE =
  'Esto no se edita: se calcula desde el contrato. Si algo no cuadra, la verdad está en «Lo contratado».'

/**
 * La regla que la interfaz no puede contradecir (§3.4). Se pinta junto a la
 * leyenda de los tres niveles, que es donde alguien podría deducir lo contrario.
 */
export const ACCESS_POLICY_NOTE =
  'Dar de baja un módulo nunca borra ni elimina datos de la veterinaria: solo baja el nivel. Ningún nivel de esta tabla le quita a una empresa la consulta e impresión de su propia historia clínica.'

/**
 * Por qué un submódulo aparece como «No disponible» en vez de en solo consulta.
 *
 * <p>Lo decide el servidor, no esta pantalla:
 * `AccessLevel.hiddenIfNotReadOnlyCapable(boolean)` degrada a `NONE` el submódulo
 * que no sabe funcionar en solo consulta, porque «enseñar pantallas a medias, con
 * los botones vivos y el guardado rechazado, es peor que no enseñarlas». Se
 * explica aquí para que un `NONE` no se lea como un permiso perdido.
 */
export const HIDDEN_INSTEAD_OF_BROKEN_NOTE =
  'Un submódulo que no sabe funcionar en solo consulta aparece como «No disponible» en vez de abrir pantallas a medias. Lo decide el servidor al calcular, no esta pantalla.'

/**
 * La consecuencia escrita del recálculo, la que se lee antes de confirmar.
 *
 * <p>Recalcular es una escritura, pero <b>no es una edición: es una
 * reparación</b>. El texto tiene que decir las dos cosas que un operador
 * necesita saber para pulsar sin miedo — que no toca el contrato ni los datos de
 * la clínica, y que lo concedido a mano sobrevive—.
 */
export const RECALCULATE_CONSEQUENCE =
  'Se vuelve a construir la tabla entera desde los contratos vigentes, que son la verdad. No cambia el contrato ni toca ningún dato de la veterinaria, y las concesiones hechas a mano se conservan.'

/** Rótulo del botón de confirmación: nombra la acción, no dice «Confirmar» (WCAG §3.3.4). */
export const RECALCULATE_CONFIRM_LABEL = 'Recalcular'

/**
 * Los tres niveles, con su rótulo textual obligatorio (§5.2: <b>ningún nivel se
 * comunica solo por color</b>) y con su significado real escrito al lado.
 *
 * <p>El significado importa tanto como el rótulo: «Solo consulta» a secas no dice
 * lo que de verdad conserva la empresa, y es esa frase la que impide que alguien
 * lo cuente por teléfono como si fuera otra cosa.
 */
export const ACCESS_LEVEL_PRESENTATION = {
  FULL: {
    label: 'Uso normal',
    variant: 'success',
    meaning: 'Crea y modifica con normalidad.',
  },
  READ_ONLY: {
    label: 'Solo consulta',
    variant: 'warning',
    meaning: 'Consulta e impresión activas. No puede crear ni modificar.',
  },
  NONE: {
    label: 'No disponible',
    variant: 'neutral',
    meaning: 'El submódulo no aparece en su menú. Sus datos siguen ahí, intactos.',
  },
} as const satisfies Record<
  EntitlementAccessLevel,
  { label: string; variant: BadgeVariant; meaning: string }
>

/**
 * Los cuatro orígenes. <b>`MANUAL_GRANT` es el único que no se deriva del
 * contrato</b>, y por eso es el único con `variant: 'warning'`: el modelo dice
 * que «queda constancia de que fue a mano» y esa constancia tiene que verse sin
 * que nadie tenga que ir a buscarla.
 */
export const SOURCE_PRESENTATION = {
  SUBSCRIPTION: {
    label: 'Contratado',
    variant: 'neutral',
    meaning: 'Hay una línea de contrato vigente detrás.',
  },
  TRIAL: {
    label: 'En prueba',
    variant: 'neutral',
    meaning: 'Caduca solo a la fecha, sin proceso que se pueda olvidar.',
  },
  CORE: {
    label: 'Núcleo',
    variant: 'neutral',
    meaning: 'Viene con el producto. No se contrata ni se da de baja.',
  },
  MANUAL_GRANT: {
    label: 'Concedido a mano',
    variant: 'warning',
    meaning: 'No sale del contrato: alguien se lo concedió. El recálculo lo conserva a propósito.',
  },
} as const satisfies Record<
  EntitlementSource,
  { label: string; variant: BadgeVariant; meaning: string }
>

/** Nombre de la capacidad, para el `<label>` de su `<progress>`. */
export const CAPACITY_UNIT_TITLE = {
  USER: 'Usuarios',
  BRANCH: 'Sedes',
  TERMINAL: 'Terminales de caja',
  STORAGE_GB: 'Almacenamiento',
} as const satisfies Record<CapacityUnit, string>

/** El sustantivo del contador: «7 de 10 usuarios». */
export const CAPACITY_UNIT_NOUN = {
  USER: 'usuarios',
  BRANCH: 'sedes',
  TERMINAL: 'terminales de caja',
  STORAGE_GB: 'GB de almacenamiento',
} as const satisfies Record<CapacityUnit, string>

/**
 * Las dos traducciones de un eje, <b>a prueba de ejes que esta consola no conoce</b>.
 *
 * <p>`dimensionCode` dejó de ser un enum de cuatro valores el día que el backend borró
 * `CapacityUnit.java` y pasó las dimensiones a datos: hoy el servidor puede sembrar
 * `APPOINTMENTS_PER_MONTH` sin desplegar nada, y esta consola tiene que pintarlo igual. Indexar
 * el `Record` cerrado con ese código devolvía `undefined`, y lo que veía el operador era
 * «7 de 10 undefined» — sin error en consola y sin nada roto que mirar.
 *
 * <p>Se cae al propio código en mayúsculas, que es feo a propósito: se lee como «falta traducir
 * este eje» y no como una etiqueta legítima.
 */
export function capacityTitle(dimensionCode: string): string {
  return CAPACITY_UNIT_TITLE[dimensionCode as CapacityUnit] ?? dimensionCode
}

export function capacityNoun(dimensionCode: string): string {
  return CAPACITY_UNIT_NOUN[dimensionCode as CapacityUnit] ?? dimensionCode
}

/**
 * «7 de 10 usuarios», y su caso incómodo: <b>un límite nulo no es un límite de
 * cero</b>.
 *
 * <p>Pintar «7 de 0 usuarios» —o un `<progress>` al 100 % que no significa
 * nada— sería inventar un techo que el contrato no declara. Cuando no hay
 * límite, el texto lo dice y la barra no se pinta.
 */
export function capacityText(capacity: CompanyCapacityResponse): string {
  const noun = capacityNoun(capacity.dimensionCode)
  const used = capacity.usedQuantity ?? 0
  if (capacity.limitQuantity == null) return `${used} ${noun} · sin límite declarado`
  return `${used} de ${capacity.limitQuantity} ${noun}`
}

/**
 * Qué línea del contrato justifica esta fila — <b>el puente de vuelta al
 * dinero</b>.
 *
 * <p>`kind` es lo que decide si la celda es un enlace o una frase, y la
 * diferencia no es cosmética: `CORE` y `MANUAL_GRANT` <b>no tienen</b> línea
 * detrás (`chk_company_entitlements_origin` solo la exige a `SUBSCRIPTION` y
 * `TRIAL`), así que ofrecerles un enlace sería prometer una pantalla que no
 * existe. Un `SUBSCRIPTION` sin contrato es un permiso huérfano —el que el
 * recálculo no sabría revocar— y se dice tal cual en vez de esconderse.
 */
export function entitlementJustification(row: CompanyEntitlementResponse): {
  kind: 'line' | 'contract' | 'none'
  text: string
} {
  if (row.subscriptionItemId != null)
    return { kind: 'line', text: `Línea #${row.subscriptionItemId}` }
  if (row.subscriptionId != null)
    return { kind: 'contract', text: `Contrato #${row.subscriptionId}` }
  if (row.source === 'CORE')
    return { kind: 'none', text: 'Núcleo del producto: no hay línea que lo justifique.' }
  if (row.source === 'MANUAL_GRANT') return { kind: 'none', text: 'No se deriva del contrato.' }
  return { kind: 'none', text: 'Sin línea asociada.' }
}

/**
 * Nombre accesible del enlace de vuelta. Sin él, un lector de pantalla que
 * recorre la lista de enlaces oye «Línea 123» treinta veces sin saber de qué
 * submódulo es cada una (§5, WCAG 2.4.4 *Link Purpose*).
 */
export function justificationLinkLabel(row: CompanyEntitlementResponse): string {
  return `Línea ${row.subscriptionItemId} del contrato ${row.subscriptionId}, que da acceso a ${row.subModule.name}`
}

/**
 * A partir de cuántas horas `recalculatedAt` deja de ser una fecha y pasa a ser
 * un síntoma. Lo fija §4.4.2: «si supera 24 h, badge warning "Recálculo
 * atrasado"».
 */
export const STALE_AFTER_HOURS = 24

/**
 * Parsea el `yyyy-MM-ddTHH:mm:ss` de un `LocalDateTime` de Java <b>como hora
 * local</b>.
 *
 * <p>`parseISODate` de `format.ts` se queda con la parte de fecha y devuelve
 * medianoche, que para una fecha de vencimiento es lo correcto y para medir una
 * antigüedad en horas no sirve: un recálculo de hace veinte minutos se leería
 * como uno de hace medio día. Devuelve `null` si la cadena no es parseable, que
 * es lo que hace que «no lo sé» no se disfrace de «hace mucho».
 */
export function parseLocalDateTime(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(iso)
  if (!m) return null
  const [, y, mo, d, hh = '00', mi = '00', ss = '00'] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mi), Number(ss))
  if (Number.isNaN(date.getTime())) return null
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null
  return date
}

/** Fecha y hora de un `LocalDateTime`: la fecha en el formato de §4, la hora al lado. */
export function formatDateTime(iso: string | null | undefined): string {
  const date = parseLocalDateTime(iso)
  if (!date) return formatDate(iso)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${formatDate(iso)} · ${hh}:${mm}`
}

/** «menos de una hora», «3 horas», «1 día», «5 días». Concuerda en número. */
function elapsedText(hours: number): string {
  if (hours < 1) return 'menos de una hora'
  if (hours < 24) return hours === 1 ? '1 hora' : `${hours} horas`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 día' : `${days} días`
}

export interface RecalculationHealth {
  /** `unknown` no es `stale`: no saberlo y saber que es viejo son dos hallazgos distintos. */
  state: 'fresh' | 'stale' | 'unknown'
  /** Horas completas transcurridas, o `null` si no hay fecha parseable. */
  hours: number | null
  /** Rótulo del badge, o `null` cuando la fecha está al día y no hay nada que señalar. */
  badgeLabel: string | null
  /** La frase que se lee. Nunca es solo un color y nunca es solo una fecha. */
  note: string
}

/**
 * <b>`recalculatedAt` como indicador de salud, no como adorno.</b>
 *
 * <p>El modelo lo dice con todas las letras: «si esta fecha se queda vieja, hay
 * un proceso caído». Hoy nadie la mira, así que esta pantalla la convierte en
 * una señal con tres estados y con el texto escrito al lado — porque una fecha
 * sola no le dice a nadie que algo va mal, y un badge ámbar sin frase tampoco.
 *
 * <p>`now` entra por parámetro y no se llama a `Date.now()` aquí dentro: es lo
 * que hace la función comprobable sin congelar el reloj del proceso.
 */
export function recalculationHealth(
  iso: string | null | undefined,
  now: Date = new Date(),
): RecalculationHealth {
  const date = parseLocalDateTime(iso)
  if (!date) {
    return {
      state: 'unknown',
      hours: null,
      badgeLabel: 'Sin fecha de recálculo',
      note: 'La tabla no dice cuándo se calculó por última vez. Es el mismo síntoma que una fecha vieja: hay que mirar el proceso que la refresca.',
    }
  }

  const hours = Math.max(Math.floor((now.getTime() - date.getTime()) / 3_600_000), 0)
  if (hours >= STALE_AFTER_HOURS) {
    return {
      state: 'stale',
      hours,
      badgeLabel: 'Recálculo atrasado',
      note: `Lleva ${elapsedText(hours)} sin recalcularse. Si esta fecha se queda vieja, hay un proceso caído: no es un adorno, es el indicador de salud de esta tabla.`,
    }
  }

  return {
    state: 'fresh',
    hours,
    badgeLabel: null,
    note: `Calculado hace ${elapsedText(hours)}.`,
  }
}

/**
 * El resumen del recálculo que se le enseña al operador después. Es la prueba de
 * que hizo algo, y la confirmación por escrito de que lo concedido a mano
 * sobrevivió.
 */
export function recalculationSummary(counts: {
  entitlementCount: number
  manualGrantCount: number
  capacityCount: number
}): string {
  const permisos =
    counts.entitlementCount === 1 ? '1 permiso' : `${counts.entitlementCount} permisos`
  const capacidades =
    counts.capacityCount === 1 ? '1 capacidad' : `${counts.capacityCount} capacidades`
  const manuales =
    counts.manualGrantCount === 1
      ? '1 concedido a mano, conservado'
      : `${counts.manualGrantCount} concedidos a mano, conservados`
  return `${permisos} · ${capacidades} · ${manuales}.`
}
