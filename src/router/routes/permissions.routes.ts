import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const permissionsRoutes: RouteRecordRaw[] = [
  {
    path: '/permisos',
    name: ROUTE_NAMES.PERMISSIONS_LIST,
    component: () => import('@/features/permissions/views/PermissionsListView.vue'),
  },
  {
    path: '/permisos/:id',
    name: ROUTE_NAMES.PERMISSION_DETAIL,
    component: () => import('@/features/permissions/views/PermissionDetailView.vue'),
    props: true,
  },
]
