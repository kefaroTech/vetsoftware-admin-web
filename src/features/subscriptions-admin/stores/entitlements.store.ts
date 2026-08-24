import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emptyPage, type PageResponse } from '@/types/pagination'
import type {
  CompanyAccessResponse,
  CompanyEntitlementResponse,
  EntitlementScope,
} from '../types/entitlements.types'

/**
 * Estado de `/acceso`: la foto del acceso vigente, el listado de auditoría y en
 * cuál de los dos está mirando el operador.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del
 * composable: el patrón híbrido está prohibido (CLAUDE.md) <b>sin excepciones
 * para estado nuevo</b>. Y aquí además hace falta que sea compartido: el modo
 * (`scope`) tiene que sobrevivir a un recálculo, que repinta la vista entera, y
 * la tabla de auditoría tiene que conservar su página mientras se confirma el
 * diálogo.
 *
 * <p><b>`loadedCompanyId` no es decorativo.</b> Los tres endpoints resuelven la
 * empresa con la cabecera `X-Company-Id`, así que lo que hay aquí dentro no lleva
 * escrito de quién es. Guardar de qué empresa se cargó es lo que permite tirarlo
 * al abrir el expediente de otra en vez de enseñar los permisos de la anterior
 * mientras llegan los nuevos — que en esta pantalla concreta sería enseñar los
 * permisos de una clínica bajo la cabecera de otra.
 */
export const useEntitlementsStore = defineStore('subscriptionEntitlements', () => {
  const loadedCompanyId = ref<number | null>(null)

  /** `GET /entitlements/access`: lo que puede usar ahora mismo, con sus contadores. */
  const access = ref<CompanyAccessResponse | null>(null)
  /** `GET /entitlements`: el listado de auditoría, con los caducados y los ocultos. */
  const audit = ref<PageResponse<CompanyEntitlementResponse>>(emptyPage())

  const scope = ref<EntitlementScope>('current')

  const loadingAccess = ref(false)
  const loadingAudit = ref(false)
  const recalculating = ref(false)

  const accessError = ref<string | null>(null)
  const accessErrorTraceId = ref<string | null>(null)
  const auditError = ref<string | null>(null)
  const auditErrorTraceId = ref<string | null>(null)

  function setLoadedCompanyId(value: number | null) {
    loadedCompanyId.value = value
  }

  function setAccess(value: CompanyAccessResponse | null) {
    access.value = value
  }

  function setAudit(value: PageResponse<CompanyEntitlementResponse>) {
    audit.value = value
  }

  function setScope(value: EntitlementScope) {
    scope.value = value
  }

  function setLoadingAccess(value: boolean) {
    loadingAccess.value = value
  }

  function setLoadingAudit(value: boolean) {
    loadingAudit.value = value
  }

  function setRecalculating(value: boolean) {
    recalculating.value = value
  }

  function setAccessError(message: string | null, traceId: string | null = null) {
    accessError.value = message
    accessErrorTraceId.value = traceId
  }

  function setAuditError(message: string | null, traceId: string | null = null) {
    auditError.value = message
    auditErrorTraceId.value = traceId
  }

  /**
   * Deja la sub-vista vacía. `scope` <b>no</b> se toca: es una preferencia de
   * lectura del operador, no un dato de la empresa, y devolverlo a «hoy» cada vez
   * que se abre otro expediente es pelearse con quien está auditando varias
   * empresas seguidas.
   */
  function reset() {
    loadedCompanyId.value = null
    access.value = null
    audit.value = emptyPage()
    loadingAccess.value = false
    loadingAudit.value = false
    recalculating.value = false
    accessError.value = null
    accessErrorTraceId.value = null
    auditError.value = null
    auditErrorTraceId.value = null
  }

  return {
    loadedCompanyId,
    access,
    audit,
    scope,
    loadingAccess,
    loadingAudit,
    recalculating,
    accessError,
    accessErrorTraceId,
    auditError,
    auditErrorTraceId,
    setLoadedCompanyId,
    setAccess,
    setAudit,
    setScope,
    setLoadingAccess,
    setLoadingAudit,
    setRecalculating,
    setAccessError,
    setAuditError,
    reset,
  }
})
