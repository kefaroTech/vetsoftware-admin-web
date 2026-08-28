import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { customerCreditApi } from '../api/customer-credit.api'
import { useMoneyCircuitStore } from '../stores/money-circuit.store'
import { horizonDate, useMoneyList } from './moneyCircuitList'
import {
  CREDIT_EXPIRY_WARNING_DAYS,
  type ConsumeCustomerCreditRequest,
  type CustomerCreditBalanceResponse,
  type CustomerCreditEntryResponse,
  type GrantCustomerCreditRequest,
} from '../types/customer-credit.types'

/**
 * <b>Saldo a favor</b>: saldos consolidados, movimientos, lotes por caducar y las
 * tres escrituras.
 *
 * <p>El estado vive en el store de Pinia y se lee con `storeToRefs`; no hay ninguna
 * `ref()` a nivel de módulo.
 *
 * <p><b>Consumir devuelve varios movimientos, no uno.</b> El saldo es una pila de
 * lotes y el servidor salda empezando por el que antes caduca, así que un consumo
 * de 100.000 puede tocar tres lotes. La lista que devuelve se guarda entera en el
 * store para poder enseñarla: quedarse con el primero haría creer que se gastó un
 * lote cuando se gastaron tres, y el cliente lo descubriría el mes siguiente.
 */
export function useCustomerCredit() {
  const store = useMoneyCircuitStore()
  const { balances, entries, entriesExpiring, companyFilter, saving, lastLotMovements } =
    storeToRefs(store)
  const { errorFrom, success, info } = useToast()

  const balancesList = useMoneyList<CustomerCreditBalanceResponse>(
    'balances',
    balances,
    store.setBalances,
    (page, pageSize, signal) => customerCreditApi.listAllBalances(page, pageSize, signal),
    'No se pudieron cargar los saldos a favor',
  )

  const entriesList = useMoneyList<CustomerCreditEntryResponse>(
    'entries',
    entries,
    store.setEntries,
    (page, pageSize, signal) =>
      customerCreditApi.listAllEntries(page, pageSize, companyFilter.value.entries, signal),
    'No se pudieron cargar los movimientos de saldo',
  )

  const expiringList = useMoneyList<CustomerCreditEntryResponse>(
    'entriesExpiring',
    entriesExpiring,
    store.setEntriesExpiring,
    (page, pageSize, signal) =>
      customerCreditApi.listExpiring(
        horizonDate(CREDIT_EXPIRY_WARNING_DAYS),
        page,
        pageSize,
        signal,
      ),
    'No se pudieron cargar los lotes por caducar',
  )

  async function reloadAll() {
    await Promise.all([balancesList.reload(), entriesList.reload(), expiringList.reload()])
  }

  async function grant(companyId: number, payload: GrantCustomerCreditRequest): Promise<boolean> {
    store.setSaving('grant', true)
    try {
      const created = await customerCreditApi.grant(companyId, payload)
      store.setLastLotMovements([created])
      success(
        'Lote de saldo a favor abierto',
        created.expiresOn
          ? 'Caduca el ' + created.expiresOn + ': si no se consume antes, el cliente lo pierde.'
          : 'Sin fecha de caducidad.',
      )
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo conceder el saldo a favor', error)
      return false
    } finally {
      store.setSaving('grant', false)
    }
  }

  /**
   * Consume saldo contra un documento.
   *
   * <p>El aviso dice <b>cuántos lotes se tocaron</b> porque es el dato que el
   * operador no puede deducir: pidió un importe y el servidor decidió de dónde
   * salía, empezando por el que antes caducaba.
   */
  async function consume(
    companyId: number,
    payload: ConsumeCustomerCreditRequest,
  ): Promise<boolean> {
    store.setSaving('consume', true)
    try {
      const movements = await customerCreditApi.consume(companyId, payload)
      store.setLastLotMovements(movements)
      success(
        'Saldo aplicado',
        movements.length === 1
          ? 'Salió de un solo lote.'
          : `Se repartió entre ${movements.length} lotes, empezando por el que antes caducaba.`,
      )
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudo aplicar el saldo a favor', error)
      return false
    } finally {
      store.setSaving('consume', false)
    }
  }

  /**
   * Cierra los lotes ya vencidos de una empresa.
   *
   * <p>Una lista vacía no es un fallo: significa que no había ninguno vencido, y se
   * dice con un aviso informativo. Pintarlo como error mandaría a alguien a
   * reintentar una operación que hizo exactamente lo que debía.
   */
  async function expire(companyId: number): Promise<boolean> {
    store.setSaving('expire', true)
    try {
      const movements = await customerCreditApi.expire(companyId)
      store.setLastLotMovements(movements)
      if (movements.length === 0) {
        info(
          'No había ningún lote vencido',
          'No se cerró nada: el saldo de la empresa sigue igual.',
        )
      } else {
        success(
          `Se cerraron ${movements.length} lotes vencidos`,
          'Ese saldo ya no está disponible para el cliente.',
        )
      }
      await reloadAll()
      return true
    } catch (error: unknown) {
      errorFrom('No se pudieron cerrar los lotes vencidos', error)
      return false
    } finally {
      store.setSaving('expire', false)
    }
  }

  return {
    balancesList,
    entriesList,
    expiringList,
    lastLotMovements,
    savingGrant: computed(() => saving.value.grant),
    savingConsume: computed(() => saving.value.consume),
    savingExpire: computed(() => saving.value.expire),
    companyId: computed(() => companyFilter.value.entries),
    applyCompanyFilter(companyId: number | null) {
      store.setCompanyFilter('entries', companyId)
      return entriesList.reload()
    },
    reloadAll,
    grant,
    consume,
    expire,
  }
}
