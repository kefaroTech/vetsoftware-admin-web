import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emptyPage, type PageResponse } from '@/types/pagination'
import type { QuoteResponse, QuoteSummaryResponse } from '../types/quotes.types'

/**
 * Estado compartido de cotizaciones: la página del embudo y el documento abierto.
 *
 * <p>Setup store con estado + setters, según la regla obligatoria de Pinia del repositorio. **No
 * hay ningún `ref()`/`reactive()` a nivel de módulo** en esta feature: el estado compartido vive
 * aquí y lo por-instancia (los `AbortController` de cada composable, el estado de un formulario)
 * vive dentro de la función del composable o del componente.
 *
 * <p>Guardar el detalle en el store y no en la vista es lo que permite que las cuatro acciones
 * —enviar, aceptar, rechazar, eliminar— devuelvan el `QuoteResponse` ya avanzado y la pantalla
 * **cambie de chasis** sin una segunda llamada ni un parpadeo de recarga.
 */
export const useQuotesStore = defineStore('quotes', () => {
  const quotesPage = ref<PageResponse<QuoteSummaryResponse>>(emptyPage<QuoteSummaryResponse>())
  const loadingQuotes = ref(false)
  const quotesError = ref<string | null>(null)
  const quotesErrorTraceId = ref<string | null>(null)

  /** El documento abierto en `/cotizaciones/:id`. `null` mientras carga o si falló. */
  const currentQuote = ref<QuoteResponse | null>(null)
  const loadingQuote = ref(false)
  const quoteError = ref<string | null>(null)
  const quoteErrorTraceId = ref<string | null>(null)
  /** Hay una escritura en vuelo (enviar/aceptar/rechazar/eliminar/crear). */
  const savingQuote = ref(false)

  function setQuotesPage(value: PageResponse<QuoteSummaryResponse>) {
    quotesPage.value = value
  }

  function setLoadingQuotes(value: boolean) {
    loadingQuotes.value = value
  }

  function setQuotesError(message: string | null, traceId: string | null = null) {
    quotesError.value = message
    quotesErrorTraceId.value = traceId
  }

  function setCurrentQuote(value: QuoteResponse | null) {
    currentQuote.value = value
  }

  function setLoadingQuote(value: boolean) {
    loadingQuote.value = value
  }

  function setQuoteError(message: string | null, traceId: string | null = null) {
    quoteError.value = message
    quoteErrorTraceId.value = traceId
  }

  function setSavingQuote(value: boolean) {
    savingQuote.value = value
  }

  /**
   * Refleja en la página ya cargada el estado nuevo de una cotización que se acaba de enviar,
   * aceptar o rechazar, para que volver atrás desde el detalle no enseñe el estado viejo.
   * Sustituye el objeto entero: mutar el existente dejaría la fila desincronizada con los totales.
   */
  function patchQuoteInPage(quote: QuoteResponse) {
    quotesPage.value = {
      ...quotesPage.value,
      content: quotesPage.value.content.map((row) =>
        row.id === quote.id
          ? {
              ...row,
              status: quote.status,
              acceptedAt: quote.acceptedAt,
              totalAmount: quote.totalAmount,
              validUntil: quote.validUntil,
            }
          : row,
      ),
    }
  }

  /** Saca de la página el borrador que se acaba de eliminar, sin recargar del servidor. */
  function removeQuoteFromPage(id: number) {
    const content = quotesPage.value.content.filter((row) => row.id !== id)
    quotesPage.value = {
      ...quotesPage.value,
      content,
      totalElements: Math.max(0, quotesPage.value.totalElements - 1),
    }
  }

  return {
    quotesPage,
    loadingQuotes,
    quotesError,
    quotesErrorTraceId,
    currentQuote,
    loadingQuote,
    quoteError,
    quoteErrorTraceId,
    savingQuote,
    setQuotesPage,
    setLoadingQuotes,
    setQuotesError,
    setCurrentQuote,
    setLoadingQuote,
    setQuoteError,
    setSavingQuote,
    patchQuoteInPage,
    removeQuoteFromPage,
  }
})
