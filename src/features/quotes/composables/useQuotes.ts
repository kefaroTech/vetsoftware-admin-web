import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { quotesApi } from '../api/quotes.api'
import { useQuotesStore } from '../stores/quotes.store'

/**
 * El listado del embudo — `GET /quotes/platform`, paginado por el servidor.
 *
 * <p>Fachada estable sobre el store (patrón `useSpecies`/`useBreeds`): la vista no conoce ni el
 * store ni el cliente de API. El `AbortController` es por instancia del composable, dentro de la
 * función — no es un singleton de módulo.
 */
export function useQuotes() {
  const store = useQuotesStore()
  const { quotesPage, loadingQuotes, quotesError, quotesErrorTraceId } = storeToRefs(store)
  const { errorFrom } = useToast()

  const quotes = computed(() => quotesPage.value.content)
  const page = computed(() => quotesPage.value.page + 1)
  const pageSize = computed(() => quotesPage.value.pageSize)
  const total = computed(() => quotesPage.value.totalElements)
  const pageCount = computed(() => Math.max(quotesPage.value.totalPages, 1))

  let request: AbortController | null = null

  async function loadQuotes(oneBasedPage = page.value) {
    request?.abort()
    const controller = new AbortController()
    request = controller
    store.setLoadingQuotes(true)
    store.setQuotesError(null)

    try {
      const result = await quotesApi.listAll(
        Math.max(oneBasedPage - 1, 0),
        pageSize.value,
        controller.signal,
      )
      if (!controller.signal.aborted) store.setQuotesPage(result)
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      store.setQuotesError(
        getProblemDetailMessage(error, 'No se pudieron cargar las cotizaciones'),
        getTraceId(error) ?? null,
      )
      errorFrom('Error al cargar las cotizaciones', error)
    } finally {
      if (request === controller) {
        store.setLoadingQuotes(false)
        request = null
      }
    }
  }

  onUnmounted(() => request?.abort())

  return {
    quotes,
    page,
    pageSize,
    total,
    pageCount,
    loadingQuotes,
    quotesError,
    quotesErrorTraceId,
    loadQuotes,
  }
}
