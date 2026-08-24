import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { DUNNING_EVENT_LABEL } from '@/features/billing-operations/types/billing-operations.types'
import { dunningRecordApi } from '../api/dunning-record.api'
import { useDunningRecordStore } from '../stores/dunning-record.store'
import type { DunningEventDraft } from '../types/dunning-record.types'
import {
  DUNNING_PAGE_SIZE,
  channelTally,
  dunningEvidence,
  reactivationSignal,
  toRecordRequest,
  writtenOffAt,
} from './dunningRecordText'

/**
 * La API estable de `/cobranza` (§4.4.2, tarea W2-F).
 *
 * <p><b>No recarga el contrato.</b> El armazón ya lo cargó y garantiza que
 * `companyId` no es `null` mientras el expediente esté pintado; esta sub-vista lo
 * lee y se lo pasa a su cliente de API para que la cabecera `X-Company-Id` viaje
 * también en sus dos llamadas.
 *
 * <p><b>Una sola petición, y del tamaño máximo que el servidor admite.</b> Aquí
 * no se pagina, y no es un descuido: lo que se lee es una <b>secuencia</b>, y una
 * secuencia partida en páginas deja de responder la pregunta por la que se entra
 * («¿se le avisó antes de restringirle la cuenta?»). `Pages.MAX_SIZE` son 200
 * filas —el tope duro del backend—, así que se piden las 200 y se compara lo
 * recibido con `totalElements`: si algún expediente llegara a pasar de ahí, la
 * pantalla lo <b>dice</b> en vez de presentar media película como si fuera
 * entera. Es la misma honestidad que W1-E aplicó a su bandeja, con la conclusión
 * contraria porque la pregunta es otra.
 *
 * <p><b>No se reordena en cliente.</b> El servidor ordena `occurredAt ASC` con un
 * desempate total por `id`, y ese orden es justamente el contenido de esta
 * pantalla. Reordenar aquí sería reescribir la prueba.
 *
 * <p>Las referencias de este módulo están todas dentro de la función —el
 * `AbortController` por instancia—, nunca a nivel de módulo: el patrón híbrido
 * está prohibido y el estado compartido vive en el store.
 */
export function useDunningRecord() {
  const store = useDunningRecordStore()
  const { events, total, loading, saving, error, errorTraceId } = storeToRefs(store)
  const { errorFrom, success } = useToast()

  let listRequest: AbortController | null = null

  /** La respuesta a la pregunta por la que se entra aquí. Ver `dunningEvidence`. */
  const evidence = computed(() => dunningEvidence(events.value))

  /** «Correo 4 · WhatsApp 2 · Llamada 1». Vacío si no hay ningún recordatorio. */
  const tally = computed(() => channelTally(events.value))

  const reactivation = computed(() => reactivationSignal(events.value))

  const writtenOff = computed(() => writtenOffAt(events.value))

  /**
   * Cuántos hitos hay en el servidor que esta pantalla no ha cargado. Cero en
   * todo expediente realista; distinto de cero es en sí mismo un hallazgo.
   */
  const notLoaded = computed(() => Math.max(total.value - events.value.length, 0))

  async function loadEvents(companyId: number, subscriptionId: number) {
    listRequest?.abort()
    const controller = new AbortController()
    listRequest = controller
    store.setLoading(true)
    store.setError(null)
    try {
      const result = await dunningRecordApi.listBySubscription(
        companyId,
        subscriptionId,
        0,
        DUNNING_PAGE_SIZE,
        controller.signal,
      )
      if (!controller.signal.aborted) store.setEvents(result.content, result.totalElements)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // El mensaje sale del `ProblemDetail` y la traza del `X-Trace-Id`:
      // escribirlo a mano dejaría a soporte sin forma de correlacionarlo.
      store.setError(
        getProblemDetailMessage(err, 'No se pudo cargar el expediente de cobranza'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (listRequest === controller) {
        store.setLoading(false)
        listRequest = null
      }
    }
  }

  /**
   * Abre la sub-vista. <b>Recarga siempre</b>, y tira lo del contrato anterior
   * antes de pedir lo nuevo: dejar pintada la mora de una clínica bajo la
   * cabecera de otra es, en esta pantalla, enseñarle a alguien la deuda de un
   * tercero.
   */
  async function openDunning(companyId: number, subscriptionId: number) {
    if (store.loadedSubscriptionId !== subscriptionId) store.reset()
    store.setLoadedSubscriptionId(subscriptionId)
    await loadEvents(companyId, subscriptionId)
  }

  /**
   * Anota un hito. <b>Es un alta, no una corrección</b>: la bitácora no tiene
   * `PUT` ni `DELETE`, así que esto solo añade una fila.
   *
   * <p>Al terminar se vuelve a leer el expediente entero en vez de empujar la
   * fila devuelta a la lista local. El orden lo decide el servidor por
   * `occurredAt`, y un hito anotado a toro pasado —que es el caso normal aquí:
   * se anota la llamada de ayer— no va al final, va en su sitio. Insertarlo a
   * mano en la punta pintaría una secuencia falsa justo en la pantalla que existe
   * para probar una secuencia.
   *
   * <p>Devuelve si se anotó, para que la vista sepa si tiene que cerrar el
   * formulario y mover el foco.
   */
  async function recordEvent(
    companyId: number,
    subscriptionId: number,
    draft: DunningEventDraft,
  ): Promise<boolean> {
    store.setSaving(true)
    try {
      const created = await dunningRecordApi.create(
        companyId,
        toRecordRequest(subscriptionId, draft),
      )
      await loadEvents(companyId, subscriptionId)
      success('Hito anotado', `${DUNNING_EVENT_LABEL[created.eventType]}. Queda en el expediente.`)
      return true
    } catch (err: unknown) {
      errorFrom('No se pudo anotar el hito', err)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  onUnmounted(() => {
    listRequest?.abort()
  })

  return {
    events,
    total,
    notLoaded,
    evidence,
    tally,
    reactivation,
    writtenOff,
    loading,
    saving,
    error,
    errorTraceId,
    openDunning,
    recordEvent,
  }
}
