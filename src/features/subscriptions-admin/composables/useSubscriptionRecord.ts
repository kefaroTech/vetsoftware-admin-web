import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { companiesApi } from '@/features/companies/api/companies.api'
import { subscriptionRecordApi } from '../api/subscription-record.api'
import { useSubscriptionRecordStore } from '../stores/subscription-record.store'
import type { SubscriptionResponse } from '../types/subscriptions-admin.types'
import type {
  CancelSubscriptionRequest,
  SubscriptionStatusChangeReason,
  SubscriptionStatusTransition,
} from '../types/subscription-record.types'
import {
  SUBSCRIPTION_STATUS_TRANSITIONS,
  canRequestCancellation,
  statusBannerTone,
  statusSupportText,
} from './subscriptionStatusText'

/**
 * <b>La API estable del expediente del contrato, y el punto de extensión de las
 * cinco sub-vistas que faltan (W2-B … W2-F).</b>
 *
 * <p>El armazón (`SubscriptionRecordLayout.vue`) es el único que llama a
 * `openRecord()`. Una sub-vista <b>no vuelve a cargar el contrato</b>: llama a
 * `useSubscriptionRecord()` y lee `companyId`, `subscriptionId` y
 * `subscription`, que ya están puestos cuando ella se monta. Lo que sí hace cada
 * sub-vista es cargar <b>lo suyo</b> —sus líneas, sus otrosíes, sus cargos— en su
 * propio store y su propio composable, y pasar ese mismo `companyId` a su cliente
 * de API para que la cabecera `X-Company-Id` viaje también en sus llamadas.
 *
 * <p>Lo que este composable garantiza a quien lo consume:
 *
 * <ol>
 *   <li>`companyId` no es `null` mientras el expediente esté pintado: el armazón
 *       no monta el `RouterView` hasta que el contrato ha cargado.</li>
 *   <li>`companyId` es el de la URL, comprobado contra el que devolvió el
 *       servidor. Si no casan, el expediente no se pinta.</li>
 *   <li>`subscription` se refresca solo tras cada escritura: quien pinte
 *       `status` o `cancelEffectiveDate` no tiene que recargar nada.</li>
 * </ol>
 */
export function useSubscriptionRecord() {
  const store = useSubscriptionRecordStore()
  const {
    companyId,
    subscriptionId,
    subscription,
    company,
    loading,
    saving,
    error,
    errorTraceId,
    companyError,
  } = storeToRefs(store)
  const { errorFrom, success } = useToast()

  // Por instancia del composable, no singletons de módulo: son referencias
  // locales a esta llamada de la función, exactamente como en
  // `useSubscriptionsAdmin` y `useQuoteDetail`.
  let subscriptionRequest: AbortController | null = null
  let companyRequest: AbortController | null = null

  /** El nombre de la empresa si cargó; si no, el guion honesto del sistema de diseño. */
  const companyName = computed(() => company.value?.name ?? '—')

  const supportText = computed(() =>
    subscription.value ? statusSupportText(subscription.value) : '',
  )

  const bannerTone = computed(() =>
    subscription.value ? statusBannerTone(subscription.value.status) : null,
  )

  // El `?? []` no es defensivo por costumbre: el mapa se indexa con el estado que
  // llegue por HTTP, y uno que la consola no conoce lo resuelve a `undefined`. La
  // plantilla lee `transitions.length`, y eso tumba la sub-vista entera. Sin
  // acciones ofrecidas se sigue leyendo el expediente; sin expediente, no.
  const transitions = computed<SubscriptionStatusTransition[]>(() =>
    subscription.value ? (SUBSCRIPTION_STATUS_TRANSITIONS[subscription.value.status] ?? []) : [],
  )

  const canCancel = computed(
    () =>
      !!subscription.value &&
      canRequestCancellation(subscription.value.status) &&
      !subscription.value.cancelRequestedAt,
  )

  /**
   * Abre el expediente: el contrato primero, el nombre de la empresa después y
   * sin bloquear.
   *
   * <p><b>Recarga siempre.</b> Limpia lo anterior antes de pedir lo nuevo: dejar
   * pintado el contrato que se estaba mirando mientras carga otro es la forma de
   * que alguien cancele el equivocado.
   *
   * <p>El nombre de la empresa es <b>una llamada extra, una sola vez y aquí</b>,
   * no por sub-vista: `SubscriptionResponse` no trae más que `companyId` (§1.2,
   * issue B-1) y un `#42` como única identidad de una empresa sobre cuyo contrato
   * se va a actuar es inaceptable. Si esa llamada falla, el expediente se pinta
   * igual con el `#42` y lo dice; lo que no puede es impedir operar.
   */
  async function openRecord(nextCompanyId: number, nextSubscriptionId: number) {
    subscriptionRequest?.abort()
    const controller = new AbortController()
    subscriptionRequest = controller

    store.setTarget(nextCompanyId, nextSubscriptionId)
    store.setSubscription(null)
    store.setCompany(null)
    store.setCompanyError(null)
    store.setError(null)
    store.setLoading(true)

    try {
      const result = await subscriptionRecordApi.findById(
        nextSubscriptionId,
        nextCompanyId,
        controller.signal,
      )
      if (controller.signal.aborted) return

      // Defensa en profundidad. El backend ya resuelve con
      // `findByIdAndCompanyId`, así que un par que no case responde 404 y no
      // llega aquí; si algún día devolviera otra cosa, el expediente prefiere no
      // pintarse a pintar la cabecera de una empresa mientras opera sobre otra.
      if (result.companyId !== nextCompanyId) {
        store.setError(
          `El contrato #${nextSubscriptionId} no pertenece a la empresa #${nextCompanyId}. Ábrelo desde la lista de contratos.`,
        )
        return
      }

      store.setSubscription(result)
      void loadCompany(nextCompanyId)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setError(
        getProblemDetailMessage(err, 'No se pudo cargar el contrato'),
        getTraceId(err) ?? null,
      )
      errorFrom('Error al cargar el contrato', err)
    } finally {
      if (subscriptionRequest === controller) {
        store.setLoading(false)
        subscriptionRequest = null
      }
    }
  }

  async function loadCompany(id: number) {
    companyRequest?.abort()
    const controller = new AbortController()
    companyRequest = controller
    try {
      const result = await companiesApi.findById(id)
      if (!controller.signal.aborted) store.setCompany(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // Sin toast: es una ayuda que falló, no una operación del operador. El
      // expediente lo dice donde importa —junto al número de empresa— y sigue
      // funcionando.
      store.setCompanyError(getProblemDetailMessage(err, 'No se pudo leer el nombre de la empresa'))
    } finally {
      if (companyRequest === controller) companyRequest = null
    }
  }

  async function runWrite(
    action: (target: SubscriptionResponse, scope: number) => Promise<SubscriptionResponse>,
    errorTitle: string,
    onDone: (result: SubscriptionResponse) => void,
  ): Promise<boolean> {
    const target = subscription.value
    const scope = companyId.value
    if (!target || scope == null) return false
    store.setSaving(true)
    try {
      const result = await action(target, scope)
      store.setSubscription(result)
      onDone(result)
      return true
    } catch (err: unknown) {
      errorFrom(errorTitle, err)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  /**
   * Aplica una transición con nombre. `reason` es vocabulario cerrado y
   * obligatorio, en el contrato y en la interfaz: es la única fuente que dice
   * por qué una cuenta cambió de estado.
   */
  async function applyTransition(
    transition: SubscriptionStatusTransition,
    reason: SubscriptionStatusChangeReason,
  ): Promise<boolean> {
    return runWrite(
      (target, scope) =>
        subscriptionRecordApi.changeStatus(target.id, scope, {
          status: transition.to,
          reason,
        }),
      `No se pudo aplicar la transición «${transition.label}»`,
      (result) => success('Estado actualizado', statusSupportText(result)),
    )
  }

  /**
   * Pide la baja. No cambia el estado: el contrato sigue vigente hasta la fecha
   * efectiva, y el aviso lo dice con las dos fechas separadas.
   */
  async function requestCancellation(payload: CancelSubscriptionRequest): Promise<boolean> {
    return runWrite(
      (target, scope) => subscriptionRecordApi.cancel(target.id, scope, payload),
      'No se pudo registrar la cancelación',
      (result) =>
        success(
          'Cancelación registrada',
          statusSupportText(result) ||
            'El contrato sigue vigente hasta la fecha efectiva, que es el periodo ya pagado.',
        ),
    )
  }

  onUnmounted(() => {
    subscriptionRequest?.abort()
    companyRequest?.abort()
  })

  return {
    companyId,
    subscriptionId,
    subscription,
    company,
    companyName,
    companyError,
    loading,
    saving,
    error,
    errorTraceId,
    supportText,
    bannerTone,
    transitions,
    canCancel,
    openRecord,
    applyTransition,
    requestCancellation,
    closeRecord: store.reset,
  }
}
