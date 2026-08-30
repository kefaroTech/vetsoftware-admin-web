import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * El nombre de la sub-vista del artículo vive **aquí y no en
 * `src/constants/routes.ts`**, por el mismo motivo que en `quotes.routes.ts` y
 * `platform-billing.routes.ts`: ese fichero es un
 * punto de serialización que varias tareas querrían tocar a la vez. Nada de
 * fuera necesita este nombre —el catálogo enlaza por ruta— así que se declara
 * junto a la ruta que nombra.
 */
export const COMMERCIAL_CATALOG_ROUTE_NAMES = {
  CATALOG_ITEM_BRIDGES: 'catalog-item-bridges',
} as const

export const commercialCatalogRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogo-comercial',
    name: ROUTE_NAMES.COMMERCIAL_CATALOG,
    component: () => import('@/features/commercial-catalog/views/CommercialCatalogView.vue'),
  },
  {
    /**
     * Los tres puentes del artículo (§4.1, W3-A). Carga diferida como el resto:
     * el presupuesto de JavaScript va al 1 % de margen y esta pantalla solo la
     * abre quien está sembrando el catálogo.
     */
    path: '/catalogo-comercial/articulos/:id',
    name: COMMERCIAL_CATALOG_ROUTE_NAMES.CATALOG_ITEM_BRIDGES,
    component: () => import('@/features/commercial-catalog/views/CatalogItemBridgesView.vue'),
    meta: { title: 'Puentes del artículo · VetSoftware' },
  },
]
