import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { entitlementsApi } from '../api/entitlements.api'
import { useEntitlementsStore } from '../stores/entitlements.store'
import type { EntitlementScope } from '../types/entitlements.types'
import {
  RECALCULATE_CONFIRM_LABEL,
  RECALCULATE_CONSEQUENCE,
  recalculationHealth,
  recalculationSummary,
} from './entitlementText'

/**
 * La API estable de `/acceso` (§4.4.2, tarea W2-D).
 *
 * <p><b>No recarga el contrato.</b> El armazón ya lo cargó y garantiza que
 * `companyId` no es `null` mientras el expediente esté pintado; esta sub-vista
 * lee ese `companyId` y se lo pasa a su cliente de API para que la cabecera
 * `X-Company-Id` viaje también en sus tres llamadas.
 *
 * <p><b>Dos lecturas, no una, y cada una con su carrera abortada aparte.</b> Los
 * dos GET responden preguntas distintas —«qué puede usar hoy» y «el listado de
 * auditoría, con los caducados y los ocultos»— y el de auditoría además pagina.
 * Compartir un solo `AbortController` haría que pasar de página cancelase la foto
 * del acceso, que es la que alimenta el indicador de salud.
 *
 * <p>Las `ref()` de este módulo están todas dentro de la función —los
 * `AbortController` por instancia—, nunca a nivel de módulo: el patrón híbrido
 * está prohibido y el estado compartido vive en el store.
 */
export function useEntitlements() {
  const store = useEntitlementsStore()
  const {
    access,
    audit,
    scope,
    loadingAccess,
    loadingAudit,
    recalculating,
    accessError,
    accessErrorTraceId,
    auditError,
    auditErrorTraceId,
  } = storeToRefs(store)
  const { errorFrom, success } = useToast()
  const { confirm } = useConfirmDialog()

  let accessRequest: AbortController | null = null
  let auditRequest: AbortController | null = null

  /**
   * Las filas que se pintan, según el modo.
   *
   * <p>La misma tabla con dos fuentes, y no dos tablas: son las mismas columnas
   * respondiendo dos preguntas, y ponerlas una debajo de otra obligaría a leer
   * dos veces lo mismo para descubrir qué las diferencia.
   */
  const rows = computed(() =>
    scope.value === 'current' ? (access.value?.entitlements ?? []) : audit.value.content,
  )

  const loading = computed(() =>
    scope.value === 'current' ? loadingAccess.value : loadingAudit.value,
  )

  const error = computed(() => (scope.value === 'current' ? accessError.value : auditError.value))

  const errorTraceId = computed(() =>
    scope.value === 'current' ? accessErrorTraceId.value : auditErrorTraceId.value,
  )

  const capacities = computed(() => access.value?.capacities ?? [])

  /**
   * El indicador de salud, con su respaldo honesto: si la foto del acceso no
   * trae `recalculatedAt`, se usa <b>la más reciente de las filas</b> antes de
   * declarar que no se sabe. Un `unknown` que en realidad era un dato disponible
   * mandaría a alguien a revisar un proceso que funciona.
   */
  const recalculatedAt = computed(() => {
    const fromSnapshot = access.value?.recalculatedAt ?? null
    if (fromSnapshot) return fromSnapshot
    // `LocalDateTime` en ISO ordena igual como texto que como fecha, así que la
    // más reciente es la última del orden lexicográfico. Nada de `new Date()`
    // por fila para elegir un máximo.
    return (
      (access.value?.entitlements ?? [])
        .map((row) => row.recalculatedAt)
        .filter((value): value is string => !!value)
        .sort()
        .at(-1) ?? null
    )
  })

  const health = computed(() => recalculationHealth(recalculatedAt.value))

  /**
   * Cuántos permisos de los que se están viendo se concedieron a mano. Se cuenta
   * sobre las filas pintadas y no sobre el `manualGrantCount` del recálculo,
   * porque ese solo existe justo después de recalcular y esta cifra tiene que
   * estar desde que se abre la pantalla.
   */
  const manualGrantCount = computed(
    () => rows.value.filter((row) => row.source === 'MANUAL_GRANT').length,
  )

  async function loadAccess(companyId: number) {
    accessRequest?.abort()
    const controller = new AbortController()
    accessRequest = controller
    store.setLoadingAccess(true)
    store.setAccessError(null)
    try {
      const result = await entitlementsApi.findAccess(companyId, controller.signal)
      if (!controller.signal.aborted) store.setAccess(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // El mensaje sale del `ProblemDetail` y la traza del `X-Trace-Id`.
      // Escribirlo a mano dejaría a soporte sin forma de correlacionarlo.
      store.setAccessError(
        getProblemDetailMessage(err, 'No se pudo cargar el acceso vigente'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (accessRequest === controller) {
        store.setLoadingAccess(false)
        accessRequest = null
      }
    }
  }

  /** `oneBasedPage` es la que ve el operador; el índice desde 0 se convierte aquí. */
  async function loadAudit(companyId: number, oneBasedPage = 1) {
    auditRequest?.abort()
    const controller = new AbortController()
    auditRequest = controller
    store.setLoadingAudit(true)
    store.setAuditError(null)
    try {
      const result = await entitlementsApi.listAll(
        companyId,
        Math.max(oneBasedPage - 1, 0),
        audit.value.pageSize,
        controller.signal,
      )
      if (!controller.signal.aborted) store.setAudit(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setAuditError(
        getProblemDetailMessage(err, 'No se pudo cargar el listado de auditoría'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (auditRequest === controller) {
        store.setLoadingAudit(false)
        auditRequest = null
      }
    }
  }

  /**
   * Abre la sub-vista. <b>Recarga siempre</b>, y tira lo de la empresa anterior
   * antes de pedir lo nuevo: dejar pintados los permisos de una clínica bajo la
   * cabecera de otra es, en esta pantalla concreta, el peor error posible.
   */
  async function openAccess(companyId: number) {
    if (store.loadedCompanyId !== companyId) store.reset()
    store.setLoadedCompanyId(companyId)
    await Promise.all([loadAccess(companyId), loadAudit(companyId, 1)])
  }

  function changeScope(next: EntitlementScope) {
    store.setScope(next)
  }

  async function goToAuditPage(companyId: number, oneBasedPage: number) {
    await loadAudit(companyId, oneBasedPage)
  }

  /**
   * Recalcular: <b>la única escritura de la pantalla, y no es una edición</b>.
   *
   * <p>Se confirma con su consecuencia escrita —qué reconstruye, qué no toca y
   * que lo concedido a mano se conserva— porque no debe parecer un refresco de
   * página. Al terminar se refrescan las dos lecturas: el indicador de salud lo
   * alimenta la respuesta del servidor, no la hora del navegador, así que la
   * fecha nueva tiene que venir de una lectura de verdad.
   *
   * <p>Devuelve si se recalculó, para que la vista sepa si tiene que mover el
   * foco al indicador.
   */
  async function recalculate(companyId: number): Promise<boolean> {
    const confirmed = await confirm({
      message: '¿Recalcular los permisos de esta empresa desde sus contratos?',
      consequence: RECALCULATE_CONSEQUENCE,
      confirmLabel: RECALCULATE_CONFIRM_LABEL,
    })
    if (!confirmed) return false

    store.setRecalculating(true)
    try {
      const result = await entitlementsApi.recalculate(companyId)
      await Promise.all([loadAccess(companyId), loadAudit(companyId, 1)])
      success('Permisos recalculados', recalculationSummary(result))
      return true
    } catch (err: unknown) {
      errorFrom('No se pudieron recalcular los permisos', err)
      return false
    } finally {
      store.setRecalculating(false)
    }
  }

  onUnmounted(() => {
    accessRequest?.abort()
    auditRequest?.abort()
  })

  return {
    rows,
    capacities,
    recalculatedAt,
    health,
    manualGrantCount,
    scope,
    loading,
    loadingAccess,
    recalculating,
    error,
    errorTraceId,
    auditPage: computed(() => audit.value.page + 1),
    auditPageSize: computed(() => audit.value.pageSize),
    auditTotal: computed(() => audit.value.totalElements),
    auditPageCount: computed(() => Math.max(audit.value.totalPages, 1)),
    openAccess,
    changeScope,
    goToAuditPage,
    recalculate,
  }
}
