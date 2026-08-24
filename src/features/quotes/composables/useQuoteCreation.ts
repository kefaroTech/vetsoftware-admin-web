import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { quotesApi } from '../api/quotes.api'
import { useQuotesStore } from '../stores/quotes.store'
import type { CreateQuoteRequest, QuoteResponse } from '../types/quotes.types'

/**
 * El alta de un borrador — la única parte de cotizaciones que **sí** es un formulario.
 *
 * <p><b>`clientRequestId` se genera UNA vez al abrir el formulario</b>, no en cada envío. Es lo
 * que hace que un doble clic en «Crear borrador», o un reintento tras un error de red que sí llegó
 * al servidor, no produzcan dos cotizaciones. Vive en un `ref` por instancia dentro de la función:
 * al desmontar la vista y volver a entrar se genera otra, que es justo lo que se quiere — ese ya
 * es otro documento.
 */
export function useQuoteCreation() {
  const store = useQuotesStore()
  const { savingQuote } = storeToRefs(store)
  const { errorFrom, success } = useToast()

  const clientRequestId = ref(crypto.randomUUID())

  /**
   * Crea el borrador y devuelve el documento, o `null` si el servidor lo rechazó.
   *
   * <p>El aviso de error sale de `errorFrom`, que extrae el mensaje del `ProblemDetail` y el
   * `X-Trace-Id`: escribir el texto a mano en el `catch` tiraría la traza y soporte no podría
   * encontrar la petición.
   */
  async function createQuote(
    payload: Omit<CreateQuoteRequest, 'clientRequestId'>,
  ): Promise<QuoteResponse | null> {
    store.setSavingQuote(true)
    try {
      const created = await quotesApi.create({
        ...payload,
        clientRequestId: clientRequestId.value,
      })
      store.setCurrentQuote(created)
      success(
        'Borrador creado',
        `${created.quoteNumber} todavía no se ha enviado a nadie. Revísalo antes de enviarlo.`,
      )
      return created
    } catch (error: unknown) {
      errorFrom('No se pudo crear la cotización', error)
      return null
    } finally {
      store.setSavingQuote(false)
    }
  }

  return { clientRequestId, savingQuote, createQuote }
}
