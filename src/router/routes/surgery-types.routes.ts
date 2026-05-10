import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const surgeryTypesRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/tipos-cirugia',
    name: ROUTE_NAMES.SURGERY_TYPES_LIST,
    component: () => import('@/features/surgery-types/views/SurgeryTypesListView.vue'),
  },
  {
    path: '/catalogos-clinicos/tipos-cirugia/:id',
    name: ROUTE_NAMES.SURGERY_TYPE_DETAIL,
    component: () => import('@/features/surgery-types/views/SurgeryTypeDetailView.vue'),
    props: true,
  },
]
