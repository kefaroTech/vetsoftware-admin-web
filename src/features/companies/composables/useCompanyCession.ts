import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { companyCessionApi } from '../api/company-cession.api'
import { useCompanyCessionStore } from '../stores/company-cession.store'
import { businessToday, holderState, isCurrentHolder } from './companyCessionText'
import type { SucceedCompanyBillingProfileRequest } from '../types/company-cession.types'

/**
 * <b>La API estable de la cesión del contrato</b> (§I11, D-62).
 *
 * <p>Aquí viven las llamadas y los avisos; el estado compartido está en
 * `company-cession.store.ts` y las reglas puras en `companyCessionText.ts`. Lo
 * único local a esta instancia es el `AbortController` —estado por instancia, no
 * singleton de módulo.
 *
 * <p><b>Recarga siempre al abrir la pantalla</b> (regla del expediente). Aquí
 * importa más que en otras: desde esta pestaña se firma una cesión, y hacerlo
 * contra un titular en caché es firmarla contra quien ya no lo es.
 */
export function useCompanyCession() {
  const store = useCompanyCessionStore()
  const {
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
  } = storeToRefs(store)
  const toast = useToast()

  // Por instancia del composable, no singleton de módulo.
  let request: AbortController | null = null

  /**
   * El día del negocio, no el del navegador. Se calcula una vez por carga y se
   * pasa a las funciones puras: así todas las filas se comparan contra el mismo
   * «hoy» aunque la pestaña quede abierta cruzando la medianoche.
   */
  const today = computed(() => businessToday())

  /** La serie de titulares con su estado ya resuelto, del más reciente al más antiguo. */
  const holderRows = computed(() =>
    [...history.value]
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom))
      .map((profile) => ({ profile, state: holderState(profile, today.value) })),
  )

  /**
   * <b>Cuántas veces se ha cedido este contrato.</b> Es `totalElements − 1`: el
   * primer titular no llegó por una cesión, llegó por el alta. Con la serie
   * vacía o con un solo titular, cero — y cero aquí es un cero verdadero, no un
   * relleno.
   */
  const cessionCount = computed(() => Math.max(0, totalElements.value - 1))

  /**
   * Si el titular vigente <b>de verdad</b> lo es hoy. Un perfil con `validTo`
   * nulo pero `validFrom` en el futuro es una cesión ya firmada que aún no ha
   * entrado, y decir que esa persona es la titular sería adelantar un mes la
   * responsabilidad de pagar.
   */
  const currentIsInForce = computed(() =>
    current.value ? isCurrentHolder(current.value, today.value) : false,
  )

  /**
   * Abre la cesión de una empresa: el titular vigente y la primera página de la
   * serie. Las dos lecturas van en paralelo porque son independientes; la del
   * titular tolera el 404, que no es un fallo sino «esta empresa nunca tuvo
   * perfil de facturación».
   */
  async function openCession(nextCompanyId: number, nextPage = 1) {
    request?.abort()
    const controller = new AbortController()
    request = controller

    store.setTarget(nextCompanyId)
    store.setCurrent(null)
    store.setMissing(false)
    store.setHistory([], nextPage, 0, 0)
    store.setError(null)
    store.setLoading(true)

    try {
      const [currentResult, historyResult] = await Promise.all([
        companyCessionApi.findCurrent(nextCompanyId, controller.signal),
        // `page` del backend es base 0; la que ve el operador es 1-based.
        companyCessionApi.listHistory(
          nextCompanyId,
          nextPage - 1,
          pageSize.value,
          controller.signal,
        ),
      ])
      if (controller.signal.aborted) return

      store.setCurrent(currentResult)
      store.setHistory(
        historyResult.content,
        nextPage,
        historyResult.totalElements,
        historyResult.totalPages,
      )
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      // El mensaje sale del `ProblemDetail` y nunca se escribe a mano: hacerlo
      // tira la traza con la que se encuentra la petición en Grafana.
      store.setError(
        getProblemDetailMessage(err, 'No se pudo cargar la cesión de esta empresa'),
        getTraceId(err) ?? null,
      )
    } finally {
      if (request === controller) {
        store.setLoading(false)
        request = null
      }
    }
  }

  /** Cambia de página de la serie sin volver a preguntar por el titular vigente. */
  function goToPage(nextPage: number) {
    const target = store.companyId
    if (target === null) return Promise.resolve()
    return openCession(target, nextPage)
  }

  /**
   * <b>Cede el contrato.</b> Devuelve `true` si quedó cedido, para que la
   * pantalla cierre el modal y mueva el foco.
   *
   * <p>Tras ceder se recarga todo y no se parchea el store con la respuesta: el
   * servidor cierra el titular saliente al hacerlo, y quedarse con el que
   * teníamos dejaría dos titulares vigentes en la pantalla — que es exactamente
   * la duda que esta pestaña existe para resolver.
   */
  async function succeed(
    nextCompanyId: number,
    body: SucceedCompanyBillingProfileRequest,
  ): Promise<boolean> {
    store.setSaving(true)
    try {
      await companyCessionApi.succeed(nextCompanyId, body)
      toast.success(
        'Contrato cedido',
        `El nuevo titular responde desde el ${body.effectiveFrom}. Lo facturado antes sigue siendo del anterior, y la cesión no se deshace.`,
      )
      await openCession(nextCompanyId)
      return true
    } catch (err: unknown) {
      toast.errorFrom('No se pudo ceder el contrato', err)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  onUnmounted(() => request?.abort())

  return {
    current,
    currentIsInForce,
    missing,
    history,
    holderRows,
    cessionCount,
    page,
    pageSize,
    totalElements,
    totalPages,
    today,
    loading,
    saving,
    error,
    errorTraceId,
    openCession,
    goToPage,
    succeed,
    closeCession: store.reset,
  }
}
