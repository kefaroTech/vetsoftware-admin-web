import type { RouteRecordRaw } from 'vue-router'

/**
 * Conciliación — una sola entrada, tres pestañas dentro.
 *
 * <p><b>Este fichero NO se registra a sí mismo</b>, igual que los seis de la onda
 * 1: los imports los añade una única instancia en `router/index.ts`, que es la
 * regla de no colisión de §7 de la especificación. Mientras esa línea no exista,
 * `/conciliacion` no resuelve. Lo que hace falta son exactamente dos líneas, y
 * ninguna de las dos es de esta tarea:
 *
 * <ol>
 *   <li>`import { reconciliationRoutes } from './routes/reconciliation.routes'`</li>
 *   <li>`...reconciliationRoutes,` en el array `routes`, después de
 *       `...billingOperationsRoutes` — la conciliación va detrás de cobranza en
 *       la cadena del modelo: primero se cobra, después se cuadra.</li>
 * </ol>
 *
 * <p>Y una tercera, en `src/components/layout/sidebar-nav.ts`, para que la
 * pantalla tenga entrada de menú bajo «Sistema»: un enlace a `/conciliacion` con
 * el rótulo «Conciliación». Sin ella la ruta existe y no se puede llegar a ella
 * más que tecleándola.
 *
 * <p><b>Sin `meta.permission`.</b> Las quince rutas de conciliación son
 * `/system/**` y su `@PreAuthorize` es `hasRole('SYSTEM')` a secas: todo operador
 * de esta consola es un `SystemUserContext` que lo recibe sin que se miren sus
 * permisos. Poner aquí un código inventado no restringiría nada — mismo criterio
 * y misma redacción que `platform-billing.routes.ts`.
 *
 * <p>Los nombres viven aquí y no en `src/constants/routes.ts` por lo mismo que
 * allí: ese fichero es un punto de serialización que varias tareas quieren tocar
 * a la vez, y nada de fuera necesita estos nombres.
 */
export const RECONCILIATION_ROUTE_NAMES = {
  RECONCILIATION: 'reconciliation',
} as const

export const reconciliationRoutes: RouteRecordRaw[] = [
  {
    path: '/conciliacion',
    name: RECONCILIATION_ROUTE_NAMES.RECONCILIATION,
    component: () => import('@/features/reconciliation/views/ReconciliationView.vue'),
    meta: { title: 'Conciliación' },
  },
]
