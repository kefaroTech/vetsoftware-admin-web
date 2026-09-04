import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const laboratoryTestTypesRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/tipos-laboratorio',
    name: ROUTE_NAMES.LABORATORY_TEST_TYPES_LIST,
    component: () =>
      import('@/features/laboratory-test-types/views/LaboratoryTestTypesListView.vue'),
    meta: { title: 'Tipos de laboratorio' },
  },
  {
    path: '/catalogos-clinicos/tipos-laboratorio/:id',
    name: ROUTE_NAMES.LABORATORY_TEST_TYPE_DETAIL,
    component: () =>
      import('@/features/laboratory-test-types/views/LaboratoryTestTypeDetailView.vue'),
    meta: { title: 'Ficha del tipo de laboratorio' },
    props: true,
  },
]
