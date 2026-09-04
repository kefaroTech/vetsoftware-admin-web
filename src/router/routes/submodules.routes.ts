import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const submodulesRoutes: RouteRecordRaw[] = [
  {
    path: '/submodulos',
    name: ROUTE_NAMES.SUBMODULES_LIST,
    component: () => import('@/features/submodules/views/SubmodulesListView.vue'),
    meta: { title: 'Submódulos' },
  },
  {
    path: '/submodulos/:id',
    name: ROUTE_NAMES.SUBMODULE_DETAIL,
    component: () => import('@/features/submodules/views/SubmoduleDetailView.vue'),
    meta: { title: 'Ficha del submódulo' },
    props: true,
  },
]
