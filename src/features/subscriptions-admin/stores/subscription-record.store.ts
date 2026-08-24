import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyResponse } from '@/features/companies/types/companies.types'
import type { SubscriptionResponse } from '../types/subscriptions-admin.types'

/**
 * Estado del expediente abierto: el contrato, la empresa sobre la que se está
 * actuando, y el resultado de las dos cargas.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del
 * composable —el patrón híbrido está prohibido (CLAUDE.md)— y además <b>tiene
 * que ser compartido</b>: el armazón lo carga una vez y las seis sub-vistas lo
 * leen. Sin store, cada sub-vista repetiría `GET /subscriptions/{id}` y
 * `GET /companies/{companyId}` al montarse.
 *
 * <p><b>`companyId` se guarda aparte del contrato a propósito.</b> Es el valor
 * que viene de la URL y es el que viaja en la cabecera `X-Company-Id`; el
 * `subscription.companyId` es lo que el servidor respondió. Son dos cosas
 * distintas y confundirlas es cómo se acabaría mandando la cabecera de una
 * empresa mientras la pantalla muestra otra. El armazón carga con el de la URL y
 * comprueba que el servidor devuelve el mismo.
 */
export const useSubscriptionRecordStore = defineStore('subscriptionRecord', () => {
  const companyId = ref<number | null>(null)
  const subscriptionId = ref<number | null>(null)
  const subscription = ref<SubscriptionResponse | null>(null)
  const company = ref<CompanyResponse | null>(null)

  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)
  /** El nombre de la empresa es una ayuda: si falla, el expediente se pinta igual. */
  const companyError = ref<string | null>(null)

  function setTarget(nextCompanyId: number | null, nextSubscriptionId: number | null) {
    companyId.value = nextCompanyId
    subscriptionId.value = nextSubscriptionId
  }

  function setSubscription(value: SubscriptionResponse | null) {
    subscription.value = value
  }

  function setCompany(value: CompanyResponse | null) {
    company.value = value
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setSaving(value: boolean) {
    saving.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  function setCompanyError(message: string | null) {
    companyError.value = message
  }

  /** Deja el expediente vacío al salir: nada de un contrato ajeno pintado mientras carga otro. */
  function reset() {
    setTarget(null, null)
    subscription.value = null
    company.value = null
    error.value = null
    errorTraceId.value = null
    companyError.value = null
    loading.value = false
    saving.value = false
  }

  return {
    companyId,
    subscriptionId,
    subscription,
    company,
    loading,
    saving,
    error,
    errorTraceId,
    companyError,
    setTarget,
    setSubscription,
    setCompany,
    setLoading,
    setSaving,
    setError,
    setCompanyError,
    reset,
  }
})
