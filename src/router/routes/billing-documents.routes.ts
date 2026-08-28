import type { RouteRecordRaw } from 'vue-router'

/**
 * Rutas de los documentos de cobro (§G2–G3 de la ampliación).
 *
 * <p><b>El detalle lleva la empresa en la URL, y son dos parámetros a
 * propósito.</b> `GET /subscription-billing/documents/{id}` resuelve la empresa
 * con `authz.currentCompanyId()`, que para el operador de esta consola sale de la
 * cabecera `X-Company-Id`. Una pantalla que tomara esa empresa de un store de
 * «empresa activa» estaría decidiendo con un valor invisible de quién es la
 * cartera que se mira; con la empresa en la ruta, el enlace es completo, se pega
 * en un ticket y dice a quién pertenece el documento antes de cargarlo. Es el
 * mismo patrón que ya usa el expediente del contrato
 * (`/suscripciones/:companyId(\d+)/:id(\d+)/…`), no un tercero inventado.
 *
 * <p><b>Los nombres viven aquí y no en `src/constants/routes.ts`</b>, por el mismo
 * motivo que en `quotes.routes.ts` y en `billing-operations.routes.ts`: ese
 * fichero lo escriben a la vez varias tareas y es un punto de colisión.
 *
 * <p><b>Sin `meta.permission`.</b> Las tres rutas HTTP que alimentan estas
 * pantallas están abiertas con `hasRole('SYSTEM') or (hasAuthority(…) and
 * @authz.isMyCompany(#companyId))`: para el operador de esta consola la rama que
 * aplica es la primera, que no mira permisos. Poner aquí un código de permiso
 * inventado rompería el día en que `hasPermission()` deje de ser un atajo
 * universal, y no gatearía a nadie hoy.
 */
export const BILLING_DOCUMENT_ROUTE_NAMES = {
  LIST: 'billing-documents',
  DETAIL: 'billing-document-detail',
} as const

export const billingDocumentsRoutes: RouteRecordRaw[] = [
  {
    path: '/documentos',
    name: BILLING_DOCUMENT_ROUTE_NAMES.LIST,
    component: () => import('@/features/billing-documents/views/BillingDocumentsView.vue'),
  },
  {
    path: '/documentos/:companyId(\\d+)/:id(\\d+)',
    name: BILLING_DOCUMENT_ROUTE_NAMES.DETAIL,
    component: () => import('@/features/billing-documents/views/BillingDocumentDetailView.vue'),
  },
]
