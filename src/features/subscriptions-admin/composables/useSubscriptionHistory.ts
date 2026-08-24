import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import { subscriptionHistoryApi } from '../api/subscription-history.api'
import { useSubscriptionHistoryStore } from '../stores/subscription-history.store'
import { buildHistoryTimeline, timelineAnnouncement } from './subscriptionHistoryText'

/**
 * <b>La película del contrato: los otrosíes y la bitácora de estados, fusionados
 * en una sola línea de tiempo</b> (§3.3 y §4.4.2, tarea W2-C).
 *
 * <p>Es la API estable que consume `SubscriptionHistoryView`. El estado vive en
 * `subscription-history.store.ts` y aquí se concentra la lógica de API y de
 * avisos, que es el patrón de `useSpecies`/`useQuoteDetail` del repositorio.
 *
 * <p><b>No recarga el contrato.</b> `useSubscriptionRecord()` ya garantiza que
 * `companyId` y `subscriptionId` están puestos cuando esta sub-vista se monta;
 * lo único que hace aquí es pasarlos a su propio cliente para que la cabecera
 * `X-Company-Id` viaje también en estas dos llamadas.
 *
 * <h3>Por qué carga el expediente completo en vez de paginar</h3>
 *
 * <p>Los dos endpoints paginan por separado y <b>ordenan en sentidos
 * opuestos</b>: los otrosíes vienen `effectiveDate ASC` y la bitácora
 * `occurredAt DESC` (comprobado en `JpaSubscriptionAmendmentRepository.order()` y
 * `JpaSubscriptionStatusHistoryRepository.order()`), y ninguno acepta parámetro
 * de orden. Con eso, «página 1 de cada uno, fusionadas» no es la primera página
 * de nada: es el principio de una película pegado al final de la otra. Y ordenar
 * en cliente una página suelta es la mentira que §3.5 prohíbe explícitamente para
 * la lista de documentos —ordenar 20 de 300 filas es mentir sobre cuál es el más
 * viejo—, solo que aquí sería peor, porque lo que se está reordenando es una
 * cronología.
 *
 * <p>Así que se cargan todas las páginas de las dos fuentes y se ordena el
 * conjunto completo, que sí es honesto. Es asumible porque el volumen es el de un
 * contrato, no el de la plataforma: páginas de 100 y un tope de 5 por fuente.
 * Cuando ese tope se toca, `truncated` se enciende y la pantalla lo dice — no se
 * finge una película completa que no lo es. El tope existe para que un dato
 * anómalo no dispare cincuenta peticiones desde una pantalla de consulta.
 */

/** 100 por página: el expediente de un contrato entero suele caber en una sola vuelta. */
const PAGE_SIZE = 100
/** Techo de vueltas por fuente. Si se toca, lo cargado no es el expediente completo y se dice. */
const MAX_PAGES = 5

/** Carga páginas de un listado hasta agotarlo o hasta topar el techo. */
async function loadAllPages<T>(
  fetchPage: (page: number) => Promise<PageResponse<T>>,
): Promise<{ items: T[]; total: number; truncated: boolean }> {
  const items: T[] = []
  let total = 0
  let page = 0

  for (; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(page)
    items.push(...result.content)
    total = result.totalElements
    if (page + 1 >= result.totalPages) {
      return { items, total, truncated: false }
    }
  }

  return { items, total, truncated: true }
}

export function useSubscriptionHistory() {
  const store = useSubscriptionHistoryStore()
  const {
    amendments,
    statusChanges,
    loadedFor,
    loading,
    error,
    errorTraceId,
    truncated,
    totalAmendments,
    totalStatusChanges,
  } = storeToRefs(store)
  const { errorFrom } = useToast()

  // Por instancia del composable, no singleton de módulo: es una referencia local
  // a esta llamada de la función, como en `useSubscriptionRecord`.
  let request: AbortController | null = null

  /** La línea de tiempo fusionada, del movimiento más reciente al más antiguo. */
  const entries = computed(() => buildHistoryTimeline(amendments.value, statusChanges.value))

  const isEmpty = computed(() => !loading.value && !error.value && entries.value.length === 0)

  /** Lo que se anuncia al lector de pantalla cuando termina la consulta (§5.3). */
  const announcement = computed(() => {
    if (loading.value) return 'Cargando la historia del contrato…'
    if (error.value) return ''
    if (!loadedFor.value) return ''
    return timelineAnnouncement(entries.value)
  })

  /**
   * Cuántas entradas se quedaron fuera al topar el techo. Se dice con números
   * concretos: «se muestran 500 de 640» informa, «hay más» no.
   */
  const truncationNotice = computed(() => {
    if (!truncated.value) return null
    const cargados = amendments.value.length + statusChanges.value.length
    const totales = totalAmendments.value + totalStatusChanges.value
    return `Este contrato tiene más movimientos de los que caben en una consulta: se muestran ${cargados} de ${totales}, los más antiguos entre los otrosíes y los más recientes entre los cambios de estado. La película está incompleta y el orden entre las dos mitades no es fiable.`
  })

  /**
   * <b>Recarga siempre al abrir la pantalla.</b> Limpia lo anterior antes de pedir
   * lo nuevo: dejar pintados los otrosíes del contrato anterior bajo la cabecera
   * del nuevo es cómo se acaba auditando el expediente equivocado.
   *
   * <p>Las dos fuentes se piden en paralelo —son independientes— y un fallo de
   * cualquiera de las dos deja la pantalla en error, sin media película: una
   * bitácora sin sus otrosíes no responde «por qué esta cuenta está en solo
   * lectura», solo lo parece.
   */
  async function load(companyId: number, subscriptionId: number) {
    request?.abort()
    const controller = new AbortController()
    request = controller

    store.reset()
    store.setLoading(true)

    try {
      const [amendmentsResult, statusResult] = await Promise.all([
        loadAllPages((page) =>
          subscriptionHistoryApi.listAmendments(
            subscriptionId,
            companyId,
            page,
            PAGE_SIZE,
            controller.signal,
          ),
        ),
        loadAllPages((page) =>
          subscriptionHistoryApi.listStatusHistory(
            subscriptionId,
            companyId,
            page,
            PAGE_SIZE,
            controller.signal,
          ),
        ),
      ])
      if (controller.signal.aborted) return

      store.setHistory({
        companyId,
        subscriptionId,
        amendments: amendmentsResult.items,
        statusChanges: statusResult.items,
        totalAmendments: amendmentsResult.total,
        totalStatusChanges: statusResult.total,
        truncated: amendmentsResult.truncated || statusResult.truncated,
      })
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setError(
        getProblemDetailMessage(err, 'No se pudo cargar la historia del contrato'),
        getTraceId(err) ?? null,
      )
      errorFrom('Error al cargar la historia del contrato', err)
    } finally {
      if (request === controller) {
        store.setLoading(false)
        request = null
      }
    }
  }

  onUnmounted(() => {
    request?.abort()
    store.reset()
  })

  return {
    entries,
    amendments,
    statusChanges,
    loading,
    error,
    errorTraceId,
    isEmpty,
    announcement,
    truncationNotice,
    load,
  }
}
