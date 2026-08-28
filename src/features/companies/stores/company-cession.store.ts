import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyBillingProfileResponse } from '../types/company-cession.types'

/**
 * <b>La cesión del contrato de la empresa que se está mirando</b>: quién es el
 * titular hoy y quiénes lo fueron antes.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del composable
 * —el patrón híbrido está prohibido (CLAUDE.md · «SIEMPRE Pinia»)—.
 *
 * <p><b>`companyId` se guarda para poder invalidar.</b> Al pasar de la empresa 41
 * a la 42 no puede quedar el titular de la anterior pintado mientras carga la
 * siguiente: en esta pantalla concreta eso sería enseñar el NIT de otra empresa
 * bajo el nombre de esta, y desde aquí se firma una cesión.
 *
 * <p><b>`missing` es un estado, no la ausencia de otro.</b> Una empresa sin
 * perfil de facturación responde 404 al titular vigente, y eso no es un fallo: es
 * que nunca se le abrió uno. Guardarlo aparte de `error` deja que la pantalla lo
 * diga con palabras —y que explique que lo que hace falta ahí no es ceder— en vez
 * de un banner rojo con una traza que no lleva a ninguna parte.
 *
 * <p><b>La serie se guarda entera con su página.</b> `history` es una página del
 * backend, no la lista completa, y `page`/`totalElements` viajan con ella: sin
 * eso, «se ha cedido 3 veces» sería en realidad «hay 3 en la página que estoy
 * viendo», que es una respuesta distinta y falsa en cuanto haya veinte.
 */
export const useCompanyCessionStore = defineStore('companyCession', () => {
  const companyId = ref<number | null>(null)
  const current = ref<CompanyBillingProfileResponse | null>(null)
  const missing = ref(false)

  const history = ref<CompanyBillingProfileResponse[]>([])
  /** Página 1-based, la que ve el operador. La conversión a base 0 la hace el composable. */
  const page = ref(1)
  const pageSize = ref(20)
  const totalElements = ref(0)
  const totalPages = ref(0)

  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  function setTarget(value: number | null) {
    companyId.value = value
  }

  function setCurrent(value: CompanyBillingProfileResponse | null) {
    current.value = value
    missing.value = value === null
  }

  function setMissing(value: boolean) {
    missing.value = value
    if (value) current.value = null
  }

  function setHistory(
    items: CompanyBillingProfileResponse[],
    nextPage: number,
    nextTotalElements: number,
    nextTotalPages: number,
  ) {
    history.value = items
    page.value = nextPage
    totalElements.value = nextTotalElements
    totalPages.value = nextTotalPages
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

  /** Deja la cesión en blanco. Se llama al abrir otra empresa y al desmontar. */
  function reset() {
    companyId.value = null
    current.value = null
    missing.value = false
    history.value = []
    page.value = 1
    totalElements.value = 0
    totalPages.value = 0
    loading.value = false
    saving.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    companyId,
    current,
    missing,
    history,
    page,
    pageSize,
    totalElements,
    totalPages,
    loading,
    saving,
    error,
    errorTraceId,
    setTarget,
    setCurrent,
    setMissing,
    setHistory,
    setLoading,
    setSaving,
    setError,
    reset,
  }
})
