import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useServerPaged } from '@/composables/useServerPaged'
import { useToast } from '@/composables/useToast'
import { useReconciliationStore } from '../stores/reconciliation.store'
import { externalInvoiceReconciliationsApi } from '../api/reconciliation.api'
import type {
  ExternalInvoiceReconciliationResponse,
  MatchExternalInvoiceRequest,
  OpenExternalInvoiceReconciliationRequest,
  ResolveExternalInvoiceReconciliationRequest,
} from '../types/reconciliation.types'

/** Las dos bandejas de esta pestaña. La segunda no es un filtro: tiene ruta propia. */
export type ExternalScope = 'ALL' | 'MISSING_EXTERNAL'

/**
 * El cuadre con el facturador externo.
 *
 * <p><b>Dos listados, no uno con filtro.</b> `/missing-external` es una ruta
 * aparte del backend y aquí se respeta: los documentos devengados que nunca
 * recibieron factura son la bandeja de trabajo del cierre, y esconderlos detrás
 * de un desplegable de estado es como se llega a fin de año con ingresos
 * devengados sin facturar. `scope` cambia el cargador, no filtra en el cliente.
 *
 * <p>El estado compartido —el cuadre abierto— vive en el store; lo local a esta
 * instancia (qué bandeja se está mirando) es un `ref` dentro de la función, que
 * es lo que `CLAUDE.md` permite explícitamente.
 */
export function useExternalInvoiceReconciliations() {
  const store = useReconciliationStore()
  const { selectedExternal } = storeToRefs(store)
  const { success, info, errorFrom } = useToast()

  const scope = ref<ExternalScope>('ALL')

  const reconciliations = useServerPaged<ExternalInvoiceReconciliationResponse>(
    (page, pageSize, _query, signal) =>
      scope.value === 'MISSING_EXTERNAL'
        ? externalInvoiceReconciliationsApi.listMissingExternal(page, pageSize, signal)
        : externalInvoiceReconciliationsApi.listAll(page, pageSize, signal),
    { debounceMs: 0 },
  )

  async function setScope(value: ExternalScope) {
    if (scope.value === value) return
    scope.value = value
    store.setSelectedExternal(null)
    await reconciliations.reload()
  }

  /** Recarga siempre al abrir la pantalla: un cuadre de hace diez minutos ya es otro. */
  async function load() {
    await reconciliations.reload()
  }

  function select(reconciliation: ExternalInvoiceReconciliationResponse | null) {
    store.setSelectedExternal(reconciliation)
  }

  /**
   * Refresca la fila abierta con lo que devuelve el servidor y deja la tabla al
   * día. El veredicto lo calcula el backend, así que no se adivina a partir de lo
   * que se acaba de enviar.
   */
  async function refreshAfterWrite(updated: ExternalInvoiceReconciliationResponse) {
    store.setSelectedExternal(updated)
    await reconciliations.goTo(reconciliations.page.value)
  }

  async function open(companyId: number, payload: OpenExternalInvoiceReconciliationRequest) {
    try {
      const created = await externalInvoiceReconciliationsApi.create(companyId, payload)
      success('Cuadre abierto')
      await refreshAfterWrite(created)
      return created
    } catch (error) {
      errorFrom('Error al abrir el cuadre', error)
      throw error
    }
  }

  async function match(id: number, payload: MatchExternalInvoiceRequest) {
    try {
      const updated = await externalInvoiceReconciliationsApi.match(id, payload)
      success('Factura del emisor casada')
      await refreshAfterWrite(updated)
      return updated
    } catch (error) {
      errorFrom('Error al casar la factura del emisor', error)
      throw error
    }
  }

  async function resolve(id: number, payload: ResolveExternalInvoiceReconciliationRequest) {
    try {
      const updated = await externalInvoiceReconciliationsApi.resolve(id, payload)
      info('Cuadre resuelto y firmado')
      await refreshAfterWrite(updated)
      return updated
    } catch (error) {
      errorFrom('Error al resolver el cuadre', error)
      throw error
    }
  }

  return {
    reconciliations,
    scope,
    selectedExternal,
    setScope,
    load,
    select,
    open,
    match,
    resolve,
  }
}
