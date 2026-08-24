import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import {
  catalogItemsApi,
  priceListsApi,
} from '@/features/commercial-catalog/api/commercial-catalog.api'
import type {
  CatalogItemResponse,
  PriceListResponse,
} from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Cache de los dos desplegables que necesita el alta de una cotización: los artículos vendibles y
 * las tarifas publicadas.
 *
 * <p>Sigue la convención de catálogos del repositorio: **lista + promesa en vuelo**. Sin la
 * promesa, montar el formulario con dos selectores dispara dos veces la misma petición; con ella,
 * la segunda llamada se engancha a la primera. Las dos variables de promesa viven dentro del
 * `defineStore`, no a nivel de módulo, así que no son el singleton híbrido que la regla prohíbe.
 *
 * <p>Lee del cliente de `commercial-catalog` en vez de duplicar su API: el catálogo es de esa
 * feature y esta solo lo consume. El tope de 200 es el máximo de filas por página del backend.
 */
const CATALOG_PAGE_SIZE = 200

export const useQuoteCatalogStore = defineStore('quoteCatalog', () => {
  const items = ref<CatalogItemResponse[]>([])
  const priceLists = ref<PriceListResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let inFlight: Promise<void> | null = null

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [itemsPage, priceListsPage] = await Promise.all([
        catalogItemsApi.listAll(0, CATALOG_PAGE_SIZE),
        priceListsApi.listAll(0, CATALOG_PAGE_SIZE),
      ])
      items.value = itemsPage.content
      priceLists.value = priceListsPage.content
    } catch (e: unknown) {
      error.value = getProblemDetailMessage(e, 'No se pudo cargar el catálogo comercial')
      items.value = []
      priceLists.value = []
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Carga si la cache está vacía; si ya hay una petición en vuelo, se engancha a ella. */
  function ensureLoaded(): Promise<void> {
    if (items.value.length > 0 && priceLists.value.length > 0) return Promise.resolve()
    inFlight ??= fetchAll().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  /** Descarta la cache y vuelve a pedir. Es lo que llama el botón «Reintentar» del banner. */
  function refresh(): Promise<void> {
    items.value = []
    priceLists.value = []
    inFlight = null
    return ensureLoaded()
  }

  return { items, priceLists, loading, error, ensureLoaded, refresh }
})
