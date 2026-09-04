import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * Alta de superadministradores de plataforma por invitación.
 *
 * Las tres llevan `meta: { public: true }` — es lo que mira `authGuard`
 * (`auth.guard.ts:10`) y sin ello un visitante sin token acaba redirigido a
 * `/login?redirect=…`, que en estas rutas es justo lo contrario de lo que se
 * quiere: quien llega aquí NO tiene cuenta todavía, o la está activando.
 *
 * `permissionGuard` corre después y solo actúa si la ruta declara
 * `meta.permission` (`permission.guard.ts:38-39`); ninguna de estas lo declara,
 * así que no exige permisos.
 */
export const platformAccessRoutes: RouteRecordRaw[] = [
  {
    path: '/solicitar-acceso',
    name: ROUTE_NAMES.ACCESS_REQUEST,
    component: () => import('@/features/platform-access/views/SolicitarAccesoView.vue'),
    meta: { public: true, title: 'Solicitar acceso' },
  },
  {
    // El token llega por query param: `/aprobar-acceso?token=…`
    path: '/aprobar-acceso',
    name: ROUTE_NAMES.ACCESS_APPROVAL,
    component: () => import('@/features/platform-access/views/AprobarAccesoView.vue'),
    meta: { public: true, title: 'Aprobar acceso' },
  },
  {
    path: '/aceptar-invitacion',
    name: ROUTE_NAMES.ACCESS_INVITATION,
    component: () => import('@/features/platform-access/views/AceptarInvitacionView.vue'),
    meta: { public: true, title: 'Aceptar invitación' },
  },
]
