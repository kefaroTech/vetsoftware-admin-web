import type { RouteRecordRaw } from 'vue-router'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Rutas de cotizaciones (tarea W1-D).
 *
 * <p><b>Los nombres viven aquí y no en `src/constants/routes.ts`</b> a propósito: ese fichero lo
 * escriben a la vez las cinco tareas de la onda 1 y es un punto de colisión. Exportarlos desde el
 * propio módulo de rutas deja que W1-B —la única instancia que toca `router/index.ts` y
 * `AppSidebar.vue`— los importe de un sitio estable sin que dos tareas editen el mismo archivo.
 * Si más adelante se consolidan en `ROUTE_NAMES`, es un movimiento mecánico de tres literales.
 *
 * <p><b>Sobre `meta.permission`.</b> Solo lo lleva el detalle, que es la única de las tres rutas
 * cuyo `@PreAuthorize` declara de verdad una autoridad de negocio (`quote.read`); el listado de
 * plataforma y el alta solo exigen `hasRole('SYSTEM')`. Ponerles un código inventado rompería el
 * día en que `hasPermission()` deje de ser un atajo universal para los usuarios de sistema. Hoy
 * **ninguno de los tres gatea a nadie**: todo operador de esta consola es `SystemUserContext` y
 * recibe `ROLE_SYSTEM` sin que se miren sus permisos, así que esto documenta la intención, no
 * restringe el acceso.
 */
export const QUOTE_ROUTE_NAMES = {
  QUOTES_LIST: 'quotes-list',
  QUOTE_NEW: 'quote-new',
  QUOTE_DETAIL: 'quote-detail',
} as const

export const quotesRoutes: RouteRecordRaw[] = [
  {
    path: '/cotizaciones',
    name: QUOTE_ROUTE_NAMES.QUOTES_LIST,
    component: () => import('@/features/quotes/views/QuotesListView.vue'),
  },
  {
    // Antes que `/cotizaciones/:id`: si no, «nueva» entraría como identificador.
    path: '/cotizaciones/nueva',
    name: QUOTE_ROUTE_NAMES.QUOTE_NEW,
    component: () => import('@/features/quotes/views/NewQuoteView.vue'),
  },
  {
    path: '/cotizaciones/:id',
    name: QUOTE_ROUTE_NAMES.QUOTE_DETAIL,
    component: () => import('@/features/quotes/views/QuoteDetailView.vue'),
    props: true,
    meta: { permission: PERMISSIONS.QUOTE_READ },
  },
]
