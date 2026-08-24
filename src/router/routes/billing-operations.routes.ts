import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Rutas de cobranza (tarea W1-E).
 *
 * <p><b>Las cuatro pestañas son rutas, no pestañas de componente</b> (§2.2 de la
 * especificación): enlace profundo para pegar en un ticket, botón «atrás» que
 * funciona, un SFC por pantalla —el presupuesto fija `maxSfcLines: 500`— y cero
 * contrato de teclado del patrón Tabs del APG, porque un `<nav>` de enlaces ya
 * tiene su semántica.
 *
 * <p><b>`/cobranza` redirige a «Pendiente de facturar», que no es un resumen.</b>
 * Los documentos atascados esperando la referencia externa son la lista de
 * trabajo de una persona cada mes; un panel de indicadores no le dice a nadie
 * qué hacer a continuación. El `redirect` va en el registro padre —el patrón
 * documentado de vue-router para rutas anidadas— y solo actúa cuando la ruta
 * coincidente es el padre exacto: navegar a una hija sigue montando el armazón.
 *
 * <p><b>Los nombres de las hijas viven aquí y no en `src/constants/routes.ts`</b>,
 * por el mismo motivo que en `quotes.routes.ts`: ese fichero lo escriben a la
 * vez varias tareas de la onda 1 y es un punto de colisión. `BILLING_OPERATIONS`
 * sí sigue en `ROUTE_NAMES` porque ya estaba y lo referencian `AppSidebar.vue` y
 * `DashboardView.vue`, que son de otra instancia.
 *
 * <p><b>Sobre `meta.permission`.</b> Solo lo llevan las dos pestañas cuyo
 * `@PreAuthorize` declara de verdad una autoridad de negocio
 * (`subscriptionPayment.read`, `dunningEvent.read`). Los tres listados de
 * `/system/**` de documentos solo exigen `hasRole('SYSTEM')`, así que ponerles un
 * código inventado rompería el día en que `hasPermission()` deje de ser un atajo
 * universal. Hoy **ninguno gatea a nadie**: todo operador de esta consola es
 * `SystemUserContext` y recibe `ROLE_SYSTEM` sin que se miren sus permisos. Esto
 * documenta la intención, no restringe el acceso.
 */
export const BILLING_ROUTE_NAMES = {
  AWAITING_EXTERNAL: 'billing-awaiting-external',
  OVERDUE: 'billing-overdue',
  PAYMENTS: 'billing-payments',
  DUNNING: 'billing-dunning',
} as const

export const billingOperationsRoutes: RouteRecordRaw[] = [
  {
    path: '/cobranza',
    name: ROUTE_NAMES.BILLING_OPERATIONS,
    redirect: { name: BILLING_ROUTE_NAMES.AWAITING_EXTERNAL },
    component: () => import('@/features/billing-operations/views/BillingOperationsView.vue'),
    children: [
      {
        path: 'pendientes',
        name: BILLING_ROUTE_NAMES.AWAITING_EXTERNAL,
        component: () => import('@/features/billing-operations/views/AwaitingExternalView.vue'),
      },
      {
        path: 'vencidos',
        name: BILLING_ROUTE_NAMES.OVERDUE,
        component: () => import('@/features/billing-operations/views/OverdueDocumentsView.vue'),
      },
      {
        path: 'pagos',
        name: BILLING_ROUTE_NAMES.PAYMENTS,
        component: () => import('@/features/billing-operations/views/PaymentsView.vue'),
        meta: { permission: PERMISSIONS.SUBSCRIPTION_PAYMENT_READ },
      },
      {
        path: 'mora',
        name: BILLING_ROUTE_NAMES.DUNNING,
        component: () => import('@/features/billing-operations/views/DunningEventsView.vue'),
        meta: { permission: PERMISSIONS.DUNNING_EVENT_READ },
      },
    ],
  },
]
