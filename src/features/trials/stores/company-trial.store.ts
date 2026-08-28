import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyTrialGrantResponse, CompanyTrialWindowResponse } from '../types/trials.types'

/**
 * <b>La prueba de la empresa que se está mirando</b>: su ventana y sus
 * concesiones.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del
 * composable —el patrón híbrido está prohibido (CLAUDE.md · «Manejo de estado:
 * SIEMPRE Pinia»)— y además <b>tiene que ser compartido</b>: la misma ventana la
 * leen la pestaña «Prueba» del expediente de empresa y la pestaña «Prueba» del
 * expediente del contrato, que son dos pantallas distintas de dos features
 * distintas contando lo mismo. Sin store, cada una repetiría las dos llamadas y
 * podrían llegar a enseñar dos verdades diferentes de la misma empresa.
 *
 * <p><b>`windowMissing` es un estado, no la ausencia de otro.</b> Una empresa que
 * nunca ha estado en prueba responde 404 a `/current`, y eso no es un fallo: es
 * la respuesta. Guardarlo aparte de `error` es lo que permite a la pantalla decir
 * «esta empresa no tiene ventana de prueba» —con su botón de abrirla— en vez de
 * un banner rojo con una traza que no lleva a ninguna parte.
 *
 * <p><b>`companyId` se guarda para poder invalidar.</b> Al pasar de la empresa 41
 * a la 42 no puede quedar ni una concesión de la anterior pintada mientras carga
 * la siguiente: es exactamente cómo se acaba abriendo una ventana de prueba a
 * quien no la compró.
 */
export const useCompanyTrialStore = defineStore('companyTrial', () => {
  const companyId = ref<number | null>(null)
  const window = ref<CompanyTrialWindowResponse | null>(null)
  const windowMissing = ref(false)
  const grants = ref<CompanyTrialGrantResponse[]>([])

  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  function setTarget(value: number | null) {
    companyId.value = value
  }

  function setWindow(value: CompanyTrialWindowResponse | null) {
    window.value = value
    windowMissing.value = value === null
  }

  function setWindowMissing(value: boolean) {
    windowMissing.value = value
    if (value) window.value = null
  }

  function setGrants(value: CompanyTrialGrantResponse[]) {
    grants.value = value
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

  /** Deja la prueba en blanco. Se llama al abrir otra empresa y al desmontar. */
  function reset() {
    companyId.value = null
    window.value = null
    windowMissing.value = false
    grants.value = []
    loading.value = false
    saving.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    companyId,
    window,
    windowMissing,
    grants,
    loading,
    saving,
    error,
    errorTraceId,
    setTarget,
    setWindow,
    setWindowMissing,
    setGrants,
    setLoading,
    setSaving,
    setError,
    reset,
  }
})
