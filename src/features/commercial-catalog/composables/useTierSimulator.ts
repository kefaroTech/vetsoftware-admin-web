import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { catalogPricesApi } from '../api/commercial-catalog.api'
import { useTierSimulatorStore } from '../stores/tier-simulator.store'
import { simulateTiers, type TierRow, type TierSimulation } from './tierPricing'
import type { CatalogPriceResponse } from '../types/commercial-catalog.types'

/**
 * El simulador de tramos acumulativos (D-66, épica E5), atado a los datos.
 *
 * <p>La aritmética no está aquí: vive en `tierPricing.ts`, que es puro y se
 * prueba sin montar nada. Este composable solo hace las tres cosas que la
 * pantalla no puede hacer sola — traer la escalera, elegir qué escalera se
 * mira, y avisar cuando la petición falla.
 *
 * ── Por qué se descarga la lista entera y no la página visible ────────────
 *
 * `/catalog-prices` está paginado y la tabla de precios enseña una página. Un
 * simulador alimentado con lo que hay en pantalla repartiría quince usuarios
 * entre los tramos que se ven y daría un total **plausible y falso** en cuanto
 * el tramo «9 en adelante» cayera en la página siguiente. Se descargan todas
 * las páginas —el mismo bucle que `fetchAllCatalogOptions`— y se filtra en
 * memoria. No hay endpoint nuevo: es la ruta que ya existe, pedida entera.
 */
const PAGE_SIZE = 200

export function useTierSimulator() {
  const store = useTierSimulatorStore()
  const { rows, loading, error, errorTraceId, catalogItemId, billingCycle, quantity } =
    storeToRefs(store)
  const { errorFrom } = useToast()

  async function fetchAllPrices(listId: number): Promise<CatalogPriceResponse[]> {
    const all: CatalogPriceResponse[] = []
    let page = 0
    let totalPages = 1
    while (page < totalPages) {
      const result = await catalogPricesApi.listByPriceList(listId, page, PAGE_SIZE)
      all.push(...result.content)
      totalPages = result.totalPages
      page += 1
    }
    return all
  }

  async function loadPrices(listId: number, force = false) {
    try {
      await store.loadRows(listId, () => fetchAllPrices(listId), force)
      store.setError(null)
    } catch (caught) {
      store.setError(
        getProblemDetailMessage(caught, 'No se pudieron cargar los precios de la tarifa'),
        getTraceId(caught) ?? null,
      )
      errorFrom('Error al cargar los precios de la tarifa', caught)
      throw caught
    }
  }

  /** Los artículos que esta tarifa sabe cotizar, ordenados como se leen. */
  const itemOptions = computed(() => {
    const byId = new Map<number, string>()
    for (const row of rows.value) {
      if (byId.has(row.catalogItemId)) continue
      byId.set(
        row.catalogItemId,
        row.catalogItem
          ? `${row.catalogItem.code} · ${row.catalogItem.name}`
          : `Artículo #${row.catalogItemId}`,
      )
    }
    return [...byId.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
  })

  /** Las filas que forman la escalera del artículo y ciclo elegidos. */
  const tiers = computed<TierRow[]>(() =>
    rows.value
      .filter(
        (row) =>
          row.catalogItemId === catalogItemId.value && row.billingCycle === billingCycle.value,
      )
      .map((row) => ({
        tierMin: row.tierMin,
        tierMax: row.tierMax,
        includedQuantity: row.includedQuantity,
        unitAmount: row.unitAmount,
        setupAmount: row.setupAmount,
      })),
  )

  const simulation = computed<TierSimulation>(() => simulateTiers(tiers.value, quantity.value))

  return {
    rows,
    loading,
    error,
    errorTraceId,
    catalogItemId,
    billingCycle,
    quantity,
    itemOptions,
    tiers,
    simulation,
    loadPrices,
    setCatalogItemId: store.setCatalogItemId,
    setBillingCycle: store.setBillingCycle,
    setQuantity: store.setQuantity,
    reset: store.reset,
  }
}
