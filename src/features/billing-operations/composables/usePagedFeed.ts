import axios from 'axios'
import { computed, onUnmounted, type Ref } from 'vue'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'

/**
 * <b>El motor de un listado paginado servido por el backend</b>, con su petición en
 * vuelo y su aborto.
 *
 * <p>Nació dentro de `useBillingOperations` para las cuatro pestañas de cobranza y
 * se sacó aquí cuando el circuito del dinero añadió ocho listados más —intentos,
 * intentos vencidos, devoluciones, reversiones, reversiones por vencer, saldos,
 * movimientos de saldo y lotes por caducar—. Copiarlo habría dejado nueve copias de
 * la misma lógica de aborto, que es la clase de cuerpo duplicado que el trinquete
 * del repositorio prohíbe desde el primer commit.
 *
 * <p><b>Una petición en vuelo por lista, y se aborta la anterior.</b> Pasar de la
 * página 3 a la 4 y volver a la 3 con la red lenta dejaba que la respuesta más
 * lenta pisara a la más nueva: el operador veía la página que ya había abandonado y
 * creía que el paginador estaba roto.
 *
 * <p><b>El estado no vive aquí.</b> Este composable no declara ni una `ref` de
 * datos: lee y escribe en el store de Pinia que le pasan. Es lo que permite que el
 * listado sobreviva a un cambio de pestaña —que aquí es un cambio de ruta— sin
 * saltarse la regla obligatoria del proyecto. No hay ningún singleton a nivel de
 * módulo.
 *
 * <p><b>El mensaje de error sale del `ProblemDetail`</b> y arrastra el
 * `X-Trace-Id`. `fallback` es solo el suelo para cuando no hay cuerpo; escribir el
 * texto a mano tiraría la traza y soporte se quedaría sin forma de correlacionar el
 * fallo con el backend.
 */
export interface PagedFeedOptions<T> {
  /** La página guardada en el store. Se lee de aquí, nunca de una copia local. */
  page: Ref<PageResponse<T>>
  apply: (result: PageResponse<T>) => void
  setLoading: (value: boolean) => void
  setError: (message: string | null, traceId: string | null) => void
  isLoading: () => boolean
  getError: () => string | null
  getErrorTraceId: () => string | null
  /** La llamada al cliente de API. `zeroBasedPage` es el vocabulario del servidor. */
  load: (zeroBasedPage: number, pageSize: number, signal: AbortSignal) => Promise<PageResponse<T>>
  /** Suelo del mensaje cuando la respuesta no trae `ProblemDetail`. */
  fallback?: string
}

export function usePagedFeed<T>(options: PagedFeedOptions<T>) {
  let inflight: AbortController | null = null

  async function fetchPage(oneBasedPage: number) {
    inflight?.abort()
    const controller = new AbortController()
    inflight = controller
    options.setLoading(true)
    options.setError(null, null)

    try {
      const result = await options.load(
        Math.max(oneBasedPage - 1, 0),
        options.page.value.pageSize,
        controller.signal,
      )
      if (!controller.signal.aborted) options.apply(result)
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      options.setError(
        getProblemDetailMessage(error, options.fallback ?? 'No se pudo cargar el listado'),
        getTraceId(error) ?? null,
      )
    } finally {
      if (!controller.signal.aborted) options.setLoading(false)
    }
  }

  onUnmounted(() => inflight?.abort())

  return {
    items: computed(() => options.page.value.content),
    /** 1-based: es lo que ve el usuario y lo que consume `AppPagination`. */
    page: computed(() => options.page.value.page + 1),
    pageSize: computed(() => options.page.value.pageSize),
    total: computed(() => options.page.value.totalElements),
    pageCount: computed(() => Math.max(options.page.value.totalPages, 1)),
    loading: computed(() => options.isLoading()),
    error: computed(() => options.getError()),
    errorTraceId: computed(() => options.getErrorTraceId()),
    reload: () => fetchPage(1),
    goTo: (oneBasedPage: number) => fetchPage(oneBasedPage),
  }
}
