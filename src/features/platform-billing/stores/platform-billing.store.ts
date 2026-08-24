import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PriceListResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'
import type { PlatformBillingConfigResponse } from '../types/platform-billing.types'

/**
 * Por qué un fallo de carga se guarda entero y no como un `string`.
 *
 * <p>Cuando la fila única no existe, el backend responde **503** con un
 * `ProblemDetail` cuyo `detail` **enumera los pasos concretos que lo arreglan**
 * —incluido el `INSERT` exacto—. La pantalla tiene que enseñar ese texto tal
 * cual, y para decidir que estamos en ese caso hace falta el `code`, no la prosa.
 * Guardar solo el mensaje obligaría a parsearlo, y guardar solo un booleano
 * tiraría el remedio: las dos cosas son justamente lo que §3.7 prohíbe, porque si
 * el servidor enumera lo que falta y la pantalla dice otra cosa, el operador cree
 * que son dos problemas distintos.
 */
export interface PlatformBillingFailure {
  /** `detail` del `ProblemDetail`, literal. Nunca se reescribe ni se resume. */
  message: string
  /** `code` del `ProblemDetail`; es lo que distingue el 503 de cualquier otro fallo. */
  code: string | null
  /** `X-Trace-Id`, para que soporte pueda encontrar la petición en Grafana. */
  traceId: string | null
}

/**
 * Estado de la pantalla de facturación de plataforma.
 *
 * <p>Regla obligatoria del proyecto: todo estado compartido vive en un store de
 * Pinia. Aquí no hay ni un `ref()` a nivel de módulo — el patrón híbrido está
 * prohibido y no se hace excepción por ser una pantalla pequeña. El paginador de
 * las series de numeración sí usa refs locales, pero dentro de `useServerPaged`,
 * que es estado **por instancia** del componente y no estado de aplicación.
 */
export const usePlatformBillingStore = defineStore('platform-billing', () => {
  const config = ref<PlatformBillingConfigResponse | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const failure = ref<PlatformBillingFailure | null>(null)

  /** Tarifas candidatas a «por defecto». Se filtran a `PUBLISHED` en el composable. */
  const priceLists = ref<PriceListResponse[]>([])
  const priceListsLoading = ref(false)
  const priceListsError = ref<string | null>(null)

  function setConfig(value: PlatformBillingConfigResponse | null) {
    config.value = value
  }
  function setLoading(value: boolean) {
    loading.value = value
  }
  function setSaving(value: boolean) {
    saving.value = value
  }
  function setFailure(value: PlatformBillingFailure | null) {
    failure.value = value
  }
  function setPriceLists(value: PriceListResponse[]) {
    priceLists.value = value
  }
  function setPriceListsLoading(value: boolean) {
    priceListsLoading.value = value
  }
  function setPriceListsError(value: string | null) {
    priceListsError.value = value
  }

  return {
    config,
    loading,
    saving,
    failure,
    priceLists,
    priceListsLoading,
    priceListsError,
    setConfig,
    setLoading,
    setSaving,
    setFailure,
    setPriceLists,
    setPriceListsLoading,
    setPriceListsError,
  }
})
