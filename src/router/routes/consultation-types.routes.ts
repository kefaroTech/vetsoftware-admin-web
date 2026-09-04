import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const consultationTypesRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/tipos-consulta',
    name: ROUTE_NAMES.CONSULTATION_TYPES_LIST,
    component: () => import('@/features/consultation-types/views/ConsultationTypesListView.vue'),
    meta: { title: 'Tipos de consulta' },
  },
  {
    path: '/catalogos-clinicos/tipos-consulta/:id',
    name: ROUTE_NAMES.CONSULTATION_TYPE_DETAIL,
    component: () => import('@/features/consultation-types/views/ConsultationTypeDetailView.vue'),
    meta: { title: 'Ficha del tipo de consulta' },
    props: true,
  },
]
