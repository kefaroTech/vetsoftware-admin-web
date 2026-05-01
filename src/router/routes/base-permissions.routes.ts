import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const basePermissionsRoutes: RouteRecordRaw[] = [
  {
    path: '/permisos-base',
    name: ROUTE_NAMES.BASE_PERMISSIONS_LIST,
    component: () => import('@/features/base-permissions/views/BasePermissionsListView.vue'),
  },
  {
    path: '/permisos-base/:id',
    name: ROUTE_NAMES.BASE_PERMISSION_DETAIL,
    component: () => import('@/features/base-permissions/views/BasePermissionDetailView.vue'),
    props: true,
  },
]
