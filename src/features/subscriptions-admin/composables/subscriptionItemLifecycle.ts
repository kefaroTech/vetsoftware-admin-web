import {
  CAPACITY_UNIT_OPTIONS,
  ITEM_TYPE_OPTIONS,
  TAX_TREATMENT_OPTIONS,
} from '@/features/commercial-catalog/types/commercial-catalog.types'
import { formatDate } from '@/composables/format'
import type {
  SubscriptionItemOrigin,
  SubscriptionItemResponse,
} from '../types/subscription-items.types'

/**
 * <b>El único sitio de este repositorio donde se escribe qué significa que una
 * línea esté vigente.</b>
 *
 * <p>Es la traducción literal de `EffectivePeriod` del backend —el fichero que
 * dice de sí mismo ser «el unico sitio de todo el slice donde se escribe que
 * significa vigente»— y existe por la misma razón que él:
 *
 * <blockquote>cuando este criterio se copia, la copia que se equivoca produce un
 * error <i>invisible</i> —se factura de más o se dejan permisos vivos— hasta que
 * un cliente reclama meses después.</blockquote>
 *
 * <p>La copia equivocada tiene nombre y es la tentadora: <b>«vigente = sin fecha
 * de fin»</b>. Con ese criterio, una línea firmada hoy para empezar el 1 de abril
 * aparece como vigente en marzo, y el operador que mira la pantalla le dice al
 * cliente que ya tiene un módulo que todavía no tiene. Por eso los estados son
 * <b>tres</b> y no dos.
 *
 * <p>Aquí no hay componentes de Vue ni estado: son funciones puras sobre cadenas.
 * Eso es lo que permite que `tests/unit/subscription-items.spec.ts` fije el
 * criterio con pruebas y que el error no pueda volver por la puerta de atrás.
 */

/**
 * Los tres estados de §3.3. Se nombran en inglés como el resto de enums del
 * repositorio; el rótulo que ve el operador está en `LIFECYCLE_LABEL` y es
 * <b>siempre textual</b>: ningún estado de esta consola se comunica solo por
 * color (§5.2).
 */
export type SubscriptionItemLifecycle = 'CURRENT' | 'SCHEDULED' | 'CLOSED'

export const LIFECYCLE_LABEL: Record<SubscriptionItemLifecycle, string> = {
  CURRENT: 'Vigente',
  SCHEDULED: 'Programada',
  CLOSED: 'Cerrada',
}

/**
 * `AppBadge` solo distingue lo vigente. `Programada` y `Cerrada` comparten
 * `neutral` a propósito: son dos formas de «no está activo hoy» y lo que las
 * separa es el rótulo y la frase de apoyo, no el tono. Dos grises distintos que
 * hubiera que aprender serían peor que uno solo con las palabras escritas.
 */
export const LIFECYCLE_VARIANT: Record<SubscriptionItemLifecycle, 'success' | 'neutral'> = {
  CURRENT: 'success',
  SCHEDULED: 'neutral',
  CLOSED: 'neutral',
}

/**
 * Normaliza a `yyyy-MM-dd`. El contrato declara las dos columnas como `date`,
 * pero recortar es barato y protege de que algún día lleguen con hora: comparar
 * `2026-03-03T00:00:00` con `2026-03-03` como cadenas daría «mayor» y
 * clasificaría la línea al revés.
 */
function day(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * <b>La definición.</b> ¿En qué estado estaba esta línea ese día?
 *
 * <pre>
 *   Programada  effectiveFrom &gt; dia
 *   Cerrada     effectiveTo no vacío y effectiveTo &lt;= dia
 *   Vigente     effectiveFrom &lt;= dia y (effectiveTo vacío o effectiveTo &gt; dia)
 * </pre>
 *
 * <p>Es `EffectivePeriod.isCurrentOn` partido en tres ramas, con el intervalo
 * semiabierto `[from, to)` intacto: el día de fin ya no está cubierto. La rama
 * «Vigente» es, carácter a carácter, la misma condición que `findCurrentOn`
 * ejecuta en SQL cuando se pasa `onDate` — y por eso las dos vistas de esta
 * pantalla (con filtro y sin él) nunca se contradicen.
 *
 * <p><b>Por qué se comparan cadenas y no `Date`.</b> Dos ISO `yyyy-MM-dd` ordenan
 * igual como texto que como calendario, y comparar así no puede sufrir el
 * corrimiento de zona horaria que `new Date('2026-03-03')` sí sufre —en Bogotá
 * (UTC−5) esa fecha cae el día 2—. En una pantalla que decide qué tenía
 * contratado alguien un día concreto, un día de desfase es el fallo.
 *
 * <p>El orden de las ramas importa: si los datos fueran contradictorios (una
 * línea que empieza después de terminar, que el constructor de `EffectivePeriod`
 * impide), gana «Programada», que es lo que dice el campo obligatorio.
 */
export function itemLifecycleOn(
  item: Pick<SubscriptionItemResponse, 'effectiveFrom' | 'effectiveTo'>,
  onDate: string,
): SubscriptionItemLifecycle {
  const reference = day(onDate)
  if (day(item.effectiveFrom) > reference) return 'SCHEDULED'
  if (item.effectiveTo && day(item.effectiveTo) <= reference) return 'CLOSED'
  return 'CURRENT'
}

/**
 * La frase de apoyo del estado, la que hace que el badge no dependa del color.
 *
 * <p>Una cerrada dice hasta cuándo estuvo y una programada desde cuándo estará:
 * son las dos preguntas que se hacen por teléfono. La vigente sin fecha de fin no
 * añade nada; la vigente con fecha de fin futura sí, porque es una baja ya
 * programada y quien mire la pantalla tiene que enterarse hoy, no el día que
 * ocurra.
 */
export function lifecycleSupportText(
  item: Pick<SubscriptionItemResponse, 'effectiveFrom' | 'effectiveTo'>,
  onDate: string,
): string {
  const desde = formatDate(item.effectiveFrom)
  switch (itemLifecycleOn(item, onDate)) {
    case 'SCHEDULED':
      return `Empieza el ${desde}.`
    case 'CLOSED':
      return `Estuvo desde el ${desde} hasta el ${formatDate(item.effectiveTo)}.`
    default:
      return item.effectiveTo
        ? `Vigente desde el ${desde}, con baja programada el ${formatDate(item.effectiveTo)}.`
        : `Vigente desde el ${desde}.`
  }
}

/**
 * Sobre qué líneas tiene sentido operar: las que no están cerradas ese día.
 *
 * <p>Cambiar la cantidad de una línea cerrada es reescribir el pasado, y dar de
 * baja lo ya dado de baja no es una operación. Las dos acciones <b>no se pintan</b>
 * en esas filas — no deshabilitadas: ausentes del marcado (§3.2).
 */
export function isOperable(
  item: Pick<SubscriptionItemResponse, 'effectiveFrom' | 'effectiveTo'>,
  onDate: string,
): boolean {
  return itemLifecycleOn(item, onDate) !== 'CLOSED'
}

/** Vocabulario del catálogo, sin cuarta copia: los rótulos son suyos. */
function labelFrom(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
): string {
  if (!value) return '—'
  return options.find((option) => option.value === value)?.label ?? value
}

export function itemTypeLabel(value: string | null | undefined): string {
  return labelFrom(ITEM_TYPE_OPTIONS, value)
}

export function capacityUnitLabel(value: string | null | undefined): string {
  return labelFrom(CAPACITY_UNIT_OPTIONS, value)
}

export function taxTreatmentLabel(value: string | null | undefined): string {
  return labelFrom(TAX_TREATMENT_OPTIONS, value)
}

/**
 * Por qué existe la línea. Es historia y se pinta como tal.
 *
 * <p>`QUANTITY_CHANGE` y `REMOVAL` son la prueba visible de que el modelo no
 * edita: son líneas <i>sucesoras</i>, nacidas de cerrar otra.
 */
export const ORIGIN_LABEL: Record<SubscriptionItemOrigin, string> = {
  INITIAL: 'Contratación inicial',
  ADDON: 'Añadida después',
  QUANTITY_CHANGE: 'Cambio de cantidad',
  REMOVAL: 'Baja',
  MIGRATION: 'Migración',
}

export function originLabel(value: SubscriptionItemOrigin | null | undefined): string {
  return value ? (ORIGIN_LABEL[value] ?? value) : '—'
}

/**
 * El impuesto tal como quedó congelado: «19 % · Gravado», o solo el tratamiento
 * cuando no hay tasa. Mismo criterio que `QuoteLinesTable`, que pinta la copia
 * congelada de una oferta: las dos pantallas responden a la misma pregunta de
 * soporte y tienen que leerse igual.
 */
export function taxLabel(item: Pick<SubscriptionItemResponse, 'taxRate' | 'taxTreatment'>): string {
  const treatment = taxTreatmentLabel(item.taxTreatment)
  return item.taxRate > 0 ? `${item.taxRate} % · ${treatment}` : treatment
}
