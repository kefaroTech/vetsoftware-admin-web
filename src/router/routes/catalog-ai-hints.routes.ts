import type { RouteRecordRaw } from 'vue-router'

/**
 * Rutas de las <b>pistas del asistente</b> sobre el catálogo.
 *
 * <p><b>Bajo `/asistente/` y no bajo `/catalogo-comercial/`.</b> La pista
 * describe un artículo del catálogo, pero lo que gobierna es el comportamiento
 * del asistente: quien viene aquí viene porque el asistente propone mal, no
 * porque el artículo esté mal definido. Colgarla del catálogo comercial además
 * empujaría a meterla como tercera pestaña de `CommercialCatalogView`, que ya se
 * partió una vez por rebasar el techo de 500 líneas.
 *
 * <p><b>`:catalogItemId` y no `:id`</b>: el recurso es «la pista vigente de un
 * artículo» y su identidad es el artículo, no el `id` de la fila de la revisión.
 *
 * <p><b>Los nombres viven aquí y no en `src/constants/routes.ts`</b>, por el
 * mismo motivo que en `proposal-suppression.routes.ts`, `limits.routes.ts`,
 * `quotes.routes.ts` y `trials.routes.ts`: ese fichero es un punto de
 * serialización que varias tareas querrían tocar a la vez, y nada de fuera
 * necesita estos nombres — el menú apunta por `path`, que es lo que
 * `AppSidebar.isAvailable` resuelve.
 *
 * <p><b>Sin `meta.permission`</b>, misma decisión y mismo motivo que la
 * supresión de datos: los seis puertos de detrás declaran únicamente
 * `hasRole('SYSTEM')` y no hay ningún código de permiso de negocio que les
 * corresponda. Inventarle uno rompería el día en que `hasPermission()` deje de
 * ser un atajo universal para el usuario de plataforma.
 */
export const CATALOG_AI_HINT_ROUTE_NAMES = {
  LIST: 'catalog-ai-hints-list',
  DETAIL: 'catalog-ai-hint-detail',
} as const

export const catalogAiHintsRoutes: RouteRecordRaw[] = [
  {
    path: '/asistente/pistas',
    name: CATALOG_AI_HINT_ROUTE_NAMES.LIST,
    component: () => import('@/features/catalog-ai-hints/views/CatalogAiHintsListView.vue'),
    meta: { title: 'Pistas del asistente · Lumbre' },
  },
  {
    path: '/asistente/pistas/:catalogItemId',
    name: CATALOG_AI_HINT_ROUTE_NAMES.DETAIL,
    component: () => import('@/features/catalog-ai-hints/views/CatalogAiHintDetailView.vue'),
    meta: { title: 'Historial de la pista · Lumbre' },
  },
]
