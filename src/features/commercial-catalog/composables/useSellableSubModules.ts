import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { submodulesApi } from '@/features/submodules/api/submodules.api'
import { useSubmodulesStore } from '@/features/submodules/stores/submodules.store'
import type { SubModuleResponse } from '@/features/submodules/types/submodules.types'

/**
 * El catálogo de pantallas que un artículo puede abrir (§4.1, tarea W3-A).
 *
 * ── Solo lo vendible ───────────────────────────────────────────────────────
 *
 * `GET /sub-modules` devuelve los 29 submódulos del sistema, y **la mayoría no
 * se vende**: «Configuración del sistema» o «Sucursales» son infraestructura
 * interna que toda clínica tiene por el hecho de existir. Ofrecerlos en el
 * selector deja puentear un artículo comercial contra una pantalla que nadie
 * compró. El campo del contrato se llama `sellable`, **no** `isSellable`
 * (`SubModuleResponse`), y ese detalle importa: con el nombre equivocado el
 * filtro no falla, devuelve `undefined` y **no filtra nada**.
 *
 * ── Por qué reutiliza el store de `submodules` ─────────────────────────────
 *
 * El recurso es el mismo y su cliente ya existe (`submodulesApi.listAll`).
 * Declarar aquí un segundo store del mismo `/sub-modules` sería tener dos
 * copias de la misma lista que pueden discrepar tras un alta. Lo que esta
 * feature añade es la **lectura comercial** de esa lista, que es un `computed`,
 * no un estado nuevo.
 */
export function useSellableSubModules() {
  const store = useSubmodulesStore()
  const { items, loading, error, errorTraceId } = storeToRefs(store)
  const { errorFrom } = useToast()

  /** Los que se pueden vender, ordenados como se leen: módulo y luego nombre. */
  const sellable = computed(() =>
    items.value
      .filter((sub) => sub.sellable)
      .slice()
      .sort((a, b) => a.module.name.localeCompare(b.module.name) || a.name.localeCompare(b.name)),
  )

  const options = computed(() =>
    sellable.value.map((sub) => ({
      value: sub.id,
      label: `${sub.module.name} · ${sub.name}`,
    })),
  )

  function findById(id: number): SubModuleResponse | null {
    return items.value.find((sub) => sub.id === id) ?? null
  }

  /**
   * Trae la lista. `loading` corta la llamada repetida cuando dos paneles se
   * montan a la vez; no hay caché con caducidad a propósito, por lo mismo que
   * dice `createCatalogStore`: servir de caché contradiría la regla del
   * proyecto de recargar al abrir la pantalla.
   */
  async function load(force = false) {
    if (loading.value) return
    if (!force && items.value.length > 0) return
    store.setLoading(true)
    store.setError(null)
    try {
      store.setItems(await submodulesApi.listAll())
    } catch (e) {
      store.setError(
        getProblemDetailMessage(e, 'No se pudieron cargar los submódulos'),
        getTraceId(e) ?? null,
      )
      errorFrom('Error al cargar los submódulos', e)
    } finally {
      store.setLoading(false)
    }
  }

  const refresh = () => load(true)

  return { options, sellable, loading, error, errorTraceId, findById, load, refresh }
}
