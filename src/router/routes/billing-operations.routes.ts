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
/**
 * <p><b>Las cuatro pestañas del circuito del dinero</b> —devoluciones, intentos de
 * cobro, reversiones y saldo a favor— entran como hermanas de las cuatro
 * originales, y no como una sección aparte, por un motivo de trabajo y no de
 * ordenación: quien mira un documento vencido tiene que poder saltar a los intentos
 * de cobro que fallaron sobre él sin cambiar de pantalla. Son ocho rutas de la
 * misma cosa: el dinero de la plataforma.
 *
 * <p>Ninguna lleva `meta.permission` por la misma razón que las tres primeras: sus
 * endpoints de `/system/**` solo exigen `hasRole('SYSTEM')`, y poner un código de
 * permiso inventado rompería el día en que `hasPermission()` deje de ser un atajo
 * universal sin gatear a nadie hoy.
 */
export const BILLING_ROUTE_NAMES = {
  AWAITING_EXTERNAL: 'billing-awaiting-external',
  OVERDUE: 'billing-overdue',
  PAYMENTS: 'billing-payments',
  DUNNING: 'billing-dunning',
  REFUNDS: 'billing-refunds',
  ATTEMPTS: 'billing-attempts',
  REVERSALS: 'billing-reversals',
  CUSTOMER_CREDIT: 'billing-customer-credit',
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
      {
        path: 'intentos',
        name: BILLING_ROUTE_NAMES.ATTEMPTS,
        component: () => import('@/features/billing-operations/views/PaymentAttemptsView.vue'),
      },
      {
        path: 'devoluciones',
        name: BILLING_ROUTE_NAMES.REFUNDS,
        component: () => import('@/features/billing-operations/views/PaymentRefundsView.vue'),
      },
      {
        path: 'reversiones',
        name: BILLING_ROUTE_NAMES.REVERSALS,
        component: () => import('@/features/billing-operations/views/PaymentReversalsView.vue'),
      },
      {
        path: 'saldo-a-favor',
        name: BILLING_ROUTE_NAMES.CUSTOMER_CREDIT,
        component: () => import('@/features/billing-operations/views/CustomerCreditView.vue'),
      },
    ],
  },
]
