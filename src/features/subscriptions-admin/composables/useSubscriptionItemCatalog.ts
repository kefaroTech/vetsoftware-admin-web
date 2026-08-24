import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubscriptionItemCatalogStore } from '../stores/subscription-item-catalog.store'
import { useSubscriptionRecord } from './useSubscriptionRecord'
import type {
  CatalogItemResponse,
  CatalogPriceResponse,
} from '@/features/commercial-catalog/types/commercial-catalog.types'

/**
 * El desplegable de «Añadir artículo» y <b>el precio que se le congela a la línea
 * nueva</b>.
 *
 * <p>Sigue la convención de catálogos del repositorio: `options`, `loading`,
 * `error`, `findById`, `refresh` y carga en `onMounted` si la cache está vacía;
 * el componente pinta banner rojo si hay error y «Cargando…» mientras carga
 * (referencias: `useSpecies`, `useGeoCascade`, `useQuoteCatalog`).
 *
 * <p><b>Lo que este composable NO es: un editor de precios.</b> El precio no se
 * elige ni se teclea — se <i>resuelve</i> desde la tarifa que el contrato tiene
 * aplicada (`subscription.priceListId`) y su ciclo de facturación, y se enseña
 * como un hecho antes de firmar. Es la consecuencia directa de que `unitAmount`,
 * `includedQuantity` y `taxRate` vayan congelados: si el operador pudiera
 * escribirlos, «editar el precio» —la operación que §3.3 dice que no existe—
 * estaría disponible en el alta.
 *
 * <p>Y por eso, cuando la tarifa no tiene precio para ese artículo y ciclo, el
 * alta <b>se bloquea con una explicación</b> en vez de abrir un campo de importe.
 * La salida es publicar el precio en la tarifa, que es donde vive esa decisión.
 */
export function useSubscriptionItemCatalog() {
  const store = useSubscriptionItemCatalogStore()
  const { items, pricesByList, loading, error } = storeToRefs(store)
  const { subscription } = useSubscriptionRecord()

  const priceListId = computed(() => subscription.value?.priceListId ?? null)
  const billingCycle = computed(() => subscription.value?.billingCycle ?? null)

  /**
   * Solo lo que se puede vender hoy. Un artículo `DRAFT` o `DEPRECATED` no aparece
   * deshabilitado: sencillamente no está, porque contratarlo no es una operación
   * que exista. Mismo criterio que `useQuoteCatalog`, para que la consola no diga
   * dos cosas distintas sobre el mismo catálogo.
   */
  const sellableItems = computed(() =>
    items.value
      .filter((item) => item.status === 'ACTIVE')
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es')),
  )

  function findItemById(id: number | null): CatalogItemResponse | undefined {
    if (id === null) return undefined
    return items.value.find((item) => item.id === id)
  }

  /**
   * ¿Ya se sabe qué artículo es del núcleo?
   *
   * <p>Lo pregunta la tabla antes de pintar «Dar de baja». Mientras el catálogo no
   * haya llegado la respuesta es «no se sabe», y una acción que el backend va a
   * rechazar es peor que una acción que tarda un segundo en aparecer.
   */
  const ready = computed(() => items.value.length > 0)

  /**
   * El artículo del núcleo no se da de baja: la baja la rechaza el backend, y
   * ofrecerla es prometer algo que no existe (§4.4.2). Sin catálogo cargado devuelve
   * `true` —«trátalo como núcleo»— para que la acción no se ofrezca a ciegas.
   */
  function isCore(catalogItemId: number): boolean {
    return findItemById(catalogItemId)?.core ?? true
  }

  /**
   * El precio congelado que le toca a esta cantidad.
   *
   * <p>El catálogo tiene precios <b>por tramo</b> (`tierMin`/`tierMax`): 1–5
   * usuarios a un precio, 6–20 a otro. Elegir el tramo por la cantidad pedida es
   * lo que hace que el importe que se enseña antes de firmar sea el que se va a
   * cobrar. `tierMax` vacío es el tramo abierto, el último.
   *
   * <p>Devuelve `undefined` cuando la tarifa no cubre ese artículo, ese ciclo o esa
   * cantidad. No hay valor por defecto: inventar un precio en el cliente es
   * exactamente lo que esta pantalla no puede hacer.
   */
  function findPrice(
    catalogItemId: number | null,
    quantity: number,
  ): CatalogPriceResponse | undefined {
    const list = priceListId.value
    const cycle = billingCycle.value
    if (catalogItemId === null || list === null || cycle === null) return undefined
    return (pricesByList.value[list] ?? [])
      .filter(
        (price) =>
          price.catalogItemId === catalogItemId &&
          price.billingCycle === cycle &&
          price.tierMin <= quantity &&
          (price.tierMax === null || quantity <= price.tierMax),
      )
      .sort((a, b) => b.tierMin - a.tierMin)[0]
  }

  function refresh(): Promise<void> {
    const list = priceListId.value
    return list === null ? Promise.resolve() : store.refresh(list)
  }

  onMounted(() => {
    const list = priceListId.value
    if (list === null) return
    void store.ensureLoaded(list).catch(() => {
      /* el banner del modal ya pinta `error`; no hay nada más que hacer aquí */
    })
  })

  return {
    loading,
    error,
    ready,
    sellableItems,
    priceListId,
    billingCycle,
    findItemById,
    isCore,
    findPrice,
    refresh,
  }
}
