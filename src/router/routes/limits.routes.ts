import type { RouteRecordRaw } from 'vue-router'

/**
 * Rutas de **cupo**: los ejes de límite de la plataforma, las excepciones de
 * techo negociadas, las cuentas desbordadas y la bitácora.
 *
 * <p><b>Los nombres viven aquí y no en `src/constants/routes.ts`</b>, por el mismo
 * motivo que en `quotes.routes.ts` y `billing-operations.routes.ts`: ese fichero
 * lo escriben a la vez varias tareas y es un punto de colisión. Ninguna de estas
 * pantallas la referencia hoy `AppSidebar.vue` ni `DashboardView.vue`, así que
 * no hace falta que estén allí.
 *
 * <p><b>Las secciones son RUTAS, no pestañas de componente.</b> Enlace profundo
 * para pegar en un ticket, botón «atrás» que funciona, un SFC por pantalla —el
 * presupuesto fija `maxSfcLines: 500`— y cero contrato de teclado del patrón
 * Tabs del APG, porque un `<nav>` de enlaces ya tiene su semántica.
 *
 * <p><b>`/limites` abre en «Ejes de cupo» y no en un resumen.</b> Los ejes son el
 * catálogo del que cuelga todo lo demás: sin ellos, ni las excepciones ni la
 * bitácora se pueden leer, porque las dos hablan de `limitDimensionId`.
 *
 * <p><b>El expediente de un eje cuelga fuera del armazón de pestañas.</b> Es una
 * pantalla de un registro concreto, no una sección hermana; dejar las pestañas
 * encima haría creer que «Excepciones» es una pestaña *de ese eje*, que es
 * justamente lo que no es.
 *
 * <p><b>Sobre `meta.permission`.</b> No lo lleva ninguna, y eso es deliberado.
 * Las cinco rutas de `/system/**` de cupo declaran únicamente `hasRole('SYSTEM')`
 * —son barridos y escrituras de plataforma, sin autoridad de negocio más fina
 * que gatear—, y `/limit-dimensions` es un catálogo global. Ponerles un código
 * de permiso inventado rompería el día en que `hasPermission()` deje de ser un
 * atajo universal para `SYSTEM_USER`. Ver la cabecera de
 * `src/constants/permissions.ts`.
 */
export const LIMITS_ROUTE_NAMES = {
  ROOT: 'limits',
  DIMENSIONS: 'limit-dimensions',
  DIMENSION_DETAIL: 'limit-dimension-detail',
  OVERRIDES: 'limit-overrides',
  OVER_LIMIT: 'limit-over-limit-accounts',
  EVENTS: 'limit-events',
} as const

/** El destino del expediente de un eje, para que las tablas no compongan rutas a mano. */
export function limitDimensionTarget(id: number) {
  return { name: LIMITS_ROUTE_NAMES.DIMENSION_DETAIL, params: { id: String(id) } }
}

export const limitsRoutes: RouteRecordRaw[] = [
  {
    path: '/limites',
    name: LIMITS_ROUTE_NAMES.ROOT,
    redirect: { name: LIMITS_ROUTE_NAMES.DIMENSIONS },
    component: () => import('@/features/limits/views/LimitsView.vue'),
    meta: { title: 'Cupos y límites' },
    children: [
      {
        path: 'ejes',
        name: LIMITS_ROUTE_NAMES.DIMENSIONS,
        component: () => import('@/features/limits/views/LimitDimensionsListView.vue'),
        meta: { title: 'Ejes de cupo' },
      },
      {
        path: 'excepciones',
        name: LIMITS_ROUTE_NAMES.OVERRIDES,
        component: () => import('@/features/limits/views/LimitOverridesView.vue'),
        meta: { title: 'Excepciones de techo' },
      },
      {
        path: 'desbordadas',
        name: LIMITS_ROUTE_NAMES.OVER_LIMIT,
        component: () => import('@/features/limits/views/OverLimitAccountsView.vue'),
        meta: { title: 'Cuentas desbordadas' },
      },
      {
        path: 'bitacora',
        name: LIMITS_ROUTE_NAMES.EVENTS,
        component: () => import('@/features/limits/views/LimitEventsView.vue'),
        meta: { title: 'Bitácora de cupo' },
      },
    ],
  },
  {
    path: '/limites/ejes/:id',
    name: LIMITS_ROUTE_NAMES.DIMENSION_DETAIL,
    // `props: true` como en el resto de expedientes del repo: la vista recibe
    // `id` como prop y no lee `useRoute()`, que es lo que la hace montable en
    // una prueba sin router.
    props: true,
    component: () => import('@/features/limits/views/LimitDimensionDetailView.vue'),
    meta: { title: 'Ficha del eje de cupo' },
  },
]
