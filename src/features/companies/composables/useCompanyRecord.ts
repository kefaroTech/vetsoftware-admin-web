import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { companiesApi } from '../api/companies.api'
import { useCompanyRecordStore } from '../stores/company-record.store'
import type { CompanyResponse } from '../types/companies.types'

/**
 * <b>La API estable del expediente de empresa, y el punto de extensión de las
 * sub-vistas que faltan.</b>
 *
 * <p>El armazón (`CompanyRecordLayout.vue`) es el único que llama a
 * `openRecord()`. Una sub-vista <b>no vuelve a cargar la empresa</b>: llama a
 * `useCompanyRecord()` y lee `companyId` y `company`, que ya están puestos cuando
 * ella se monta, porque el armazón no monta el `RouterView` hasta entonces. Lo
 * que sí hace cada sub-vista es cargar <b>lo suyo</b> en su propio store y su
 * propio composable, y pasar ese mismo `companyId` a su cliente de API para que
 * la cabecera `X-Company-Id` viaje también en sus llamadas.
 *
 * <p>Lo que este composable garantiza a quien lo consume:
 *
 * <ol>
 *   <li>`companyId` no es `null` mientras el expediente esté pintado.</li>
 *   <li>`company` es la empresa de la URL, comprobada contra la que devolvió el
 *       servidor. Si no casan, el expediente no se pinta.</li>
 *   <li>`setCompany` deja al día la cabecera tras una escritura, sin recargar:
 *       lo usa `/datos` cuando el formulario guarda.</li>
 * </ol>
 *
 * <p>Nada de `ref()` a nivel de módulo: el estado compartido vive en
 * `company-record.store.ts` y aquí solo hay referencias locales a esta llamada de
 * la función —los dos `AbortController`—, que es estado por instancia y no
 * singleton.
 */
export function useCompanyRecord() {
  const store = useCompanyRecordStore()
  const { companyId, company, loading, error, errorTraceId } = storeToRefs(store)

  // Por instancia del composable, no singleton de módulo.
  let request: AbortController | null = null

  /**
   * El nombre si cargó; si no, el número, que es el dato fiable. Nunca un hueco
   * mudo: es lo que identifica sobre qué empresa se está trabajando.
   */
  const title = computed(() => company.value?.name ?? `Empresa #${companyId.value ?? '—'}`)

  /**
   * Abre el expediente. <b>Recarga siempre</b>, y limpia lo anterior antes de
   * pedir lo nuevo: dejar pintada la empresa que se estaba mirando mientras carga
   * otra es la forma de que alguien edite la equivocada.
   */
  async function openRecord(nextCompanyId: number) {
    request?.abort()
    const controller = new AbortController()
    request = controller

    store.setTarget(nextCompanyId)
    store.setCompany(null)
    store.setError(null)
    store.setLoading(true)

    try {
      const result = await companiesApi.findById(nextCompanyId)
      if (controller.signal.aborted) return

      // Defensa en profundidad. El backend resuelve por id, así que esto no
      // debería darse nunca; si algún día devolviera otra cosa, el expediente
      // prefiere no pintarse a enseñar la cabecera de una empresa mientras las
      // sub-vistas leen los datos de otra.
      if (result.id !== nextCompanyId) {
        store.setError(
          `El servidor devolvió la empresa #${result.id} y la URL pide la #${nextCompanyId}. Ábrela desde la lista de empresas.`,
        )
        return
      }

      store.setCompany(result)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // El mensaje sale del `ProblemDetail` del backend —un 403 dice que no
      // tienes permiso y un 404 que no existe— y nunca se escribe a mano: hacerlo
      // tira la traza con la que se encuentra la petición en Grafana.
      store.setError(
        getProblemDetailMessage(err, 'No se pudo cargar la empresa'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (request === controller) {
        store.setLoading(false)
        request = null
      }
    }
  }

  /** Refresca la cabecera tras una escritura de `/datos`, sin volver a pedir nada. */
  function setCompany(value: CompanyResponse) {
    store.setCompany(value)
  }

  onUnmounted(() => request?.abort())

  return {
    companyId,
    company,
    title,
    loading,
    error,
    errorTraceId,
    openRecord,
    setCompany,
    closeRecord: store.reset,
  }
}
