import type { RouteRecordRaw } from 'vue-router'

/**
 * Facturación de plataforma (§4.6, tarea W1-F).
 *
 * <p><b>Una sola ruta, bajo «Sistema».</b> §2.1 lo decide así a propósito:
 * `platform-billing-config` es una fila única y darle una entrada de primer nivel
 * la pondría al mismo peso que «Contratos». Vive junto a la numeración de
 * documentos porque las dos son ajustes del mismo bloque, y las dos las mira la
 * misma persona el mismo día.
 *
 * <p><b>Los nombres de ruta viven aquí y no en `src/constants/routes.ts`</b>, por
 * el mismo motivo que en `quotes.routes.ts` y `configurator.routes.ts`: ese
 * fichero es un punto de serialización que las cinco tareas de la onda 1 querrían
 * tocar a la vez. Nada de fuera necesita este nombre —`AppSidebar` enlaza por
 * ruta— así que se declara junto a la ruta que nombra.
 *
 * <p><b>Sin `meta.permission`.</b> Las cuatro rutas de esta pantalla son globales
 * de plataforma y su `@PreAuthorize` es `hasRole('SYSTEM')` a secas, sin ninguna
 * `hasAuthority(...)` alternativa (`FindPlatformBillingConfigUseCase.java:24`,
 * `UpdatePlatformBillingConfigUseCase.java:20`, y la nota de
 * `src/constants/permissions.ts` que las enumera). Todo operador de esta consola
 * es un `SystemUserContext` y recibe el rol sin que se miren sus permisos, así
 * que un código aquí no restringiría nada y rompería el día en que
 * `hasPermission()` deje de ser un atajo universal.
 *
 * <p>Este fichero <b>no se registra a sí mismo</b>: los imports de la onda 1 los
 * añade una sola instancia en `router/index.ts` (tarea W1-B), que es la regla de
 * no colisión de §7.
 */
export const PLATFORM_BILLING_ROUTE_NAMES = {
  PLATFORM_BILLING_CONFIG: 'platform-billing-config',
} as const

export const platformBillingRoutes: RouteRecordRaw[] = [
  {
    path: '/configuracion/facturacion',
    name: PLATFORM_BILLING_ROUTE_NAMES.PLATFORM_BILLING_CONFIG,
    component: () => import('@/features/platform-billing/views/PlatformBillingConfigView.vue'),
    meta: { title: 'Facturación de plataforma · VetSoftware' },
  },
]
