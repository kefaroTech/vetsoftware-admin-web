import axios from 'axios'
import { computed, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/composables/format'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { subscriptionItemsApi } from '../api/subscription-items.api'
import {
  useSubscriptionItemsStore,
  type SubscriptionItemsScope,
} from '../stores/subscription-items.store'
import { useSubscriptionRecord } from './useSubscriptionRecord'
import {
  LIFECYCLE_LABEL,
  LIFECYCLE_VARIANT,
  isOperable,
  itemLifecycleOn,
  lifecycleSupportText,
  type SubscriptionItemLifecycle,
} from './subscriptionItemLifecycle'
import type {
  AddSubscriptionItemRequest,
  ChangeSubscriptionItemQuantityRequest,
  RemoveSubscriptionItemRequest,
  SubscriptionItemResponse,
} from '../types/subscription-items.types'

/** Una línea ya clasificada respecto a la fecha que se está preguntando. */
export interface SubscriptionItemRow {
  item: SubscriptionItemResponse
  lifecycle: SubscriptionItemLifecycle
  /** Rótulo textual del estado. Nunca se pinta el estado solo con color (§5.2). */
  label: string
  variant: 'success' | 'neutral'
  /** «Estuvo desde el 01/01/2026 hasta el 14/03/2026.» */
  support: string
  /** Si cabe operar sobre ella: una línea cerrada no se cambia ni se vuelve a dar de baja. */
  operable: boolean
}

/**
 * «Lo contratado» — la mitad de la pregunta que vertebra el modelo: <b>¿qué tenía
 * contratado Ana el 3 de marzo?</b>
 *
 * <p>Este composable es la API estable de la sub-vista, y concentra las tres cosas
 * que no deben estar repartidas por los componentes: la consulta (`onDate` y el
 * alcance), la clasificación de cada línea, y las tres escrituras con su recarga.
 *
 * <p><b>No recarga el contrato.</b> Lee `companyId` y `subscriptionId` de
 * `useSubscriptionRecord()` —que garantiza que no son nulos mientras el expediente
 * esté pintado y que son los de la URL comprobados contra el servidor— y los pasa
 * a su propio cliente de API para que la cabecera `X-Company-Id` viaje también en
 * estas cuatro llamadas.
 *
 * <p><b>La fecha manda siempre; el alcance decide quién filtra.</b> Cambiar de
 * fecha con «Expediente completo» no vuelve a pedir nada: las mismas líneas se
 * reclasifican en el cliente con el mismo criterio que el servidor aplicaría. Con
 * «Solo lo vigente», la fecha sí viaja como `onDate` y filtra el servidor. Las dos
 * vistas no se pueden contradecir porque el criterio es literalmente el mismo
 * (`subscriptionItemLifecycle.ts` ↔ `EffectivePeriod`).
 */
export function useSubscriptionItems() {
  const store = useSubscriptionItemsStore()
  const { items, referenceDate, scope, loading, saving, error, errorTraceId, totalElements } =
    storeToRefs(store)
  const { companyId, subscriptionId, subscription, companyName } = useSubscriptionRecord()
  const { errorFrom, success } = useToast()

  // Por instancia del composable, no un singleton de módulo: es una referencia
  // local a esta llamada de la función, igual que en `useSubscriptionRecord`.
  let request: AbortController | null = null

  // La pregunta sobrevive a un salto de pestaña dentro del mismo expediente y no
  // sobrevive a un cambio de contrato. Se decide aquí, en el `setup` de la
  // sub-vista, antes de que el `watch` de abajo dispare la primera carga.
  if (store.loadedFor !== subscriptionId.value) store.reset(subscriptionId.value)

  /**
   * Lo que identifica una consulta. La fecha solo entra cuando el alcance es
   * `on-date`: con el expediente completo, mover la fecha reclasifica y no vuelve
   * a pedir. Es lo que hace que arrastrar el calendario sea instantáneo en vez de
   * disparar una petición por día.
   */
  const queryKey = computed(
    () =>
      `${subscriptionId.value ?? ''}|${scope.value}|${scope.value === 'on-date' ? referenceDate.value : ''}`,
  )

  /**
   * Las líneas ya clasificadas, en el orden en que el servidor lee el expediente:
   * cronológico por `effectiveFrom`, con desempate por id. No se reordena en el
   * cliente — un expediente que crece se lee como se escribió.
   */
  const rows = computed<SubscriptionItemRow[]>(() =>
    items.value.map((item) => {
      const lifecycle = itemLifecycleOn(item, referenceDate.value)
      return {
        item,
        lifecycle,
        label: LIFECYCLE_LABEL[lifecycle],
        variant: LIFECYCLE_VARIANT[lifecycle],
        support: lifecycleSupportText(item, referenceDate.value),
        operable: isOperable(item, referenceDate.value),
      }
    }),
  )

  const counts = computed(() => ({
    current: rows.value.filter((row) => row.lifecycle === 'CURRENT').length,
    scheduled: rows.value.filter((row) => row.lifecycle === 'SCHEDULED').length,
    closed: rows.value.filter((row) => row.lifecycle === 'CLOSED').length,
  }))

  /** Los artículos que ya tienen una línea sin cerrar: no se pueden volver a añadir. */
  const openCatalogItemIds = computed(
    () =>
      new Set(items.value.filter((item) => item.effectiveTo === null).map((i) => i.catalogItemId)),
  )

  /**
   * Lo que se anuncia en `role="status"` cuando cambia la consulta (§5.3).
   *
   * <p>Un cambio de fecha o de alcance repinta la tabla entera y no mueve el foco:
   * quien navega con lector de pantalla no se enteraría de que la respuesta cambió.
   * Se dice el resultado, no «cargando»: la cifra es la respuesta.
   */
  const announcement = computed(() => {
    if (loading.value) return ''
    if (error.value) return ''
    const { current, scheduled, closed } = counts.value
    const alcance =
      scope.value === 'on-date' ? 'Solo lo vigente' : 'Expediente completo, con las cerradas'
    if (rows.value.length === 0) {
      return `Al ${formatDate(referenceDate.value)} no hay líneas que mostrar. ${alcance}.`
    }
    return (
      `Al ${formatDate(referenceDate.value)}: ${current} vigentes, ` +
      `${scheduled} programadas y ${closed} cerradas. ${alcance}.`
    )
  })

  /** El expediente llegó truncado por paginación. No debería pasar; si pasa, se dice. */
  const truncated = computed(() => totalElements.value > items.value.length)

  async function reload(): Promise<void> {
    const id = subscriptionId.value
    const scopeCompany = companyId.value
    if (id == null || scopeCompany == null) return

    request?.abort()
    const controller = new AbortController()
    request = controller

    store.setError(null)
    store.setLoading(true)
    try {
      const page = await subscriptionItemsApi.listBySubscription(id, scopeCompany, {
        onDate: scope.value === 'on-date' ? referenceDate.value : null,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      store.setItems(page.content, page.totalElements)
    } catch (err: unknown) {
      if (axios.isCancel(err) || controller.signal.aborted) return
      store.setItems([], 0)
      store.setError(
        getProblemDetailMessage(err, 'No se pudo cargar lo contratado'),
        getTraceId(err) ?? null,
      )
      errorFrom('Error al cargar lo contratado', err)
    } finally {
      if (request === controller) {
        store.setLoading(false)
        request = null
      }
    }
  }

  /**
   * Las tres escrituras comparten forma: firman, <b>recargan el expediente</b> y
   * avisan con un texto que dice qué quedó, no «guardado correctamente».
   *
   * <p>Se recarga la lista entera y no se parchea la fila devuelta a propósito:
   * `POST /items/quantity` responde la línea <i>sucesora</i> y deja la anterior
   * cerrada en el servidor. Insertar solo lo que vuelve dejaría la pantalla
   * mostrando dos líneas abiertas del mismo artículo, que es exactamente el
   * defecto que `SubscriptionOverlapsPanel` vigila.
   */
  async function runWrite(
    action: (id: number, scopeCompany: number) => Promise<SubscriptionItemResponse>,
    errorTitle: string,
    done: (result: SubscriptionItemResponse) => void,
  ): Promise<boolean> {
    const id = subscriptionId.value
    const scopeCompany = companyId.value
    if (id == null || scopeCompany == null) return false
    store.setSaving(true)
    try {
      const result = await action(id, scopeCompany)
      await reload()
      done(result)
      return true
    } catch (err: unknown) {
      errorFrom(errorTitle, err)
      return false
    } finally {
      store.setSaving(false)
    }
  }

  function addItem(payload: AddSubscriptionItemRequest): Promise<boolean> {
    return runWrite(
      (id, scopeCompany) => subscriptionItemsApi.create(id, scopeCompany, payload),
      'No se pudo añadir el artículo',
      (result) =>
        success(
          'Artículo añadido',
          `«${result.itemName}» queda contratado desde el ${formatDate(result.effectiveFrom)}. El otrosí ya está en la historia del contrato.`,
        ),
    )
  }

  function changeQuantity(payload: ChangeSubscriptionItemQuantityRequest): Promise<boolean> {
    return runWrite(
      (id, scopeCompany) => subscriptionItemsApi.changeQuantity(id, scopeCompany, payload),
      'No se pudo cambiar la cantidad',
      (result) =>
        success(
          'Cantidad cambiada',
          `«${result.itemName}» pasa a ${result.quantity} desde el ${formatDate(result.effectiveFrom)}. La línea anterior queda cerrada en el expediente.`,
        ),
    )
  }

  function removeItem(payload: RemoveSubscriptionItemRequest): Promise<boolean> {
    return runWrite(
      (id, scopeCompany) => subscriptionItemsApi.remove(id, scopeCompany, payload),
      'No se pudo dar de baja el artículo',
      (result) =>
        success(
          'Artículo dado de baja',
          `«${result.itemName}» queda con fecha de fin del ${formatDate(result.effectiveTo)}. La línea sigue en el expediente y los datos pasan a solo lectura.`,
        ),
    )
  }

  function setReferenceDate(value: string) {
    store.setReferenceDate(value)
  }

  function setScope(value: SubscriptionItemsScope) {
    store.setScope(value)
  }

  // Recarga siempre al abrir, y también al cambiar la consulta o el contrato.
  watch(queryKey, () => void reload(), { immediate: true })

  onUnmounted(() => request?.abort())

  return {
    subscription,
    companyName,
    rows,
    counts,
    openCatalogItemIds,
    referenceDate,
    scope,
    loading,
    saving,
    error,
    errorTraceId,
    announcement,
    truncated,
    totalElements,
    setReferenceDate,
    setScope,
    reload,
    addItem,
    changeQuantity,
    removeItem,
  }
}
