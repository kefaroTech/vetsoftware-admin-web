import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { formatDate } from '@/composables/format'
import { useQuoteCatalogStore } from '../stores/quote-catalog.store'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * Los desplegables del alta de una cotización, con la cache del store detrás.
 *
 * <p>**Solo se ofrece lo que se puede vender hoy.** Los artículos se filtran a `ACTIVE` y las
 * tarifas a `PUBLISHED` y vigente: cotizar contra un borrador de tarifa o contra un artículo
 * obsoleto produce una oferta que el cliente puede reclamar y la plataforma no puede sostener.
 * Un artículo `DRAFT` no aparece deshabilitado — simplemente no está, porque venderlo no es una
 * operación que exista.
 */
export function useQuoteCatalog() {
  const store = useQuoteCatalogStore()
  const { items, priceLists, loading, error } = storeToRefs(store)

  const sellableItems = computed(() =>
    items.value
      .filter((item) => item.status === 'ACTIVE')
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es')),
  )

  const itemOptions = computed(() =>
    sellableItems.value.map((item) => ({
      value: item.id,
      label: `${item.code} · ${item.name}`,
    })),
  )

  /** Publicada y con vigencia abierta o futura: es la definición del §3.7 de la especificación. */
  const publishedPriceLists = computed(() =>
    priceLists.value.filter((list) => {
      if (list.status !== 'PUBLISHED') return false
      if (!list.validTo) return true
      return new Date(`${list.validTo}T23:59:59`).getTime() >= Date.now()
    }),
  )

  const priceListOptions = computed(() =>
    publishedPriceLists.value.map((list) => ({
      value: list.id,
      label: `${list.code} · ${list.name} (desde ${formatDate(list.validFrom)})`,
    })),
  )

  function findItemById(id: number | null): CatalogItemResponse | undefined {
    if (id === null) return undefined
    return items.value.find((item) => item.id === id)
  }

  onMounted(() => {
    void store.ensureLoaded().catch(() => {
      /* el banner de la vista ya pinta `error`; no hay nada más que hacer aquí */
    })
  })

  return {
    loading,
    error,
    itemOptions,
    priceListOptions,
    publishedPriceLists,
    findItemById,
    refresh: store.refresh,
  }
}
