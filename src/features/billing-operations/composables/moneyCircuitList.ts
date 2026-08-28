import { storeToRefs } from 'pinia'
import type { Ref } from 'vue'
import type { PageResponse } from '@/types/pagination'
import { useMoneyCircuitStore, type MoneyCircuitList } from '../stores/money-circuit.store'
import { usePagedFeed } from './usePagedFeed'

/**
 * El <b>adaptador</b> entre el motor de listados (`usePagedFeed`) y el store del
 * circuito del dinero: traduce la clave de la lista a los accesos que el motor
 * necesita.
 *
 * <p>Es gemelo de `useBillingList` en `useBillingOperations.ts` — mismo papel,
 * distinto store— y las dos versiones son a propósito cortas: toda la lógica
 * —aborto, página, mensaje de error con su traza— vive una sola vez, en el motor.
 */
export function useMoneyList<T>(
  list: MoneyCircuitList,
  page: Ref<PageResponse<T>>,
  apply: (result: PageResponse<T>) => void,
  load: (zeroBasedPage: number, pageSize: number, signal: AbortSignal) => Promise<PageResponse<T>>,
  fallback?: string,
) {
  const store = useMoneyCircuitStore()
  const { loading, errors, errorTraceIds } = storeToRefs(store)

  return usePagedFeed<T>({
    page,
    apply,
    setLoading: (value) => store.setLoading(list, value),
    setError: (message, traceId) => store.setError(list, message, traceId),
    isLoading: () => loading.value[list],
    getError: () => errors.value[list],
    getErrorTraceId: () => errorTraceIds.value[list],
    load,
    fallback,
  })
}

/**
 * El corte por fecha de las tres <b>listas de trabajo</b>, expresado como «de aquí a
 * N días».
 *
 * <p>Se calcula en el cliente porque el servidor pide una fecha absoluta, no una
 * ventana. Lo importante es que la ventana sea <b>visible</b> en la pantalla —«los
 * que vencen en los próximos 30 días»— y no un número escondido: un corte que nadie
 * ve es un corte que nadie puede discutir, y estas tres listas existen justo para
 * que alguien discuta lo que hay dentro.
 */
export function horizonDate(days: number, from: Date = new Date()): string {
  const target = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`
}

/** El mismo corte, como instante ISO, para los endpoints que piden `date-time`. */
export function horizonInstant(days: number, from: Date = new Date()): string {
  const target = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)
  return target.toISOString()
}
