import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { trialsApi } from '../api/trials.api'
import { useCompanyTrialStore } from '../stores/company-trial.store'
import { businessToday, trialGrantState, trialWindowState } from './trialWindowText'
import type {
  ConsumeTrialGrantRequest,
  GrantTrialRequest,
  OpenTrialWindowRequest,
} from '../types/trials.types'

/**
 * <b>La API estable de la prueba de una empresa.</b> La consumen la pestaña
 * «Prueba» del expediente de empresa y la del expediente del contrato, que
 * enseñan lo mismo desde dos sitios.
 *
 * <p>Aquí viven las llamadas y los avisos; el estado compartido está en
 * `company-trial.store.ts` y las reglas de calendario en `trialWindowText.ts`.
 * Lo único local a esta instancia es el `AbortController` —estado por instancia,
 * no singleton de módulo.
 *
 * <p><b>Recarga siempre al abrir la pantalla</b> (regla del expediente): una
 * ventana de prueba en caché es exactamente el dato que no puede quedarse viejo,
 * porque cambia solo con el paso de los días.
 */
export function useCompanyTrial() {
  const store = useCompanyTrialStore()
  const { window, windowMissing, grants, loading, saving, error, errorTraceId } = storeToRefs(store)
  const toast = useToast()

  // Por instancia del composable, no singleton de módulo.
  let request: AbortController | null = null

  /**
   * El día del negocio, no el del navegador. Se calcula una vez por carga y se
   * pasa a las funciones puras: así todas las filas de la pantalla se comparan
   * contra el mismo «hoy» aunque la pestaña quede abierta cruzando la medianoche.
   */
  const today = computed(() => businessToday())

  const windowState = computed(() =>
    window.value ? trialWindowState(window.value, today.value) : null,
  )

  /** Las concesiones con su desenlace ya resuelto, en el orden en que vencen. */
  const grantRows = computed(() =>
    [...grants.value]
      .sort((a, b) => a.trialEndDate.localeCompare(b.trialEndDate))
      .map((grant) => ({ grant, state: trialGrantState(grant, today.value) })),
  )

  /**
   * Cuántas pruebas ya terminaron sin que nadie escribiera qué pasó. Es el
   * número que convierte esta pantalla en trabajo pendiente y no en un archivo.
   */
  const awaitingOutcomeCount = computed(
    () => grantRows.value.filter((row) => row.state.awaitingOutcome).length,
  )

  /**
   * Abre la prueba de una empresa. Las dos lecturas van en paralelo porque son
   * independientes; la de la ventana tolera el 404, que no es un fallo sino la
   * respuesta a «esta empresa nunca ha estado en prueba».
   */
  async function openTrial(nextCompanyId: number) {
    request?.abort()
    const controller = new AbortController()
    request = controller

    store.setTarget(nextCompanyId)
    store.setWindow(null)
    store.setWindowMissing(false)
    store.setGrants([])
    store.setError(null)
    store.setLoading(true)

    try {
      const [windowResult, grantsResult] = await Promise.all([
        trialsApi.findCurrentWindow(nextCompanyId, controller.signal).catch((err: unknown) => {
          if (axios.isAxiosError(err) && err.response?.status === 404) return null
          throw err
        }),
        trialsApi.listByCompany(nextCompanyId, controller.signal),
      ])
      if (controller.signal.aborted) return

      store.setWindow(windowResult)
      store.setGrants(grantsResult)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // El mensaje sale del `ProblemDetail` y nunca se escribe a mano: hacerlo
      // tira la traza con la que se encuentra la petición en Grafana.
      store.setError(
        getProblemDetailMessage(err, 'No se pudo cargar la prueba de esta empresa'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (request === controller) {
        store.setLoading(false)
        request = null
      }
    }
  }

  /**
   * Abre la ventana. Devuelve `true` si se abrió, para que la pantalla decida a
   * dónde llevar el foco.
   *
   * <p>Tras abrirla se recarga todo y no se parchea el store con la respuesta:
   * abrir una ventana recorta las concesiones que ya existían contra sus días, y
   * dar por buenos los `effectiveDays` que ya teníamos enseñaría al operador unos
   * días que el servidor acaba de cambiar.
   */
  async function openWindow(nextCompanyId: number, body: OpenTrialWindowRequest): Promise<boolean> {
    store.setSaving(true)
    try {
      await trialsApi.openWindow(nextCompanyId, body)
      toast.success(
        'Ventana de prueba abierta',
        `${body.windowDays} días desde el ${body.startDate}. No se puede ampliar después.`,
      )
      await openTrial(nextCompanyId)
      return true
    } catch (err: unknown) {
      toast.errorFrom('No se pudo abrir la ventana de prueba', err)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  /**
   * Cierra la ventana antes de tiempo. <b>No la borra</b>: la cierra, y el cierre
   * queda escrito con su fecha.
   */
  async function closeWindow(nextCompanyId: number): Promise<boolean> {
    store.setSaving(true)
    try {
      await trialsApi.closeWindow(nextCompanyId)
      toast.success('Ventana de prueba cerrada', 'La empresa deja de estar en prueba desde ahora.')
      await openTrial(nextCompanyId)
      return true
    } catch (err: unknown) {
      toast.errorFrom('No se pudo cerrar la ventana de prueba', err)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  /**
   * <b>Concede un artículo a mano.</b> Devuelve `true` si quedó concedido, para
   * que la pantalla cierre el modal y mueva el foco.
   *
   * <p>Tras conceder se recarga todo y no se empuja la respuesta al store: el
   * servidor recorta `effectiveDays` contra la ventana, y quedarse con lo que se
   * pidió enseñaría unos días que la empresa no va a tener. El aviso de éxito
   * dice los <b>efectivos</b>, que son los verdaderos, y nombra el recorte cuando
   * lo hubo — es la diferencia entre lo que alguien vendió y lo que el cliente
   * recibe, y callarla es cómo llega a la conversación un mes después.
   */
  async function grantModule(nextCompanyId: number, body: GrantTrialRequest): Promise<boolean> {
    store.setSaving(true)
    try {
      const granted = await trialsApi.grant(nextCompanyId, body)
      const trimmed = granted.effectiveDays < granted.daysGranted
      toast.success(
        'Artículo concedido',
        trimmed
          ? `Artículo #${granted.catalogItemId}: se pidieron ${granted.daysGranted} días y quedaron ${granted.effectiveDays}, porque la ventana terminaba antes. Último día, incluido: ${granted.trialEndDate}.`
          : `Artículo #${granted.catalogItemId}, ${granted.effectiveDays} días. Último día, incluido: ${granted.trialEndDate}. No se desconcede.`,
      )
      await openTrial(nextCompanyId)
      return true
    } catch (err: unknown) {
      toast.errorFrom('No se pudo conceder el artículo', err)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  /**
   * <b>Escribe el desenlace de una concesión</b> al vencer.
   *
   * <p>No borra nada: la concesión sigue existiendo y sigue probando que esta
   * empresa tuvo el artículo en esas fechas. Lo que cambia es que deja de estar
   * en blanco, y con ella baja {@link awaitingOutcomeCount}, que es el número que
   * convierte esta pantalla en trabajo pendiente.
   */
  async function recordOutcome(
    nextCompanyId: number,
    catalogItemId: number,
    body: ConsumeTrialGrantRequest,
  ): Promise<boolean> {
    store.setSaving(true)
    try {
      await trialsApi.consume(nextCompanyId, catalogItemId, body)
      toast.success(
        'Desenlace escrito',
        'La concesión queda cerrada con ese desenlace. No hay operación que lo reescriba.',
      )
      await openTrial(nextCompanyId)
      return true
    } catch (err: unknown) {
      toast.errorFrom('No se pudo escribir el desenlace', err)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  onUnmounted(() => request?.abort())

  return {
    window,
    windowMissing,
    windowState,
    grants,
    grantRows,
    awaitingOutcomeCount,
    today,
    loading,
    saving,
    error,
    errorTraceId,
    openTrial,
    openWindow,
    closeWindow,
    grantModule,
    recordOutcome,
    closeTrial: store.reset,
  }
}
