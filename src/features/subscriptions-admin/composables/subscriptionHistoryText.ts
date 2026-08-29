import { formatAmount, formatDate, parseISODate } from '@/composables/format'
import type {
  SubscriptionAmendmentResponse,
  SubscriptionAmendmentType,
  SubscriptionStatusChangeResponse,
} from '../types/subscription-history.types'

/**
 * <b>El vocabulario y la aritmética de la película del contrato</b> (§3.3, tarea
 * W2-C). Módulo puro: funciones y datos, sin estado y sin Vue, para que la prueba
 * unitaria pueda barrerlo entero — que es como la política del §3.4 deja de ser
 * un párrafo de un documento y pasa a romper el build.
 *
 * <p>Todo lo que esta pantalla pinta es un documento inmutable, así que el texto
 * tiene una obligación extra: <b>no puede sugerir una operación que no existe</b>.
 * Aquí no hay «Editar», no hay «Anular» y no hay «Deshacer», porque un otrosí no
 * se corrige — se emite otro — y una fila de bitácora solo se inserta.
 */

/**
 * Los rótulos de los ocho tipos de otrosí.
 *
 * <p>⚠️ <b>`SUSPEND` se rotula «Suspensión de facturación», nunca «Suspender
 * cuenta»</b> (§3.4.1, literal). Es un tipo de otrosí del contrato que para de
 * facturar; no corta el acceso de nadie, porque no existe ni existirá un estado
 * de corte total de acceso. En una bitácora es donde más fácil se cuela esa
 * palabra, y por eso `tests/unit/subscription-history.spec.ts` barre este mapa y
 * el de abajo contra la lista de palabras prohibidas.
 */
export const AMENDMENT_TYPE_LABEL: Record<SubscriptionAmendmentType, string> = {
  ADD_ITEM: 'Alta de artículo',
  REMOVE_ITEM: 'Baja de artículo',
  CHANGE_QUANTITY: 'Cambio de cantidad',
  CHANGE_CYCLE: 'Cambio de ciclo de facturación',
  SUSPEND: 'Suspensión de facturación',
  REACTIVATE: 'Reanudación de la facturación',
  CANCEL: 'Baja del contrato',
  PRICE_LIST_MIGRATION: 'Cambio de tarifa',
}

/**
 * Qué le hizo cada tipo de otrosí al expediente, en una frase.
 *
 * <p>El rótulo dice el nombre de la operación; esto dice qué quedó escrito, que
 * es lo que necesita quien audita seis meses después. Las tres que tocan líneas
 * repiten la misma promesa —<i>no se borra nada</i>— porque es la propiedad del
 * modelo que hace que este expediente signifique algo.
 */
export const AMENDMENT_TYPE_SUMMARY: Record<SubscriptionAmendmentType, string> = {
  ADD_ITEM: 'Abrió una línea nueva en el contrato. Las anteriores siguen donde estaban.',
  REMOVE_ITEM:
    'Le puso fecha de fin a una línea. No se borró nada: la línea sigue en el expediente, cerrada.',
  CHANGE_QUANTITY:
    'Cerró la línea anterior y abrió otra con la cantidad nueva. Las dos quedan en el expediente.',
  CHANGE_CYCLE: 'Cambió cada cuánto se factura el contrato.',
  SUSPEND:
    'Dejó de facturar el contrato. La empresa conserva la consulta y la impresión de toda su información.',
  REACTIVATE: 'Volvió a facturar el contrato con normalidad.',
  CANCEL:
    'Registró la baja. El contrato siguió vigente hasta su fecha efectiva, que es el periodo ya pagado.',
  PRICE_LIST_MIGRATION: 'Pasó el contrato a otra tarifa.',
}

/**
 * Quién pidió el cambio, con palabras y no con un icono ambiguo.
 *
 * <p><b>Las dos firmas son distintas a propósito</b> y el modelo las separa
 * porque la responsabilidad es distinta: un empleado de la clínica pidiendo algo
 * sobre su propio contrato no es lo mismo que alguien de la plataforma actuando
 * sobre el contrato de un tercero. Quien audita necesita saber cuál de las dos
 * fue antes que ninguna otra cosa de la ficha.
 *
 * <p>Los cuatro casos, incluidos los dos que «no deberían pasar»:
 *
 * <ul>
 *   <li><b>employee</b> — lo pidió la clínica.</li>
 *   <li><b>system-user</b> — lo hizo la plataforma.</li>
 *   <li><b>none</b> — no hay firma. Pasa con los otrosíes que emite un proceso
 *       automático del ciclo de vida, donde no hay principal humano. Se dice; no
 *       se rellena con «Sistema» inventado, que sería afirmar algo que el dato no
 *       dice.</li>
 *   <li><b>ambiguous</b> — vienen las dos. El modelo lo excluye, así que si
 *       ocurre es un defecto de datos y esconderlo eligiendo una convierte una
 *       fila corrupta en una fila creíble, que en auditoría es el peor
 *       resultado posible.</li>
 * </ul>
 */
export interface AmendmentSignature {
  kind: 'employee' | 'system-user' | 'none' | 'ambiguous'
  /** La frase corta, la que se lee primero. */
  text: string
  /** El identificador concreto, para poder rastrearlo. */
  detail: string
  /** Solo `ambiguous`: la ficha lo marca porque es un dato roto, no un caso de negocio. */
  broken: boolean
}

export function amendmentSignature(amendment: SubscriptionAmendmentResponse): AmendmentSignature {
  const employee = amendment.requestedByEmployeeId
  const systemUser = amendment.requestedBySystemUserId

  if (employee != null && systemUser != null) {
    return {
      kind: 'ambiguous',
      text: 'Firma ambigua',
      detail: `Figuran a la vez un empleado de la clínica (#${employee}) y un usuario de plataforma (#${systemUser}). El modelo admite uno de los dos, nunca los dos: es un dato que hay que revisar.`,
      broken: true,
    }
  }
  if (employee != null) {
    return {
      kind: 'employee',
      text: 'Lo pidió la clínica',
      detail: `Empleado #${employee} de la empresa.`,
      broken: false,
    }
  }
  if (systemUser != null) {
    return {
      kind: 'system-user',
      text: 'Lo hizo la plataforma',
      detail: `Usuario de plataforma #${systemUser}.`,
      broken: false,
    }
  }
  return {
    kind: 'none',
    text: 'Sin firma registrada',
    detail:
      'Ni un empleado de la clínica ni un usuario de plataforma. Suele ser un proceso automático del ciclo de vida del contrato.',
    broken: false,
  }
}

/** Lectura de un importe: la cifra formateada y la frase que dice qué significa. */
export interface AmountReading {
  /** El importe ya formateado, para pintar con `.ds-num`. Signo incluido cuando lo tiene. */
  amount: string
  /** La frase que lo explica. Es la que se lee por teléfono a un cliente que reclama. */
  sentence: string
}

/**
 * <b>`monthlyDeltaAmount` — el número que le importa al cliente.</b> Cuánto sube
 * o baja su factura recurrente a partir de ahora, no cuánto se le cobró hoy.
 *
 * <p>Se pinta con signo explícito porque el signo <i>es</i> la información: un
 * otrosí de baja lleva un delta negativo y leerlo como «34.000» a secas invierte
 * el sentido de la frase. El cero es un caso real y con nombre —un cambio de
 * fecha de vigencia no mueve la factura— y no se pinta como hueco.
 */
export function monthlyDeltaReading(value: number | null | undefined): AmountReading {
  if (value == null || Number.isNaN(value)) {
    return {
      amount: '—',
      sentence: 'El otrosí no dice cómo cambió la factura recurrente.',
    }
  }
  if (value > 0) {
    return {
      amount: `+${formatAmount(value)}`,
      sentence: `La factura recurrente sube ${formatAmount(value)} al mes a partir de ahora.`,
    }
  }
  if (value < 0) {
    return {
      amount: `−${formatAmount(Math.abs(value))}`,
      sentence: `La factura recurrente baja ${formatAmount(Math.abs(value))} al mes a partir de ahora.`,
    }
  }
  return {
    amount: formatAmount(0),
    sentence: 'La factura recurrente no cambia.',
  }
}

/**
 * <b>`prorationAmount` — lo que se cobró o acreditó una sola vez.</b> Es el
 * proporcional de los días que quedaban del periodo en curso, y <b>no</b> es lo
 * mismo que el cambio en la factura mensual. Colapsar los dos en un «importe»
 * hace inexplicable la factura del mes siguiente.
 *
 * <p>⚠️ La fracción que el modelo exige junto a todo prorrateo —«18 de 31
 * días»— <b>no está en este DTO</b>: `prorationDays` y `periodDays` viven en el
 * cargo (`subscription_charges`), no en el otrosí. Por eso la ficha enlaza al
 * dinero en vez de inventarse la fracción, y por eso esa carencia queda anotada
 * como issue en vez de disimularse.
 */
export function prorationReading(value: number | null | undefined): AmountReading {
  if (value == null || Number.isNaN(value)) {
    return {
      amount: '—',
      sentence: 'El otrosí no dice qué se cobró por el periodo en curso.',
    }
  }
  if (value > 0) {
    return {
      amount: formatAmount(value),
      sentence: `Se cobró ${formatAmount(value)} una sola vez, por los días que quedaban del periodo.`,
    }
  }
  if (value < 0) {
    return {
      amount: `−${formatAmount(Math.abs(value))}`,
      sentence: `Se acreditó ${formatAmount(Math.abs(value))} una sola vez, por los días del periodo que ya no se usaron.`,
    }
  }
  return {
    amount: formatAmount(0),
    sentence: 'No hubo cobro puntual por el periodo en curso.',
  }
}

/**
 * Fecha y hora `dd/mm/aaaa · hh:mm` para la línea de tiempo.
 *
 * <p>La hora no es adorno: el propio backend ordena la bitácora por
 * `occurredAt` con microsegundos «precisamente porque dos transiciones del mismo
 * segundo tienen que ordenarse». Una película con dos fotogramas fechados el
 * mismo día y sin hora no se puede leer.
 *
 * <p>La parte de fecha sale de `formatDate` —el formateador canónico de §4— y la
 * hora se recorta de la propia cadena ISO con una expresión regular en vez de
 * pasar por `Date`: el backend serializa `LocalDateTime`, sin zona, y
 * reinterpretarlo como instante es el corrimiento de un día que
 * `subscriptionDateTime.ts` documenta para el camino de ida. Sin hora en la
 * cadena, devuelve solo la fecha en vez de inventar «00:00».
 */
export function formatDateTime(iso: string | null | undefined, empty = '—'): string {
  if (!iso) return empty
  const date = formatDate(iso, empty)
  const time = /\d{4}-\d{2}-\d{2}[T ](\d{2}:\d{2})/.exec(iso)
  return time ? `${date} · ${time[1]}` : date
}

/**
 * Una entrada de la película, ya sea un otrosí o un movimiento de la bitácora.
 *
 * <p>`at` es el eje común y merece una decisión explícita, porque los dos
 * endpoints no ordenan por lo mismo: <b>es cuándo quedó registrado en el
 * expediente</b> —`createdDate` del otrosí, `occurredAt` del cambio de estado—,
 * no cuándo surte efecto. Un otrosí puede emitirse hoy con efecto el día 1 del
 * mes que viene; ordenar por la fecha de efecto pondría un documento que todavía
 * no ha pasado por delante de hechos que ya pasaron, y esta pantalla cuenta lo
 * que ocurrió. La fecha de efecto no se pierde: se pinta en la ficha, y cuando es
 * futura se dice.
 */
export type SubscriptionHistoryEntry =
  | {
      kind: 'amendment'
      key: string
      at: string
      amendment: SubscriptionAmendmentResponse
    }
  | {
      kind: 'status'
      key: string
      at: string
      change: SubscriptionStatusChangeResponse
    }

function timeValue(iso: string | null | undefined): number {
  if (!iso) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

/**
 * Fusiona los dos expedientes en una sola línea de tiempo, del más reciente al
 * más antiguo.
 *
 * <p><b>Esto solo es honesto sobre el conjunto completo</b>, y por eso el
 * composable carga todas las páginas de los dos endpoints antes de llamar aquí.
 * Ordenar en cliente una página de veinte filas de trescientas es mentir sobre
 * cuál es la primera — el mismo criterio que §3.5 fija para la lista de
 * documentos esperando factura. Aquí además los dos endpoints ordenan en
 * sentidos opuestos (`effectiveDate ASC` los otrosíes, `occurredAt DESC` la
 * bitácora), así que fusionar las dos primeras páginas pegaría el principio de
 * una película con el final de la otra.
 *
 * <p>Empate a milisegundo: primero el otrosí y luego el cambio de estado, y
 * dentro de cada tipo el id más alto arriba. Un cambio de estado que acompaña a
 * un otrosí es su consecuencia, así que leer antes la causa es lo que hace que la
 * secuencia se entienda. El desempate por id reproduce el que ya usan los dos
 * repositorios del backend.
 */
export function buildHistoryTimeline(
  amendments: SubscriptionAmendmentResponse[],
  changes: SubscriptionStatusChangeResponse[],
): SubscriptionHistoryEntry[] {
  const entries: SubscriptionHistoryEntry[] = [
    ...amendments.map((amendment): SubscriptionHistoryEntry => ({
      kind: 'amendment',
      key: `amendment-${amendment.id}`,
      at: amendment.createdDate,
      amendment,
    })),
    ...changes.map((change): SubscriptionHistoryEntry => ({
      kind: 'status',
      key: `status-${change.id}`,
      at: change.occurredAt,
      change,
    })),
  ]

  return entries.sort((a, b) => {
    const diff = timeValue(b.at) - timeValue(a.at)
    if (diff !== 0) return diff
    if (a.kind !== b.kind) return a.kind === 'amendment' ? -1 : 1
    const aId = a.kind === 'amendment' ? a.amendment.id : a.change.id
    const bId = b.kind === 'amendment' ? b.amendment.id : b.change.id
    return bId - aId
  })
}

/**
 * ¿Este otrosí todavía no ha surtido efecto?
 *
 * <p>Se compara la fecha de efecto contra hoy a medianoche local con
 * `parseISODate`, que es el parser que evita el corrimiento de zona. Un otrosí
 * programado es un hecho registrado cuyo efecto está por llegar, y en una
 * pantalla que responde «qué pasó» hay que distinguirlo de lo que ya pasó.
 */
export function isScheduled(amendment: SubscriptionAmendmentResponse, today = new Date()): boolean {
  const effective = parseISODate(amendment.effectiveDate)
  if (!effective) return false
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return effective.getTime() > midnight.getTime()
}

/**
 * El recuento que se anuncia al lector de pantalla cuando termina la carga
 * (§5.3: es una consulta, así que va en una región `role="status"`, educada).
 */
export function timelineAnnouncement(entries: SubscriptionHistoryEntry[]): string {
  if (entries.length === 0) return 'El contrato no tiene movimientos registrados.'
  const amendments = entries.filter((entry) => entry.kind === 'amendment').length
  const changes = entries.length - amendments
  const otrosies = amendments === 1 ? '1 otrosí' : `${amendments} otrosíes`
  const cambios = changes === 1 ? '1 cambio de estado' : `${changes} cambios de estado`
  return `${otrosies} y ${cambios} en el expediente.`
}
