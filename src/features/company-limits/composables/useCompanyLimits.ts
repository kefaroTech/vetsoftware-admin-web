import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { entitlementsApi } from '@/features/subscriptions-admin/api/entitlements.api'
import {
  capacityNoun,
  capacityTitle,
} from '@/features/subscriptions-admin/composables/entitlementText'
import { companyLimitsApi } from '../api/company-limits.api'
import { useCompanyLimitsStore } from '../stores/company-limits.store'
import {
  DEFAULT_EVENT_WINDOW_DAYS,
  businessEventRange,
  businessToday,
  limitSourceProvenance,
  overLimitNote,
} from './companyLimitsText'
import type { AdjustCompanyUsageRequest, CompanyLimitRow } from '../types/company-limits.types'

/**
 * <b>La API estable de los cupos de una empresa</b> (§I4 / §B8).
 *
 * <p>Junta tres lecturas que responden tres preguntas distintas y que ninguna
 * pantalla tenía juntas:
 *
 * <ol>
 *   <li><b>¿Cuánto lleva usado?</b> — `GET /entitlements/access`. Es el único
 *       endpoint que trae consumo y techo por eje en una sola llamada. Se lee, no
 *       se escribe: la advertencia sobre puertos que admiten al cliente es sobre
 *       <b>la corrección</b>, y esa va por el puerto de plataforma.</li>
 *   <li><b>¿De dónde sale su techo?</b> — el techo efectivo por eje, que es lo
 *       único que sabe decir si viene del contrato, de una excepción negociada o
 *       de fábrica. Sin esto un cupo es un número que nadie sabe quién manda.</li>
 *   <li><b>¿Qué le pasó?</b> — la bitácora del último trimestre: cuándo se le
 *       avisó, cuándo se le dio un portazo y cuándo alguien corrigió el contador.</li>
 * </ol>
 *
 * <p><b>Y una cuarta, la de salud:</b> la última foto del cálculo, para poder
 * decir cuándo y por qué se recalculó. Un 404 ahí no es un fallo —hay empresas
 * sin ninguna foto todavía— y se traduce a «no hay», no a un banner rojo.
 *
 * <p>Los techos efectivos se piden en abanico, uno por eje. No es una llamada por
 * fila de una tabla paginada: es una por eje que esta empresa tiene contador, que
 * son un puñado, y el contrato no publica ninguna en bloque. <b>Un eje cuyo techo
 * no llegue se queda sin procedencia y lo dice</b> en vez de heredar la del
 * vecino.
 */
export function useCompanyLimits() {
  const store = useCompanyLimitsStore()
  const {
    capacities,
    recalculatedAt,
    effectiveLimits,
    events,
    snapshot,
    loading,
    adjusting,
    error,
    errorTraceId,
  } = storeToRefs(store)
  const toast = useToast()

  // Por instancia del composable, no singleton de módulo.
  let request: AbortController | null = null

  /**
   * Una fila de la pantalla: el contador, su techo efectivo y de dónde sale.
   *
   * <p>`limit` sale del techo efectivo cuando llegó y, si no, del propio contador.
   * `used` puede ser `null` y se deja `null`: el medidor lo trata como cero, así
   * que la tarjeta decide por su cuenta no pintar barra cuando no se sabe.
   */
  const rows = computed<CompanyLimitRow[]>(() =>
    capacities.value.map((capacity) => {
      const effective = effectiveLimits.value[capacity.limitDimensionId] ?? null
      const limit = effective ? effective.limitQuantity : capacity.limitQuantity
      return {
        capacity,
        effective,
        title: capacityTitle(capacity.dimensionCode),
        noun: capacityNoun(capacity.dimensionCode),
        limit,
        used: capacity.usedQuantity,
        /** Lo dice el servidor; `null` significa que no se pronunció. */
        exhausted: capacity.exhausted,
        provenance: effective ? limitSourceProvenance(effective.source) : null,
        overLimit: overLimitNote(capacity.usedQuantity, limit),
      }
    }),
  )

  /** Los hechos, del más reciente al más antiguo. Una bitácora se lee hacia atrás. */
  const eventRows = computed(() =>
    [...events.value].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  )

  /** Cuántos portazos hubo en la ventana. Es la señal de venta, no un adorno. */
  const blockedCount = computed(
    () => events.value.filter((event) => event.eventType === 'LIMIT_BLOCKED').length,
  )

  /**
   * Abre los cupos de una empresa. <b>Recarga siempre</b>: un contador en caché es
   * exactamente el dato sobre el que no se puede decidir una corrección.
   */
  async function openLimits(nextCompanyId: number, windowDays = DEFAULT_EVENT_WINDOW_DAYS) {
    request?.abort()
    const controller = new AbortController()
    request = controller

    store.setTarget(nextCompanyId)
    store.setAccess([], null)
    store.clearEffectiveLimits()
    store.setEvents([])
    store.setSnapshot(null)
    store.setError(null)
    store.setLoading(true)

    const range = businessEventRange(windowDays)
    // «La última foto a día de hoy»: el extremo es el final del día del negocio,
    // incluido, igual que el último día de una ventana de prueba.
    const snapshotAt = `${businessToday()}T23:59:59`

    try {
      const [access, eventList, snapshotResult] = await Promise.all([
        entitlementsApi.findAccess(nextCompanyId, controller.signal),
        companyLimitsApi.listByCompany(nextCompanyId, range.from, range.to, controller.signal),
        companyLimitsApi
          .findSnapshotAt(nextCompanyId, snapshotAt, controller.signal)
          .catch((err: unknown) => {
            if (axios.isAxiosError(err) && err.response?.status === 404) return null
            throw err
          }),
      ])
      if (controller.signal.aborted) return

      store.setAccess(access.capacities, access.recalculatedAt)
      store.setEvents(eventList)
      store.setSnapshot(snapshotResult)

      // Abanico por eje. Cada respuesta aterriza sola; una que falle deja a su
      // eje sin procedencia y no tumba la pantalla entera, que es lo que pasaría
      // con un `Promise.all` sin `catch` por rama.
      await Promise.all(
        access.capacities.map(async (capacity) => {
          try {
            const effective = await companyLimitsApi.findEffectiveLimit(
              nextCompanyId,
              capacity.limitDimensionId,
              controller.signal,
            )
            if (!controller.signal.aborted) store.setEffectiveLimit(effective)
          } catch {
            // Sin procedencia se pinta el hueco, no un origen inventado (R14).
          }
        }),
      )
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setError(
        getProblemDetailMessage(err, 'No se pudieron cargar los cupos de esta empresa'),
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
   * <b>Corrige un contador.</b> Va al puerto de plataforma y a ningún otro — ver
   * `company-limits.api.ts`, donde está escrito por qué eso es una decisión de
   * seguridad y no de diseño.
   *
   * <p>Tras corregir se recarga todo en vez de parchear el contador con el delta:
   * el servidor lee el consumo antes de moverlo y puede haber cambiado entre que
   * se abrió la pantalla y se firmó. Enseñar la resta que hicimos aquí sería
   * enseñar una cifra que nadie ha guardado.
   */
  async function adjustUsage(
    nextCompanyId: number,
    body: AdjustCompanyUsageRequest,
  ): Promise<boolean> {
    store.setAdjusting(true)
    try {
      const event = await companyLimitsApi.adjustUsage(nextCompanyId, body)
      toast.success(
        'Contador corregido',
        `Queda escrito el hecho #${event.id} con las cifras de antes: ${event.usedQuantity} usados sobre un techo de ${event.limitQuantity}.`,
      )
      await openLimits(nextCompanyId)
      return true
    } catch (err: unknown) {
      toast.errorFrom('No se pudo corregir el contador', err)
      return false
    } finally {
      store.setAdjusting(false)
    }
  }

  onUnmounted(() => request?.abort())

  return {
    capacities,
    rows,
    events,
    eventRows,
    blockedCount,
    recalculatedAt,
    snapshot,
    loading,
    adjusting,
    error,
    errorTraceId,
    openLimits,
    adjustUsage,
    closeLimits: store.reset,
  }
}
