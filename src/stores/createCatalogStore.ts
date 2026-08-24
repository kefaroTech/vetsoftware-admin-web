import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

/**
 * Factoría de los stores de catálogo del panel.
 *
 * Quince features —especies, razas, colores, módulos, tipos de
 * spa, submódulos, roles y permisos base, tipos de consulta, cirugía, vacuna,
 * imagenología, laboratorio…— tenían EXACTAMENTE el mismo archivo con los
 * nombres cambiados: una lista, el seleccionado, un `loading` y tres setters.
 * Aquí está una sola vez.
 *
 * ── Qué NO hace, y por qué ────────────────────────────────────────────────
 *
 * **No recibe el cliente de API ni notifica.** Esa es la capa del composable
 * `use<Xxx>`, tal como fija el CLAUDE.md de este repo: el store guarda estado y
 * el composable concentra API y avisos. Meter el fetch aquí habría colapsado
 * también los `fetchAll`, pero a cambio de que 19 composables perdieran su
 * mensaje de error propio —«Error al cargar las especies»— o de que los avisos
 * acabaran disparándose desde un store.
 *
 * **No cachea con TTL.** Es tentador y estaba propuesto, pero un catálogo que
 * se sirve de caché durante cinco minutos contradice la regla del proyecto de
 * recargar al abrir cada pantalla: justo después de crear un registro, volver a
 * la lista mostraría la anterior. La deduplicación de llamadas en vuelo sí
 * cabría aquí, pero exige que el store sea dueño del fetch, así que va con lo
 * anterior.
 *
 * Si algún día hay un paquete compartido entre los dos fronts (RF-16), este es
 * uno de los primeros candidatos a mudarse.
 */
export function createCatalogStore<T>(name: string) {
  return defineStore(name, () => {
    // El `as Ref<T[]>` es necesario porque `ref()` sobre un genérico se tipa
    // como `Ref<UnwrapRef<T[]>>`, que para un T sin resolver no es lo mismo.
    const items = ref([]) as Ref<T[]>
    const selected = ref(null) as Ref<T | null>
    const loading = ref(false)

    /**
     * Mensaje del último fallo de carga, para que la tabla pueda distinguir
     * «no hay registros» de «no se pudieron traer» (EST-06). Antes el `catch`
     * del composable solo sacaba un aviso efímero y no dejaba rastro: el
     * listado se quedaba diciendo «Sin resultados» tras un 500.
     */
    const error = ref<string | null>(null)

    /** Identificador de traza del último fallo, para poder copiarlo y reportarlo. */
    const errorTraceId = ref<string | null>(null)

    function setItems(data: T[]) {
      items.value = data
    }
    function setSelected(value: T | null) {
      selected.value = value
    }
    function setLoading(value: boolean) {
      loading.value = value
    }
    function setError(message: string | null, traceId: string | null = null) {
      error.value = message
      errorTraceId.value = traceId
    }

    return {
      items,
      selected,
      loading,
      error,
      errorTraceId,
      setItems,
      setSelected,
      setLoading,
      setError,
    }
  })
}
