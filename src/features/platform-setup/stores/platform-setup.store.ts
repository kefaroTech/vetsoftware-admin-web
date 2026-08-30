import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PlatformSetupStep } from '../types/platform-setup.types'

/**
 * Estado de la puesta en marcha de la plataforma.
 *
 * Es estado **compartido entre pantallas** —el catálogo comercial, la lista de
 * contratos, el fallo del alta de una empresa y, cuando existan, las
 * cotizaciones pintan todos la misma lista—, así que vive en Pinia y no en un
 * `ref()` a nivel de módulo dentro del composable. Regla obligatoria del
 * CLAUDE.md de este repo, sin excepciones para estado nuevo.
 *
 * Aquí solo hay estado y setters: quien llama a la API y avisa es
 * `composables/usePlatformSetup.ts`, tal y como fija la convención (y como
 * explica `stores/createCatalogStore.ts` para los quince catálogos).
 *
 * **Sin caché con TTL, a propósito**, por la misma razón que `createCatalogStore`:
 * una lista de pasos servida de caché durante cinco minutos enseñaría «Pendiente»
 * justo después de completar el paso. `loading` hace de dedupe de las llamadas en
 * vuelo, que es lo único que hace falta cuando dos componentes se montan a la vez.
 */
export const usePlatformSetupStore = defineStore('platformSetup', () => {
  /** Vacío hasta la primera comprobación; nunca se pinta la lista sin sondear. */
  const steps = ref<PlatformSetupStep[]>([])
  const loading = ref(false)

  /**
   * Fallo que impidió sondear **todos** los pasos (no hay ninguno que pintar).
   * Un fallo de una sonda suelta no llega aquí: deja ese paso en `unknown` con su
   * motivo, que es información más útil que tirar la lista entera.
   */
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  /** Momento de la última comprobación, en ISO. `null` si no se ha hecho ninguna. */
  const checkedAt = ref<string | null>(null)

  function setSteps(data: PlatformSetupStep[], at: string) {
    steps.value = data
    checkedAt.value = at
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  return { steps, loading, error, errorTraceId, checkedAt, setSteps, setLoading, setError }
})
