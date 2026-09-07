import { computed } from 'vue'
import { useQuerySync } from '@/composables/useQuerySync'
import { useServerPaged } from '@/composables/useServerPaged'
import { endOfDayInstant, startOfDayInstant } from './billingFormat'
import { wompiEventsApi } from '../api/wompi-events.api'
import type { WompiWebhookEventResponse } from '../types/wompi-events.types'

/**
 * El filtro de la pantalla de eventos de Wompi va en la URL
 * (`useQuerySync`), así que la búsqueda de una disputa concreta —«los eventos de
 * La referencia 123456»— se puede compartir en un ticket. La paginación es la de
 * `useServerPaged`: es una pantalla propia, no una de las cuatro pestañas de
 * `/cobranza`, así que su estado no necesita sobrevivir a un cambio de ruta y no
 * hace falta Pinia.
 */
export function useWompiEvents() {
  const { state: filters, reset: resetFilters } = useQuerySync({
    reference: '',
    companyId: '',
    from: '',
    to: '',
  })

  /** Dispara la recarga cuando cambia cualquier campo: `useServerPaged` solo mira que cambie el string. */
  const trigger = computed(
    () => `${filters.reference}|${filters.companyId}|${filters.from}|${filters.to}`,
  )

  const feed = useServerPaged<WompiWebhookEventResponse>(
    (page, pageSize, _query, signal) =>
      wompiEventsApi.search(
        {
          reference: filters.reference.trim() || undefined,
          companyId: filters.companyId.trim() ? Number(filters.companyId) : undefined,
          from: filters.from ? startOfDayInstant(filters.from) : undefined,
          to: filters.to ? endOfDayInstant(filters.to) : undefined,
        },
        page,
        pageSize,
        signal,
      ),
    { query: trigger, debounceMs: 300 },
  )

  return { filters, resetFilters, ...feed }
}
