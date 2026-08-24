import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import {
  getProblemDetailCode,
  getProblemDetailMessage,
  getTraceId,
} from '@/services/http/http.client'
import type { CatalogItemSubModuleResponse } from '@/features/platform-setup/types/platform-setup.types'
import {
  bundleComponentsApi,
  catalogItemDependenciesApi,
  catalogItemSubModulesApi,
  catalogItemsApi,
} from '../api/commercial-catalog.api'
import { useCatalogItemBridgesStore, type BridgeKind } from '../stores/catalog-item-bridges.store'
import { useCommercialCatalog } from './useCommercialCatalog'
import type {
  BundleComponentResponse,
  CatalogItemDependencyResponse,
  CreateBundleComponentRequest,
  CreateCatalogItemDependencyRequest,
  UpdateBundleComponentRequest,
  UpdateCatalogItemDependencyRequest,
} from '../types/commercial-catalog.types'

/** El código con el que el backend rechaza una dependencia que cerraría un bucle. */
export const DEPENDENCY_CYCLE_CODE = 'CATALOG_ITEM_DEPENDENCY_CYCLE'

/**
 * La ruta del bucle que el servidor adjunta al `ProblemDetail`.
 *
 * <p>No sale del texto del mensaje a propósito: el backend la manda **también
 * como dato estructurado** (`pd.setProperty("cycle", ex.getCycle())`,
 * `GlobalExceptionHandler.java:786-793`) precisamente para que el front no tenga
 * que parsear la prosa `"12 > 44 > 12"`, que se rompe en cuanto el mensaje
 * cambie.
 *
 * <p>Se lee de forma estructural, sin importar `AxiosError`: `http.client.ts` es
 * un fichero gemelo TR-02 y `ProblemDetail` no declara esta propiedad —
 * añadírsela obligaría a tocar los dos fronts por algo que solo existe en una
 * ruta de esta consola.
 */
export function readCyclePath(error: unknown): number[] | null {
  const data = (error as { response?: { data?: { cycle?: unknown } } } | null | undefined)?.response
    ?.data
  const cycle = data?.cycle
  if (!Array.isArray(cycle)) return null
  const ids = cycle.filter((value): value is number => typeof value === 'number')
  return ids.length > 0 ? ids : null
}

/** Lo mínimo que hace falta para saber si un vínculo es nuevo o resucitado. */
interface LinkStamp {
  id: number
  createdDate: string
}

/**
 * ¿El alta devolvió un vínculo **reactivado** en vez de uno nuevo?
 *
 * <p>Las tres tablas puente llevan borrado lógico con clave única sobre sus FK,
 * así que un vínculo dado de baja **ocupa la clave siendo invisible**: el `GET`
 * no lo trae y el `POST` del mismo par no inserta otro, sino que revive el que
 * había (issue #432 del backend, cerrado). La fila resucitada conserva su `id` y
 * su `createdDate` —`reactivate` es un `UPDATE … SET enabled = TRUE` y nada
 * más—, y eso es lo único que distingue los dos casos.
 *
 * <p><b>Dos comparaciones, y las dos contra la lista que ya estaba en pantalla.</b>
 * Se comparan valores del MISMO reloj y de la MISMA secuencia del servidor, así
 * que no dependen de que navegador y backend compartan zona horaria (el
 * contrato sirve `createdDate` como `LocalDateTime`, sin zona):
 *
 * <ul>
 *   <li>`id` estrictamente menor que el mayor ya listado → la fila existía
 *       antes, porque un `AUTO_INCREMENT` nuevo es siempre mayor que todos.</li>
 *   <li>`createdDate` estrictamente anterior al más reciente ya listado → igual.
 *       Estrictamente, porque el contrato sirve segundos enteros y dos altas del
 *       mismo segundo empatarían.</li>
 * </ul>
 *
 * <p><b>Qué NO detecta, y por qué falla hacia «nuevo».</b> Si el vínculo
 * resucitado se creó *después* que todos los que hoy siguen activos —o si la
 * lista estaba vacía— ninguna de las dos comparaciones lo ve y el aviso dirá
 * «vinculado» en vez de «reactivado». Es un aviso menos preciso, nunca uno
 * falso; afirmar «ya existía» sobre un vínculo recién creado sí sería mentir. El
 * contrato no trae ninguna señal explícita —el `POST` responde 201 en los dos
 * casos y el DTO no lleva bandera— y por eso hay un issue abierto contra el
 * backend.
 */
export function wasReactivated(created: LinkStamp, before: readonly LinkStamp[]): boolean {
  if (before.length === 0) return false
  const maxId = Math.max(...before.map((link) => link.id))
  const maxCreated = before.reduce((a, b) => (a.createdDate > b.createdDate ? a : b)).createdDate
  return created.id < maxId || created.createdDate < maxCreated
}

const REACTIVATED_NOTICE = 'Ya existía dado de baja: se ha vuelto a activar.'

export function useCatalogItemBridges() {
  const store = useCatalogItemBridgesStore()
  const {
    item,
    itemLoading,
    itemError,
    itemErrorTraceId,
    subModuleLinks,
    subModulesLoading,
    subModulesError,
    subModulesErrorTraceId,
    dependencies,
    dependenciesLoading,
    dependenciesError,
    dependenciesErrorTraceId,
    components,
    componentsLoading,
    componentsError,
    componentsErrorTraceId,
    dependencyCycle,
  } = storeToRefs(store)
  const { success, info, errorFrom } = useToast()

  /**
   * Anuncia el alta de un vínculo diciendo la verdad de las dos que puede ser.
   *
   * <p>Primero la señal exacta —el `id` que devuelve el alta es uno que esta
   * pantalla acaba de dar de baja— y solo si no la hay, la comparación
   * aproximada de `wasReactivated`. En ese orden porque la primera no se
   * equivoca nunca y la segunda solo puede fallar hacia «nuevo».
   */
  function announceLink(
    kind: BridgeKind,
    created: LinkStamp,
    before: readonly LinkStamp[],
    createdMessage: string,
  ) {
    if (store.wasRemovedHere(kind, created.id) || wasReactivated(created, before)) {
      info(REACTIVATED_NOTICE)
    } else {
      success(createdMessage)
    }
  }

  // Los artículos del catálogo, para los dos selectores y para poner nombre a
  // los ids del bucle. Se reutiliza la caché que ya mantiene el store de la
  // pantalla de catálogo en vez de declarar una segunda lista de lo mismo.
  const { catalogOptions, catalogOptionsLoading, catalogOptionsError, loadCatalogOptions } =
    useCommercialCatalog()

  /** ¿El artículo admite componentes? Solo un `BUNDLE`; para el resto no existe el bloque. */
  const isBundle = computed(() => item.value?.itemType === 'BUNDLE')

  const catalogItemLabel = (id: number) => {
    const found = catalogOptions.value.find((option) => option.id === id)
    return found ? `${found.code} · ${found.name}` : `Artículo #${id}`
  }

  /** «CORE · Núcleo → HC · Historia clínica → CORE · Núcleo», con los códigos del catálogo. */
  const cycleLabel = computed(() =>
    dependencyCycle.value === null || dependencyCycle.value.length === 0
      ? null
      : dependencyCycle.value.map(catalogItemLabel).join(' → '),
  )

  function clearCycle() {
    store.setDependencyCycle(null)
  }

  async function loadItem(itemId: number) {
    store.setItemLoading(true)
    store.setItemError(null)
    try {
      store.setItem(await catalogItemsApi.findById(itemId))
    } catch (e) {
      store.setItem(null)
      store.setItemError(
        getProblemDetailMessage(e, 'No se pudo cargar el artículo'),
        getTraceId(e) ?? null,
      )
    } finally {
      store.setItemLoading(false)
    }
  }

  async function loadSubModuleLinks(itemId: number) {
    store.setSubModulesLoading(true)
    store.setSubModulesError(null)
    try {
      store.setSubModuleLinks(await catalogItemSubModulesApi.listByCatalogItem(itemId))
    } catch (e) {
      store.setSubModulesError(
        getProblemDetailMessage(e, 'No se pudieron cargar las pantallas del artículo'),
        getTraceId(e) ?? null,
      )
    } finally {
      store.setSubModulesLoading(false)
    }
  }

  async function loadDependencies(itemId: number) {
    store.setDependenciesLoading(true)
    store.setDependenciesError(null)
    try {
      store.setDependencies(await catalogItemDependenciesApi.listByCatalogItem(itemId))
    } catch (e) {
      store.setDependenciesError(
        getProblemDetailMessage(e, 'No se pudieron cargar las reglas del artículo'),
        getTraceId(e) ?? null,
      )
    } finally {
      store.setDependenciesLoading(false)
    }
  }

  async function loadComponents(bundleId: number) {
    store.setComponentsLoading(true)
    store.setComponentsError(null)
    try {
      store.setComponents(await bundleComponentsApi.listByBundle(bundleId))
    } catch (e) {
      store.setComponentsError(
        getProblemDetailMessage(e, 'No se pudo cargar el contenido del paquete'),
        getTraceId(e) ?? null,
      )
    } finally {
      store.setComponentsLoading(false)
    }
  }

  /**
   * Recarga al abrir la pantalla, que es la regla del proyecto.
   *
   * <p>El artículo va **primero y solo**: su `itemType` decide si el tercer
   * bloque existe siquiera, y pedir `/components` de un artículo que no es
   * `BUNDLE` es preguntar por algo que el modelo no admite.
   */
  async function loadAll(itemId: number) {
    store.reset()
    await Promise.all([loadItem(itemId), loadCatalogOptions(true).catch(() => undefined)])
    const tasks = [loadSubModuleLinks(itemId), loadDependencies(itemId)]
    if (isBundle.value) tasks.push(loadComponents(itemId))
    await Promise.all(tasks)
  }

  // ── Puente 1 · qué pantallas abre ────────────────────────────────────────

  async function linkSubModule(itemId: number, subModuleId: number) {
    const before: LinkStamp[] = subModuleLinks.value.map((link) => ({
      id: link.id,
      createdDate: link.createdDate,
    }))
    try {
      const created: CatalogItemSubModuleResponse = await catalogItemSubModulesApi.create(itemId, {
        subModuleId,
      })
      announceLink('subModules', created, before, 'Pantalla vinculada al artículo')
      await loadSubModuleLinks(itemId)
      return created
    } catch (e) {
      errorFrom('Error al vincular la pantalla', e)
      throw e
    }
  }

  async function unlinkSubModule(itemId: number, linkId: number) {
    try {
      await catalogItemSubModulesApi.remove(itemId, linkId)
      store.rememberRemovedLink('subModules', linkId)
      info('Pantalla desvinculada')
      await loadSubModuleLinks(itemId)
    } catch (e) {
      errorFrom('Error al desvincular la pantalla', e)
      throw e
    }
  }

  // ── Puente 2 · las reglas del configurador ───────────────────────────────

  /** `true` si el fallo era un ciclo; deja la ruta del bucle en el store. */
  function captureCycle(error: unknown): boolean {
    if (getProblemDetailCode(error) !== DEPENDENCY_CYCLE_CODE) return false
    store.setDependencyCycle(readCyclePath(error) ?? [])
    return true
  }

  async function createDependency(itemId: number, payload: CreateCatalogItemDependencyRequest) {
    const before: LinkStamp[] = dependencies.value.map((rule) => ({
      id: rule.id,
      createdDate: rule.createdDate,
    }))
    clearCycle()
    try {
      const created: CatalogItemDependencyResponse = await catalogItemDependenciesApi.create(
        itemId,
        payload,
      )
      announceLink('dependencies', created, before, 'Regla creada')
      await loadDependencies(itemId)
      return created
    } catch (e) {
      captureCycle(e)
      errorFrom('Error al crear la regla', e)
      throw e
    }
  }

  async function updateDependency(
    itemId: number,
    id: number,
    payload: UpdateCatalogItemDependencyRequest,
  ) {
    clearCycle()
    try {
      const updated = await catalogItemDependenciesApi.update(itemId, id, payload)
      success('Regla actualizada')
      await loadDependencies(itemId)
      return updated
    } catch (e) {
      captureCycle(e)
      errorFrom('Error al actualizar la regla', e)
      throw e
    }
  }

  async function removeDependency(itemId: number, id: number) {
    try {
      await catalogItemDependenciesApi.remove(itemId, id)
      store.rememberRemovedLink('dependencies', id)
      info('Regla eliminada')
      clearCycle()
      await loadDependencies(itemId)
    } catch (e) {
      errorFrom('Error al eliminar la regla', e)
      throw e
    }
  }

  // ── Puente 3 · qué trae el paquete ───────────────────────────────────────

  async function createComponent(bundleId: number, payload: CreateBundleComponentRequest) {
    const before: LinkStamp[] = components.value.map((component) => ({
      id: component.id,
      createdDate: component.createdDate,
    }))
    try {
      const created: BundleComponentResponse = await bundleComponentsApi.create(bundleId, payload)
      announceLink('components', created, before, 'Pieza agregada al paquete')
      await loadComponents(bundleId)
      return created
    } catch (e) {
      errorFrom('Error al agregar la pieza', e)
      throw e
    }
  }

  async function updateComponent(
    bundleId: number,
    id: number,
    payload: UpdateBundleComponentRequest,
  ) {
    try {
      const updated = await bundleComponentsApi.update(bundleId, id, payload)
      success('Cantidad actualizada')
      await loadComponents(bundleId)
      return updated
    } catch (e) {
      errorFrom('Error al actualizar la cantidad', e)
      throw e
    }
  }

  async function removeComponent(bundleId: number, id: number) {
    try {
      await bundleComponentsApi.remove(bundleId, id)
      store.rememberRemovedLink('components', id)
      info('Pieza retirada del paquete')
      await loadComponents(bundleId)
    } catch (e) {
      errorFrom('Error al retirar la pieza', e)
      throw e
    }
  }

  return {
    item,
    itemLoading,
    itemError,
    itemErrorTraceId,
    isBundle,
    subModuleLinks,
    subModulesLoading,
    subModulesError,
    subModulesErrorTraceId,
    dependencies,
    dependenciesLoading,
    dependenciesError,
    dependenciesErrorTraceId,
    components,
    componentsLoading,
    componentsError,
    componentsErrorTraceId,
    dependencyCycle,
    cycleLabel,
    catalogOptions,
    catalogOptionsLoading,
    catalogOptionsError,
    catalogItemLabel,
    clearCycle,
    loadCatalogOptions,
    loadAll,
    loadSubModuleLinks,
    loadDependencies,
    loadComponents,
    linkSubModule,
    unlinkSubModule,
    createDependency,
    updateDependency,
    removeDependency,
    createComponent,
    updateComponent,
    removeComponent,
  }
}
