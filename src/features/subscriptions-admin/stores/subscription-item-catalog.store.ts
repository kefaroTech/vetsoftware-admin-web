import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import {
  catalogItemsApi,
  catalogPricesApi,
} from '@/features/commercial-catalog/api/commercial-catalog.api'
import type {
  CatalogItemResponse,
  CatalogPriceResponse,
} from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Lo que hace falta para <b>añadir</b> una línea: qué artículos existen y cuánto
 * cuestan <b>en la tarifa que este contrato tiene aplicada</b>.
 *
 * <p><b>Por qué esto es un store con cache y no una llamada del modal.</b> Es la
 * convención de catálogos del repositorio —lista + promesa en vuelo—, y aquí gana
 * algo concreto: el modal de «Añadir artículo» monta dos desplegables y se abre y
 * se cierra varias veces seguidas mientras se firman tres altas; sin la promesa en
 * vuelo, cada apertura dispara dos peticiones repetidas del mismo catálogo. Las
 * dos variables de promesa viven dentro del `defineStore`, así que no son el
 * singleton de módulo que la regla prohíbe.
 *
 * <p><b>Por qué la cache de precios va por tarifa y no plana.</b> `subscription
 * .priceListId` es distinto por contrato: quien abre el expediente de Ana y luego
 * el de otra clínica no puede recibir los precios de la primera. La llave es el id
 * de la tarifa y no hay un «último cargado» que se pueda confundir.
 *
 * <p>Lee de los clientes de `commercial-catalog` en vez de duplicarlos: el
 * catálogo es de esa feature y ésta solo lo consume. Es la misma decisión —y el
 * mismo comentario— de `quote-catalog.store.ts`.
 */
const CATALOG_PAGE_SIZE = 200

export const useSubscriptionItemCatalogStore = defineStore('subscriptionItemCatalog', () => {
  const items = ref<CatalogItemResponse[]>([])
  /** Precios ya cargados, por id de tarifa. */
  const pricesByList = ref<Record<number, CatalogPriceResponse[]>>({})

  const loading = ref(false)
  const error = ref<string | null>(null)

  let itemsInFlight: Promise<void> | null = null
  const pricesInFlight = new Map<number, Promise<void>>()

  async function fetchItems(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const page = await catalogItemsApi.listAll(0, CATALOG_PAGE_SIZE)
      items.value = page.content
    } catch (e: unknown) {
      error.value = getProblemDetailMessage(e, 'No se pudo cargar el catálogo de artículos')
      items.value = []
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchPrices(priceListId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const page = await catalogPricesApi.listByPriceList(priceListId, 0, CATALOG_PAGE_SIZE)
      pricesByList.value = { ...pricesByList.value, [priceListId]: page.content }
    } catch (e: unknown) {
      error.value = getProblemDetailMessage(
        e,
        'No se pudieron cargar los precios de la tarifa aplicada al contrato',
      )
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Carga si la cache está vacía; si ya hay una petición en vuelo, se engancha a ella. */
  function ensureLoaded(priceListId: number): Promise<void> {
    const pending: Promise<void>[] = []

    if (items.value.length === 0) {
      itemsInFlight ??= fetchItems().finally(() => {
        itemsInFlight = null
      })
      pending.push(itemsInFlight)
    }

    if (!pricesByList.value[priceListId]) {
      let inFlight = pricesInFlight.get(priceListId)
      if (!inFlight) {
        inFlight = fetchPrices(priceListId).finally(() => {
          pricesInFlight.delete(priceListId)
        })
        pricesInFlight.set(priceListId, inFlight)
      }
      pending.push(inFlight)
    }

    return pending.length === 0 ? Promise.resolve() : Promise.all(pending).then(() => undefined)
  }

  /** Descarta la cache y vuelve a pedir. Es lo que llama «Reintentar» del banner. */
  function refresh(priceListId: number): Promise<void> {
    items.value = []
    pricesByList.value = {}
    itemsInFlight = null
    pricesInFlight.clear()
    return ensureLoaded(priceListId)
  }

  return { items, pricesByList, loading, error, ensureLoaded, refresh }
})
