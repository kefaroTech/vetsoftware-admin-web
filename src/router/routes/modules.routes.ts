import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const modulesRoutes: RouteRecordRaw[] = [
  {
    path: '/modulos',
    name: ROUTE_NAMES.MODULES_LIST,
    component: () => import('@/features/modules/views/ModulesListView.vue'),
  },
  {
    path: '/modulos/:id',
    name: ROUTE_NAMES.MODULE_DETAIL,
    component: () => import('@/features/modules/views/ModuleDetailView.vue'),
    props: true,
  },
]
