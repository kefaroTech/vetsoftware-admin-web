import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const vaccinationTypesRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/tipos-vacuna',
    name: ROUTE_NAMES.VACCINATION_TYPES_LIST,
    component: () => import('@/features/vaccination-types/views/VaccinationTypesListView.vue'),
    meta: { title: 'Tipos de vacuna' },
  },
  {
    path: '/catalogos-clinicos/tipos-vacuna/:id',
    name: ROUTE_NAMES.VACCINATION_TYPE_DETAIL,
    component: () => import('@/features/vaccination-types/views/VaccinationTypeDetailView.vue'),
    meta: { title: 'Ficha del tipo de vacuna' },
    props: true,
  },
]
