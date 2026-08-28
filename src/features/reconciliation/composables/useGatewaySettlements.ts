import { storeToRefs } from 'pinia'
import { useServerPaged } from '@/composables/useServerPaged'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useReconciliationStore } from '../stores/reconciliation.store'
import { gatewaySettlementsApi } from '../api/reconciliation.api'
import type {
  AttachProviderInvoiceRequest,
  GatewaySettlementResponse,
  RegisterGatewaySettlementRequest,
} from '../types/reconciliation.types'

/**
 * Las liquidaciones de la pasarela.
 *
 * <p>⚠️ <b>El aislamiento se defiende aquí, no en la plantilla.</b> Un lote agrupa
 * los cobros de muchas clínicas. Esta consola es de plataforma y ve el agregado
 * — pero no existe, ni se añade, ninguna función que vaya del pago de un cliente
 * a su lote, ni que devuelva los pagos de un lote. La única forma de saber si el
 * lote trae lo que dice es {@link loadCount}, que devuelve <b>cuántos</b> y nunca
 * <b>cuáles</b>. Si alguna vez el contrato expone la lista, esa llamada no entra
 * en este composable sin una decisión explícita de producto.
 */
export function useGatewaySettlements() {
  const store = useReconciliationStore()
  const { selectedSettlement, settlementCounts, settlementCountErrors } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  const settlements = useServerPaged<GatewaySettlementResponse>(
    (page, pageSize, _query, signal) => gatewaySettlementsApi.listAll(page, pageSize, signal),
    { debounceMs: 0 },
  )

  /**
   * La cuenta de un lote. Se pide una vez por lote y se cachea en el store; los
   * fallos también se guardan, para que la fila diga «no se pudo contrastar» en
   * vez de quedarse en blanco pareciendo que cuadra.
   */
  async function loadCount(settlementId: number, force = false) {
    try {
      return await store.loadSettlementCount(
        settlementId,
        () => gatewaySettlementsApi.reconciliation(settlementId),
        force,
      )
    } catch (error) {
      store.setSettlementCountError(
        settlementId,
        getProblemDetailMessage(error, 'No se pudo contrastar la cuenta de este lote'),
      )
      return null
    }
  }

  /**
   * Recarga la tabla y vuelve a contrastar la página que se está mirando.
   *
   * <p>Las cuentas cacheadas se tiran antes: una cuenta de la página anterior es
   * una cuenta vieja, y una cuenta vieja que dice «cuadra» es peor que no tener
   * ninguna.
   */
  async function load() {
    store.clearSettlementCounts()
    await settlements.reload()
    await refreshCounts()
  }

  async function goTo(page: number) {
    await settlements.goTo(page)
    await refreshCounts()
  }

  /** Contrasta en paralelo los lotes de la página visible. */
  async function refreshCounts(force = false) {
    await Promise.all(settlements.items.value.map((settlement) => loadCount(settlement.id, force)))
  }

  function select(settlement: GatewaySettlementResponse | null) {
    store.setSelectedSettlement(settlement)
  }

  async function afterWrite(updated: GatewaySettlementResponse) {
    store.setSelectedSettlement(updated)
    await settlements.goTo(settlements.page.value)
    await loadCount(updated.id, true)
  }

  async function register(payload: RegisterGatewaySettlementRequest) {
    try {
      const created = await gatewaySettlementsApi.create(payload)
      success('Liquidación registrada')
      await afterWrite(created)
      return created
    } catch (error) {
      errorFrom('Error al registrar la liquidación', error)
      throw error
    }
  }

  async function attachProviderInvoice(id: number, payload: AttachProviderInvoiceRequest) {
    try {
      const updated = await gatewaySettlementsApi.attachProviderInvoice(id, payload)
      success('Factura de la pasarela adjuntada')
      await afterWrite(updated)
      return updated
    } catch (error) {
      errorFrom('Error al adjuntar la factura de la pasarela', error)
      throw error
    }
  }

  async function linkBankReceipt(id: number, bankReceiptId: number) {
    try {
      const updated = await gatewaySettlementsApi.linkBankReceipt(id, { bankReceiptId })
      success('Liquidación casada con el abono bancario')
      await afterWrite(updated)
      return updated
    } catch (error) {
      errorFrom('Error al casar la liquidación con el abono', error)
      throw error
    }
  }

  return {
    settlements,
    selectedSettlement,
    settlementCounts,
    settlementCountErrors,
    load,
    goTo,
    refreshCounts,
    loadCount,
    select,
    register,
    attachProviderInvoice,
    linkBankReceipt,
  }
}
