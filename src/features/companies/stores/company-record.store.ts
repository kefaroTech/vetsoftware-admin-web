import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyResponse } from '../types/companies.types'

/**
 * <b>El expediente de empresa abierto</b>: qué empresa se está mirando y el
 * resultado de su carga.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del composable
 * —el patrón híbrido está prohibido (CLAUDE.md · «Regla obligatoria: SIEMPRE
 * Pinia»)— y además <b>tiene que ser compartido</b>: el armazón lo carga una vez
 * y las diez sub-vistas lo leen. Sin store, cada sub-vista repetiría
 * `GET /companies/{id}` al montarse y la cabecera parpadearía en cada cambio de
 * pestaña.
 *
 * <p><b>Por qué no se reutiliza `companies.store.ts`.</b> Ese guarda `selected`
 * para la ficha de edición y lo carga con `useCompanies().fetchById`, que no
 * aborta la petición en vuelo, no limpia lo anterior antes de pedir lo nuevo y no
 * guarda el error —solo lanza un toast—. Para un armazón las tres cosas son
 * necesarias: sin abortar, la respuesta de la empresa 41 puede llegar después de
 * la de la 42 y pisarla; sin limpiar, la cabecera enseña el nombre de una empresa
 * mientras el `RouterView` de abajo ya está pidiendo los datos de otra; sin error
 * guardado, un 403 deja la pantalla en blanco sin explicación. `companies.store`
 * se queda intacto para la lista y el formulario.
 *
 * <p><b>`companyId` se guarda aparte de la empresa cargada, a propósito.</b> Es
 * el valor que viene de la URL y el que viaja en la cabecera `X-Company-Id` de
 * las llamadas del resumen; `company.id` es lo que el servidor respondió. Son dos
 * cosas distintas y confundirlas es cómo se acaba leyendo una empresa mientras la
 * pantalla enseña otra.
 */
export const useCompanyRecordStore = defineStore('companyRecord', () => {
  const companyId = ref<number | null>(null)
  const company = ref<CompanyResponse | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  function setTarget(value: number | null) {
    companyId.value = value
  }

  function setCompany(value: CompanyResponse | null) {
    company.value = value
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null, traceId: string | null = null) {
    error.value = message
    errorTraceId.value = traceId
  }

  /** Deja el expediente vacío al salir: nada de una empresa ajena pintada mientras carga otra. */
  function reset() {
    companyId.value = null
    company.value = null
    loading.value = false
    error.value = null
    errorTraceId.value = null
  }

  return {
    companyId,
    company,
    loading,
    error,
    errorTraceId,
    setTarget,
    setCompany,
    setLoading,
    setError,
    reset,
  }
})
