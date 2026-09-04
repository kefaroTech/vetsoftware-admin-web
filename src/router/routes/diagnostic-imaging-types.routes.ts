import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const diagnosticImagingTypesRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/tipos-imagen',
    name: ROUTE_NAMES.DIAGNOSTIC_IMAGING_TYPES_LIST,
    component: () =>
      import('@/features/diagnostic-imaging-types/views/DiagnosticImagingTypesListView.vue'),
    meta: { title: 'Tipos de imagen' },
  },
  {
    path: '/catalogos-clinicos/tipos-imagen/:id',
    name: ROUTE_NAMES.DIAGNOSTIC_IMAGING_TYPE_DETAIL,
    component: () =>
      import('@/features/diagnostic-imaging-types/views/DiagnosticImagingTypeDetailView.vue'),
    meta: { title: 'Ficha del tipo de imagen' },
    props: true,
  },
]
