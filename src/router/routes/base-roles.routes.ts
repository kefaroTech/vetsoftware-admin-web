import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const baseRolesRoutes: RouteRecordRaw[] = [
  {
    path: '/roles-base',
    name: ROUTE_NAMES.BASE_ROLES_LIST,
    component: () => import('@/features/base-roles/views/BaseRolesListView.vue'),
  },
  {
    path: '/roles-base/:id',
    name: ROUTE_NAMES.BASE_ROLE_DETAIL,
    component: () => import('@/features/base-roles/views/BaseRoleDetailView.vue'),
    props: true,
  },
]
