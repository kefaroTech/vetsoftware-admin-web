import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  getProblemDetailCode,
  getProblemDetailMessage,
  getTraceId,
} from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { priceListsApi } from '@/features/commercial-catalog/api/commercial-catalog.api'
import { platformBillingConfigApi } from '../api/platform-billing.api'
import { usePlatformBillingStore } from '../stores/platform-billing.store'
import {
  PLATFORM_BILLING_CONFIG_NOT_CONFIGURED,
  type UpdatePlatformBillingConfigRequest,
} from '../types/platform-billing.types'

/**
 * Cuántas tarifas se piden para poblar el desplegable de «tarifa por defecto».
 *
 * <p>200 es el tope de filas por página del backend. `GET /price-lists` **no
 * admite filtro por estado**, así que la única forma de ofrecer las publicadas es
 * traer una página grande y filtrarla aquí. Con más de 200 listas, una publicada
 * podría quedar fuera del desplegable y el operador no podría elegirla; está
 * pedido como issue y anotado en el informe. Hoy el catálogo tiene una lista o
 * ninguna, así que no es un problema real todavía — pero sí es un límite conocido
 * y no un descuido.
 */
const PRICE_LIST_PAGE_SIZE = 200

/**
 * Las políticas de facturación de la plataforma: leerlas, guardarlas y saber
 * cuándo la fila no existe.
 *
 * <p>Fachada del store, con la lógica de API y de avisos concentrada aquí. Los
 * componentes no llaman al cliente HTTP ni tocan el store directamente.
 *
 * <p><b>El 503 no es un error más.</b> `notConfigured` mira el `code` del
 * `ProblemDetail`, y cuando es cierto la pantalla deja de pintar el formulario y
 * pinta el mensaje del servidor **íntegro**. Ese mensaje trae el remedio —el
 * `INSERT` que hay que sembrar—, así que sustituirlo por un genérico sería tirar
 * lo único que resuelve el problema.
 *
 * <p>Ocurre igual al **guardar**: el servicio de actualización lanza la misma
 * excepción que la lectura y no hace upsert, así que un `PUT` sobre una base sin
 * sembrar también termina aquí. Por eso `save` reclasifica ese caso en vez de
 * dejarlo pasar como un aviso de error corriente que el operador leería como «no
 * se guardó, vuelve a intentarlo».
 */
export function usePlatformBillingConfig() {
  const store = usePlatformBillingStore()
  const { config, loading, saving, failure, priceLists, priceListsLoading, priceListsError } =
    storeToRefs(store)
  const { success, errorFrom } = useToast()

  /** No falta un recurso de negocio: falta configuración. Ver `PlatformBillingNotConfigured`. */
  const notConfigured = computed(
    () => failure.value?.code === PLATFORM_BILLING_CONFIG_NOT_CONFIGURED,
  )

  /**
   * Solo tarifas `PUBLISHED` y vigentes, como pide §4.6.
   *
   * <p>Ofrecer un borrador sería dejar la configuración «hecha» y el alta de
   * empresas rota a la vez, que es el peor de los estados posibles: la lista de
   * puesta en marcha daría el paso 5 por completo y el alta seguiría fallando.
   */
  const priceListOptions = computed(() =>
    priceLists.value
      .filter((list) => list.enabled && list.status === 'PUBLISHED')
      .map((list) => ({ value: list.id, label: `${list.name} · ${list.code}` })),
  )

  function capture(error: unknown) {
    store.setFailure({
      message: getProblemDetailMessage(error, 'No se pudo cargar la configuración de facturación'),
      code: getProblemDetailCode(error),
      traceId: getTraceId(error) ?? null,
    })
  }

  /** Recarga siempre al abrir la pantalla: nada de servir una fila de hace media hora. */
  async function load() {
    store.setLoading(true)
    store.setFailure(null)
    try {
      store.setConfig(await platformBillingConfigApi.find())
    } catch (e: unknown) {
      store.setConfig(null)
      capture(e)
    } finally {
      store.setLoading(false)
    }
  }

  /**
   * Las tarifas del desplegable. Su fallo **no** tumba la pantalla: se guarda
   * aparte y el campo muestra su propio aviso con «Reintentar», porque los otros
   * cinco campos se siguen pudiendo editar y guardar sin él.
   */
  async function loadPriceLists() {
    store.setPriceListsLoading(true)
    store.setPriceListsError(null)
    try {
      const page = await priceListsApi.listAll(0, PRICE_LIST_PAGE_SIZE)
      store.setPriceLists(page.content)
    } catch (e: unknown) {
      store.setPriceLists([])
      store.setPriceListsError(
        getProblemDetailMessage(e, 'No se pudieron cargar las tarifas publicadas'),
      )
    } finally {
      store.setPriceListsLoading(false)
    }
  }

  /** `true` si se guardó. El llamador lo usa para decidir si mueve el foco. */
  async function save(payload: UpdatePlatformBillingConfigRequest): Promise<boolean> {
    store.setSaving(true)
    try {
      store.setConfig(await platformBillingConfigApi.update(payload))
      store.setFailure(null)
      success('Políticas de facturación guardadas')
      return true
    } catch (e: unknown) {
      if (getProblemDetailCode(e) === PLATFORM_BILLING_CONFIG_NOT_CONFIGURED) {
        // La fila desapareció (o nunca estuvo) entre la lectura y el guardado.
        // No es «no se pudo guardar»: es el mismo despliegue incompleto, y la
        // pantalla debe cambiar de forma para decirlo con las palabras del
        // servidor en vez de invitar a reintentar algo que no puede funcionar.
        store.setConfig(null)
        capture(e)
        return false
      }
      errorFrom('No se pudieron guardar las políticas de facturación', e)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  return {
    config,
    loading,
    saving,
    failure,
    notConfigured,
    priceListOptions,
    priceListsLoading,
    priceListsError,
    load,
    loadPriceLists,
    save,
  }
}
