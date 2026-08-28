import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  BankReceiptResponse,
  ExternalInvoiceReconciliationResponse,
  GatewaySettlementReconciliationResponse,
  GatewaySettlementResponse,
} from '../types/reconciliation.types'

/**
 * Estado de la conciliación, compartido por las tres pestañas de
 * `/conciliacion`.
 *
 * <p><b>Por qué un store y no `ref` en el composable.</b> Aparte de la regla
 * obligatoria del repositorio, hay una razón funcional: la cuenta de cada lote
 * —cuántos cobros declara y cuántos hay atados— sale de una llamada por lote, y
 * la tabla de liquidaciones pinta veinte por página. Sin caché, cambiar de
 * pestaña y volver dispara veinte peticiones que ya se hicieron; y con dos filas
 * pidiendo la misma cuenta a la vez —la tabla y el detalle abierto— salen dos
 * llamadas idénticas. El par «mapa + promesa en vuelo» es el mismo patrón de
 * caché de catálogo que ya usa `commercial-catalog.store.ts`.
 *
 * <p>Los extractos sin identificar se cachean por lo mismo: son el desplegable
 * del modal que casa un lote con su abono, y ese modal se abre una vez por cada
 * lote sin casar.
 */
export const useReconciliationStore = defineStore('reconciliation', () => {
  // --- Cuadre con el facturador externo ----------------------------------
  /** El cuadre abierto en el detalle. `null` = no hay ninguno abierto. */
  const selectedExternal = ref<ExternalInvoiceReconciliationResponse | null>(null)

  // --- Liquidaciones de la pasarela --------------------------------------
  const selectedSettlement = ref<GatewaySettlementResponse | null>(null)

  /** La cuenta de cada lote, indexada por id de liquidación. */
  const settlementCounts = ref<Record<number, GatewaySettlementReconciliationResponse>>({})
  const settlementCountErrors = ref<Record<number, string>>({})

  /**
   * Las cuentas que se están pidiendo ahora mismo. No es estado que la pantalla
   * lea: es lo que impide que dos consumidores de la misma cuenta disparen dos
   * peticiones. Por eso es un `Map` normal y no un `ref`.
   */
  const inflightCounts = new Map<number, Promise<GatewaySettlementReconciliationResponse>>()

  // --- Extractos bancarios sin identificar (el desplegable del enlace) ----
  const unidentifiedReceipts = ref<BankReceiptResponse[]>([])
  const unidentifiedLoaded = ref(false)
  const unidentifiedLoading = ref(false)
  const unidentifiedError = ref<string | null>(null)
  const unidentifiedTraceId = ref<string | null>(null)
  let unidentifiedPromise: Promise<BankReceiptResponse[]> | null = null

  const unidentifiedById = computed(
    () => new Map(unidentifiedReceipts.value.map((receipt) => [receipt.id, receipt])),
  )

  function setSelectedExternal(value: ExternalInvoiceReconciliationResponse | null) {
    selectedExternal.value = value
  }

  function setSelectedSettlement(value: GatewaySettlementResponse | null) {
    selectedSettlement.value = value
  }

  /**
   * Trae la cuenta de un lote, una sola vez.
   *
   * <p>`force` la vuelve a pedir: se usa al casar un abono o al registrar un
   * cobro, cuando la cuenta guardada ya no describe el lote.
   */
  async function loadSettlementCount(
    settlementId: number,
    loader: () => Promise<GatewaySettlementReconciliationResponse>,
    force = false,
  ): Promise<GatewaySettlementReconciliationResponse> {
    const cached = settlementCounts.value[settlementId]
    if (!force && cached) return cached

    const inflight = inflightCounts.get(settlementId)
    if (inflight) return inflight

    const promise = loader()
      .then((result) => {
        settlementCounts.value = { ...settlementCounts.value, [settlementId]: result }
        const { [settlementId]: _dropped, ...rest } = settlementCountErrors.value
        settlementCountErrors.value = rest
        return result
      })
      .finally(() => {
        inflightCounts.delete(settlementId)
      })
    inflightCounts.set(settlementId, promise)
    return promise
  }

  function setSettlementCountError(settlementId: number, message: string) {
    settlementCountErrors.value = { ...settlementCountErrors.value, [settlementId]: message }
  }

  /** Se vacía al recargar la tabla: una cuenta de la página anterior es una cuenta vieja. */
  function clearSettlementCounts() {
    settlementCounts.value = {}
    settlementCountErrors.value = {}
    inflightCounts.clear()
  }

  async function loadUnidentifiedReceipts(
    loader: () => Promise<BankReceiptResponse[]>,
    force = false,
  ): Promise<BankReceiptResponse[]> {
    if (!force && unidentifiedLoaded.value) return unidentifiedReceipts.value
    if (unidentifiedPromise) return unidentifiedPromise

    unidentifiedLoading.value = true
    unidentifiedError.value = null
    unidentifiedTraceId.value = null
    unidentifiedPromise = loader()
      .then((receipts) => {
        unidentifiedReceipts.value = receipts
        unidentifiedLoaded.value = true
        return receipts
      })
      .finally(() => {
        unidentifiedLoading.value = false
        unidentifiedPromise = null
      })
    return unidentifiedPromise
  }

  function setUnidentifiedError(message: string | null, traceId: string | null = null) {
    unidentifiedError.value = message
    unidentifiedTraceId.value = traceId
  }

  return {
    selectedExternal,
    selectedSettlement,
    settlementCounts,
    settlementCountErrors,
    unidentifiedReceipts,
    unidentifiedById,
    unidentifiedLoaded,
    unidentifiedLoading,
    unidentifiedError,
    unidentifiedTraceId,
    setSelectedExternal,
    setSelectedSettlement,
    loadSettlementCount,
    setSettlementCountError,
    clearSettlementCounts,
    loadUnidentifiedReceipts,
    setUnidentifiedError,
  }
})
