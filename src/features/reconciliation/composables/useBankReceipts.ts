import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useServerPaged } from '@/composables/useServerPaged'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { formatCurrency, formatDate } from '@/composables/format'
import { useReconciliationStore } from '../stores/reconciliation.store'
import { bankReceiptsApi } from '../api/reconciliation.api'
import type { BankReceiptResponse, RegisterBankReceiptRequest } from '../types/reconciliation.types'

/** Las dos bandejas del extracto. La segunda tiene ruta propia en el backend. */
export type BankReceiptScope = 'ALL' | 'UNIDENTIFIED'

/** Cuántos abonos sin identificar se traen para el desplegable del enlace. */
const UNIDENTIFIED_PAGE_SIZE = 200

/**
 * Los extractos bancarios: lo que de verdad entró en la cuenta.
 *
 * <p>Expone dos cosas distintas y conviene no confundirlas: la <b>tabla</b>
 * paginada de la pestaña, y la <b>lista cacheada</b> de abonos sin identificar que
 * alimenta el desplegable con el que un lote se casa con su abono. La segunda
 * sigue el patrón de catálogo del repositorio —lista + promesa en vuelo en el
 * store— porque el modal se abre una vez por cada lote sin casar y sin caché eso
 * son veinte peticiones idénticas por página.
 */
export function useBankReceipts() {
  const store = useReconciliationStore()
  const {
    unidentifiedReceipts,
    unidentifiedById,
    unidentifiedLoading,
    unidentifiedError,
    unidentifiedTraceId,
  } = storeToRefs(store)
  const { success, info, errorFrom } = useToast()

  const scope = ref<BankReceiptScope>('ALL')

  const receipts = useServerPaged<BankReceiptResponse>(
    (page, pageSize, _query, signal) =>
      scope.value === 'UNIDENTIFIED'
        ? bankReceiptsApi.listUnidentified(page, pageSize, signal)
        : bankReceiptsApi.listAll(page, pageSize, signal),
    { debounceMs: 0 },
  )

  /**
   * Lo que se lee en el desplegable: fecha, importe con su signo y referencia.
   * Casar un lote con el abono equivocado es mover dinero de sitio, así que la
   * opción lleva los tres datos con los que se distingue y no solo el número.
   */
  const unidentifiedOptions = computed(() =>
    unidentifiedReceipts.value.map((receipt) => ({
      value: receipt.id,
      label: `${formatDate(receipt.receivedOn)} · ${formatCurrency(receipt.amount)} · ${receipt.bankReference}`,
    })),
  )

  async function setScope(value: BankReceiptScope) {
    if (scope.value === value) return
    scope.value = value
    await receipts.reload()
  }

  async function load() {
    await receipts.reload()
  }

  async function loadUnidentified(force = false) {
    try {
      await store.loadUnidentifiedReceipts(async () => {
        const items: BankReceiptResponse[] = []
        let page = 0
        let totalPages = 1
        while (page < totalPages) {
          const result = await bankReceiptsApi.listUnidentified(page, UNIDENTIFIED_PAGE_SIZE)
          items.push(...result.content)
          totalPages = result.totalPages
          page += 1
        }
        return items
      }, force)
      store.setUnidentifiedError(null)
    } catch (error) {
      store.setUnidentifiedError(
        getProblemDetailMessage(error, 'No se pudieron cargar los abonos sin identificar'),
        getTraceId(error) ?? null,
      )
      errorFrom('Error al cargar los abonos sin identificar', error)
      throw error
    }
  }

  async function afterWrite() {
    await Promise.all([receipts.goTo(receipts.page.value), loadUnidentified(true)])
  }

  async function register(payload: RegisterBankReceiptRequest) {
    try {
      const created = await bankReceiptsApi.create(payload)
      success('Abono registrado')
      await afterWrite()
      return created
    } catch (error) {
      errorFrom('Error al registrar el abono', error)
      throw error
    }
  }

  async function identify(id: number) {
    try {
      const updated = await bankReceiptsApi.identify(id)
      success('Abono marcado como identificado')
      await afterWrite()
      return updated
    } catch (error) {
      errorFrom('Error al identificar el abono', error)
      throw error
    }
  }

  async function discard(id: number) {
    try {
      const updated = await bankReceiptsApi.discard(id)
      info('Abono descartado')
      await afterWrite()
      return updated
    } catch (error) {
      errorFrom('Error al descartar el abono', error)
      throw error
    }
  }

  return {
    receipts,
    scope,
    unidentifiedReceipts,
    unidentifiedById,
    unidentifiedOptions,
    unidentifiedLoading,
    unidentifiedError,
    unidentifiedTraceId,
    setScope,
    load,
    loadUnidentified,
    register,
    identify,
    discard,
  }
}
