import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CatalogItemSubModuleResponse } from '@/features/platform-setup/types/platform-setup.types'
import type {
  BundleComponentResponse,
  CatalogItemDependencyResponse,
  CatalogItemResponse,
} from '../types/commercial-catalog.types'

/** Los tres puentes, para las estructuras que llevan una entrada por cada uno. */
export type BridgeKind = 'subModules' | 'dependencies' | 'components'

/**
 * Los tres puentes de UN artículo del catálogo (§4.1, tarea W3-A).
 *
 * ── Por qué es un store y no `ref()` dentro del composable ──────────────────
 *
 * La regla obligatoria del proyecto: el estado compartido entre componentes va
 * en Pinia, y el `ref()` singleton a nivel de módulo dentro de un composable
 * está prohibido. Aquí el reparto no es opcional: la vista pinta la ficha del
 * artículo, y **tres paneles hermanos** —submódulos, reglas y componentes—
 * leen y escriben sobre el mismo artículo. El tipo del artículo decide además
 * si el tercer panel existe siquiera. Sin store, o el estado sube a la vista y
 * baja por props a cuatro sitios, o cada panel llama al backend por su cuenta y
 * la ficha y sus paneles pueden discrepar.
 *
 * ── Tres bloques con la misma forma, y por qué no un `Record` genérico ──────
 *
 * Cada bloque lleva su propia terna `loading` / `error` / `errorTraceId` porque
 * un fallo en las reglas no puede borrar la tabla de submódulos: son tres
 * llamadas independientes y la pantalla tiene que poder decir «esta se pudo
 * traer y esta no» (mismo criterio que el orden de ramas de `AppTable`: el
 * error se pinta antes que el vacío, nunca disfrazado de vacío). Se escriben
 * las tres ternas a mano y no con una factoría genérica porque `storeToRefs`
 * necesita nombres estáticos para que el consumidor los desestructure.
 *
 * ── `dependencyCycle` ──────────────────────────────────────────────────────
 *
 * La ruta del bucle que devolvió el servidor al rechazar un alta por ciclo
 * (`CATALOG_ITEM_DEPENDENCY_CYCLE`). Vive en el store y no en el modal porque
 * el aviso tiene que **sobrevivir al cierre del formulario**: el operador
 * necesita leer «7 → 9 → 7» mientras mira la tabla de reglas para saber cuál
 * quitar. Un toast se va solo y el modal se cierra.
 */
export const useCatalogItemBridgesStore = defineStore('catalogItemBridges', () => {
  const item = ref<CatalogItemResponse | null>(null)
  const itemLoading = ref(false)
  const itemError = ref<string | null>(null)
  const itemErrorTraceId = ref<string | null>(null)

  const subModuleLinks = ref<CatalogItemSubModuleResponse[]>([])
  const subModulesLoading = ref(false)
  const subModulesError = ref<string | null>(null)
  const subModulesErrorTraceId = ref<string | null>(null)

  const dependencies = ref<CatalogItemDependencyResponse[]>([])
  const dependenciesLoading = ref(false)
  const dependenciesError = ref<string | null>(null)
  const dependenciesErrorTraceId = ref<string | null>(null)

  const components = ref<BundleComponentResponse[]>([])
  const componentsLoading = ref(false)
  const componentsError = ref<string | null>(null)
  const componentsErrorTraceId = ref<string | null>(null)

  /** Ruta completa del bucle que el servidor rechazó, en ids de artículo. */
  const dependencyCycle = ref<number[] | null>(null)

  /**
   * Ids de vínculos que se dieron de baja **en esta pantalla y en esta sesión**.
   *
   * <p>Es la única señal exacta de que un alta posterior no crea nada, sino que
   * revive lo que había: las tres tablas puente llevan borrado lógico con clave
   * única, el `GET` esconde la fila dada de baja y el `POST` del mismo par la
   * reactiva conservando su `id` (issue #432 del backend, cerrado). Si el `id`
   * que devuelve el alta es uno que acabamos de borrar, no hay nada que deducir.
   *
   * <p>Cubre el camino que de verdad se recorre —quitar una pantalla, ver que
   * hacía falta y volver a ponerla— sin depender de comparar relojes ni
   * secuencias. Para lo que no cubre (una baja de hace semanas, hecha por otra
   * persona) queda la comparación aproximada de `wasReactivated`, y para
   * resolverlo de raíz hace falta que el contrato lo diga: ver el issue abierto
   * contra el backend.
   */
  const removedLinkIds = ref<Record<BridgeKind, number[]>>({
    subModules: [],
    dependencies: [],
    components: [],
  })

  function rememberRemovedLink(kind: BridgeKind, id: number) {
    if (!removedLinkIds.value[kind].includes(id)) removedLinkIds.value[kind].push(id)
  }

  function wasRemovedHere(kind: BridgeKind, id: number): boolean {
    return removedLinkIds.value[kind].includes(id)
  }

  function setItem(value: CatalogItemResponse | null) {
    item.value = value
  }
  function setItemLoading(value: boolean) {
    itemLoading.value = value
  }
  function setItemError(message: string | null, traceId: string | null = null) {
    itemError.value = message
    itemErrorTraceId.value = traceId
  }

  function setSubModuleLinks(value: CatalogItemSubModuleResponse[]) {
    subModuleLinks.value = value
  }
  function setSubModulesLoading(value: boolean) {
    subModulesLoading.value = value
  }
  function setSubModulesError(message: string | null, traceId: string | null = null) {
    subModulesError.value = message
    subModulesErrorTraceId.value = traceId
  }

  function setDependencies(value: CatalogItemDependencyResponse[]) {
    dependencies.value = value
  }
  function setDependenciesLoading(value: boolean) {
    dependenciesLoading.value = value
  }
  function setDependenciesError(message: string | null, traceId: string | null = null) {
    dependenciesError.value = message
    dependenciesErrorTraceId.value = traceId
  }

  function setComponents(value: BundleComponentResponse[]) {
    components.value = value
  }
  function setComponentsLoading(value: boolean) {
    componentsLoading.value = value
  }
  function setComponentsError(message: string | null, traceId: string | null = null) {
    componentsError.value = message
    componentsErrorTraceId.value = traceId
  }

  function setDependencyCycle(value: number[] | null) {
    dependencyCycle.value = value
  }

  /**
   * Deja la pantalla como recién abierta. La llama la vista al montar y al
   * cambiar de artículo: sin esto, entrar a otro artículo desde un enlace de la
   * tabla de reglas pintaría durante un instante los puentes del anterior, que
   * es la clase de error que hace que alguien borre el vínculo equivocado.
   */
  function reset() {
    setItem(null)
    setItemError(null)
    setSubModuleLinks([])
    setSubModulesError(null)
    setDependencies([])
    setDependenciesError(null)
    setComponents([])
    setComponentsError(null)
    setDependencyCycle(null)
    removedLinkIds.value = { subModules: [], dependencies: [], components: [] }
  }

  return {
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
    removedLinkIds,
    rememberRemovedLink,
    wasRemovedHere,
    setItem,
    setItemLoading,
    setItemError,
    setSubModuleLinks,
    setSubModulesLoading,
    setSubModulesError,
    setDependencies,
    setDependenciesLoading,
    setDependenciesError,
    setComponents,
    setComponentsLoading,
    setComponentsError,
    setDependencyCycle,
    reset,
  }
})
