import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const spaTypesRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/tipos-spa',
    name: ROUTE_NAMES.SPA_TYPES_LIST,
    component: () => import('@/features/spa-types/views/SpaTypesListView.vue'),
  },
  {
    path: '/catalogos-clinicos/tipos-spa/:id',
    name: ROUTE_NAMES.SPA_TYPE_DETAIL,
    component: () => import('@/features/spa-types/views/SpaTypeDetailView.vue'),
    props: true,
  },
]
