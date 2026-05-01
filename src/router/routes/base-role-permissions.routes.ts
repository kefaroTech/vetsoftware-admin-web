import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const baseRolePermissionsRoutes: RouteRecordRaw[] = [
  {
    path: '/permisos-roles-base',
    name: ROUTE_NAMES.BASE_ROLE_PERMISSIONS_LIST,
    component: () => import('@/features/base-role-permissions/views/BaseRolePermissionsListView.vue'),
  },
  {
    path: '/permisos-roles-base/:id',
    name: ROUTE_NAMES.BASE_ROLE_PERMISSION_DETAIL,
    component: () => import('@/features/base-role-permissions/views/BaseRolePermissionDetailView.vue'),
    props: true,
  },
]
