import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SubscriptionResponse } from '@/features/subscriptions-admin/types/subscriptions-admin.types'
import type { CompanyAccessResponse } from '@/features/subscriptions-admin/types/entitlements.types'

/**
 * Lo que la pestaña <b>Resumen</b> del expediente de empresa (§I2) carga por su
 * cuenta: el contrato vigente y la consulta caliente de permisos y cupos.
 *
 * <p>Store de Pinia por la regla obligatoria del proyecto, y separado del store
 * del armazón por una razón concreta: la identidad de la empresa la necesitan las
 * diez sub-vistas y se carga una vez arriba; esto lo necesita <b>solo el
 * resumen</b> y se recarga cada vez que se abre esa pestaña. Mezclarlos obligaría
 * a las otras nueve a arrastrar dos peticiones que no usan.
 *
 * <p><b>Cada carga lleva su propio error.</b> No hay un `error` único: si
 * `/entitlements/access` falla, las tarjetas de cupos y acceso lo dicen y las de
 * contrato y cartera siguen sirviendo. Un error compartido convertiría el fallo
 * de una tarjeta en una pantalla vacía, que es justo lo que un operador con el
 * cliente al teléfono no puede permitirse.
 *
 * <p><b>`contractLoaded` existe porque `null` significa dos cosas.</b> «Todavía no
 * ha respondido» y «respondió que no hay contrato» son estados distintos y la
 * pantalla los dice distinto: uno es un esqueleto, el otro es la frase «esta
 * empresa no tiene contrato vigente». Sin esta bandera, la segunda se pinta
 * durante el medio segundo de la primera y el operador lee una mentira.
 */
export const useCompanySummaryStore = defineStore('companySummary', () => {
  const subscription = ref<SubscriptionResponse | null>(null)
  /** `true` cuando el servidor ya se pronunció sobre si hay contrato o no. */
  const contractLoaded = ref(false)
  const loadingContract = ref(false)
  const contractError = ref<string | null>(null)

  const access = ref<CompanyAccessResponse | null>(null)
  const loadingAccess = ref(false)
  const accessError = ref<string | null>(null)

  function setContract(value: SubscriptionResponse | null) {
    subscription.value = value
    contractLoaded.value = true
  }

  function setLoadingContract(value: boolean) {
    loadingContract.value = value
  }

  function setContractError(message: string | null) {
    contractError.value = message
  }

  function setAccess(value: CompanyAccessResponse | null) {
    access.value = value
  }

  function setLoadingAccess(value: boolean) {
    loadingAccess.value = value
  }

  function setAccessError(message: string | null) {
    accessError.value = message
  }

  /** Recarga siempre al abrir: lo de la empresa anterior no se queda pintado. */
  function reset() {
    subscription.value = null
    contractLoaded.value = false
    loadingContract.value = false
    contractError.value = null
    access.value = null
    loadingAccess.value = false
    accessError.value = null
  }

  return {
    subscription,
    contractLoaded,
    loadingContract,
    contractError,
    access,
    loadingAccess,
    accessError,
    setContract,
    setLoadingContract,
    setContractError,
    setAccess,
    setLoadingAccess,
    setAccessError,
    reset,
  }
})
