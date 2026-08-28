import type { RouteRecordRaw } from 'vue-router'

/**
 * Rutas de **pruebas y concesiones**: el barrido de vencimientos de toda la
 * plataforma y la consulta de fotos de permisos.
 *
 * <p><b>Los nombres viven aquí y no en `src/constants/routes.ts`</b>, por el mismo
 * motivo que en `limits.routes.ts`, `quotes.routes.ts` y
 * `billing-operations.routes.ts`: ese fichero lo escriben a la vez varias tareas
 * y es un punto de colisión. Ninguna de estas dos pantallas la referencia hoy
 * `AppSidebar.vue` ni `DashboardView.vue`.
 *
 * <p><b>⚠️ Este módulo todavía no está enganchado al router.</b> `src/router/
 * index.ts` es un punto de serialización de la campaña y este lote no lo toca.
 * Para activar la sección hacen falta exactamente dos líneas, y ninguna otra:
 *
 * <pre>
 *   import { trialsRoutes } from './routes/trials.routes'   // junto al resto de imports
 *   ...trialsRoutes,                                        // dentro del array `routes`
 * </pre>
 *
 * <p>Y si se quiere que aparezca en la barra lateral, una entrada más en
 * `sidebar-nav.ts` apuntando a {@link TRIALS_ROUTE_NAMES.ROOT} con el rótulo
 * «Pruebas y concesiones». Mientras tanto las dos pantallas son alcanzables por
 * URL —que es lo que hace falta para pegar el enlace en un ticket— en cuanto se
 * añadan esas dos líneas.
 *
 * <p><b>`/pruebas` abre en «Vencimientos» y no en un resumen.</b> Es la única de
 * las dos secciones que es trabajo pendiente: se entra a ver a quién hay que
 * llamar hoy, no a consultar un archivo. La consulta de fotos se usa cuando llega
 * una pregunta concreta, y para eso ya se llega por su enlace.
 *
 * <p><b>Sobre `meta.permission`.</b> No lo lleva ninguna, y es deliberado: es la
 * misma decisión y el mismo motivo que `limits.routes.ts` deja escritos. Los tres
 * endpoints de `/system/**` que hay detrás declaran únicamente `hasRole('SYSTEM')`
 * —son barridos y lecturas de plataforma, sin autoridad de negocio más fina que
 * gatear—, así que ponerles un código de permiso inventado rompería el día en que
 * `hasPermission()` deje de ser un atajo universal para `SYSTEM_USER`. Ver la
 * cabecera de `src/constants/permissions.ts`.
 */
export const TRIALS_ROUTE_NAMES = {
  ROOT: 'trials',
  EXPIRATIONS: 'trial-expirations',
  SNAPSHOTS: 'entitlement-snapshots',
} as const

export const trialsRoutes: RouteRecordRaw[] = [
  {
    path: '/pruebas',
    name: TRIALS_ROUTE_NAMES.ROOT,
    redirect: { name: TRIALS_ROUTE_NAMES.EXPIRATIONS },
    component: () => import('@/features/trials/views/TrialsView.vue'),
    children: [
      {
        path: 'vencimientos',
        name: TRIALS_ROUTE_NAMES.EXPIRATIONS,
        component: () => import('@/features/trials/views/TrialExpirationsView.vue'),
      },
      {
        path: 'fotos',
        name: TRIALS_ROUTE_NAMES.SNAPSHOTS,
        component: () => import('@/features/trials/views/EntitlementSnapshotView.vue'),
      },
    ],
  },
]
