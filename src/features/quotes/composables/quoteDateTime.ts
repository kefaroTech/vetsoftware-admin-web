import { formatDate } from '@/composables/format'

/**
 * Fecha **con hora**, para la prueba de la aceptación.
 *
 * <p>`composables/format.ts` (W1-A) resuelve `dd/mm/aaaa`, que es el vocabulario que fija §4 para
 * las tablas, pero no la hora — y aquí la hora no es adorno: la prueba que se enseña cuando
 * alguien discute que contrató es «quién, **cuándo** y desde qué IP», y «el 14 de marzo» no
 * distingue dos aceptaciones del mismo día ni se contrasta con un registro del servidor.
 *
 * <p>Vive en esta feature y no en el módulo transversal porque `src/composables/format.ts` es de
 * la tarea W1-A y esta no lo toca. Fundirlo allí queda como deuda declarada con issue.
 *
 * <p>Se apoya en `formatDate` para la parte de fecha —que ya es a prueba del corrimiento de zona
 * horaria— y solo añade `HH:mm` leídos como hora **local**, que es la que ve el operador.
 */
export function formatDateTime(iso: string | null | undefined, empty = '—'): string {
  if (!iso) return empty
  const date = formatDate(iso, empty)
  const time = /\d{2}:\d{2}/.exec(iso.slice(10))
  if (!time) return date
  return `${date} a las ${time[0]}`
}
