import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { quotesApi } from '../api/quotes.api'
import { useQuotesStore } from '../stores/quotes.store'
import type { QuoteResponse } from '../types/quotes.types'

/** «Spa Ana Pet» si ya es empresa; si no, el nombre del prospecto; si no, el número. */
export function quoteClientName(quote: QuoteResponse): string {
  return quote.company?.name ?? quote.prospectName ?? quote.quoteNumber
}

/**
 * El documento abierto y las cuatro operaciones que el contrato permite sobre él.
 *
 * <p><b>No hay `update`, y eso no es una omisión.</b> Las únicas escrituras son avanzar el estado
 * (`send`, `accept`, `reject`) y eliminar el borrador. Cada una devuelve el `QuoteResponse` ya
 * avanzado, y al guardarlo en el store la pantalla **cambia de chasis sola**: el borrador deja de
 * pintarse como panel de trabajo y pasa a pintarse como documento. Ese cambio de forma es la
 * enseñanza de la §3.2 de la especificación — no unos botones que se ponen grises.
 *
 * <p>Los `AbortController` son por instancia dentro de la función, no singletons de módulo.
 */
export function useQuoteDetail() {
  const store = useQuotesStore()
  const { currentQuote, loadingQuote, quoteError, quoteErrorTraceId, savingQuote } =
    storeToRefs(store)
  const { errorFrom, success } = useToast()
  const { confirm } = useConfirmDialog()

  const quote = computed(() => currentQuote.value)

  let request: AbortController | null = null

  /**
   * Recarga siempre al abrir la pantalla. Limpia el documento anterior antes de pedir el nuevo:
   * dejar el de la cotización que se estaba mirando mientras carga otra es la forma de que alguien
   * acepte la equivocada.
   */
  async function loadQuote(id: number) {
    request?.abort()
    const controller = new AbortController()
    request = controller
    store.setCurrentQuote(null)
    store.setLoadingQuote(true)
    store.setQuoteError(null)

    try {
      const result = await quotesApi.findById(id, controller.signal)
      if (!controller.signal.aborted) store.setCurrentQuote(result)
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      store.setQuoteError(
        getProblemDetailMessage(error, 'No se pudo cargar la cotización'),
        getTraceId(error) ?? null,
      )
      errorFrom('Error al cargar la cotización', error)
    } finally {
      if (request === controller) {
        store.setLoadingQuote(false)
        request = null
      }
    }
  }

  /** Guarda el resultado de una escritura en el detalle y en la fila del listado ya cargado. */
  function applyResult(result: QuoteResponse) {
    store.setCurrentQuote(result)
    store.patchQuoteInPage(result)
  }

  async function runWrite<T>(
    action: () => Promise<T>,
    errorTitle: string,
    onDone: (result: T) => void,
  ): Promise<boolean> {
    store.setSavingQuote(true)
    try {
      onDone(await action())
      return true
    } catch (error: unknown) {
      errorFrom(errorTitle, error)
      return false
    } finally {
      store.setSavingQuote(false)
    }
  }

  /**
   * La puerta de un solo sentido. La consecuencia se escribe entera y sin suavizar, porque es
   * literalmente lo que deja de poder hacerse.
   */
  async function sendQuote(target: QuoteResponse): Promise<boolean> {
    const confirmed = await confirm({
      message: `¿Enviar la cotización ${target.quoteNumber} a ${quoteClientName(target)}?`,
      consequence:
        'A partir de aquí la cotización no se puede editar ni eliminar. Si el precio cambia, se emite otra.',
      confirmLabel: 'Enviar cotización',
    })
    if (!confirmed) return false
    return runWrite(
      () => quotesApi.send(target.id),
      'No se pudo enviar la cotización',
      (result) => {
        applyResult(result)
        success('Cotización enviada', `${result.quoteNumber} ya es un documento: solo se agrega.`)
      },
    )
  }

  /**
   * La prueba de la aceptación. El cuerpo lleva **solo** el correo: la IP y la marca de tiempo las
   * pone el servidor desde la petición, porque una prueba que el cliente escribe no prueba nada.
   */
  async function acceptQuote(target: QuoteResponse, acceptedByEmail: string): Promise<boolean> {
    return runWrite(
      () => quotesApi.accept(target.id, { acceptedByEmail }),
      'No se pudo marcar la cotización como aceptada',
      (result) => {
        applyResult(result)
        success('Cotización aceptada', `Queda constancia de quién aceptó, cuándo y desde qué IP.`)
      },
    )
  }

  async function rejectQuote(target: QuoteResponse): Promise<boolean> {
    const confirmed = await confirm({
      message: `¿Marcar rechazada la cotización ${target.quoteNumber}?`,
      consequence:
        'La oferta queda en el embudo como perdida y el documento no cambia. Si el cliente vuelve, se emite una cotización nueva.',
      confirmLabel: 'Marcar rechazada',
    })
    if (!confirmed) return false
    return runWrite(
      () => quotesApi.reject(target.id),
      'No se pudo marcar la cotización como rechazada',
      (result) => {
        applyResult(result)
        success('Cotización rechazada')
      },
    )
  }

  /**
   * Solo se ofrece en `DRAFT`. `DELETE /quotes/{id}` existe para cualquier estado, pero borrar una
   * oferta enviada es borrar el embudo comercial: la pantalla no pinta la acción fuera del
   * borrador, ni siquiera deshabilitada.
   */
  async function removeQuote(target: QuoteResponse): Promise<boolean> {
    const confirmed = await confirm({
      message: `¿Eliminar el borrador ${target.quoteNumber}?`,
      consequence:
        'Se borra con sus líneas y sus respuestas. Solo se puede porque todavía no se ha enviado a nadie.',
      confirmLabel: 'Eliminar borrador',
    })
    if (!confirmed) return false
    return runWrite(
      () => quotesApi.remove(target.id),
      'No se pudo eliminar el borrador',
      () => {
        store.removeQuoteFromPage(target.id)
        store.setCurrentQuote(null)
        success('Borrador eliminado')
      },
    )
  }

  onUnmounted(() => request?.abort())

  return {
    quote,
    loadingQuote,
    quoteError,
    quoteErrorTraceId,
    savingQuote,
    loadQuote,
    sendQuote,
    acceptQuote,
    rejectQuote,
    removeQuote,
  }
}
