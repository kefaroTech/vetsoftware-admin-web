import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const diagnosticImagingTypesRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/tipos-imagen',
    name: ROUTE_NAMES.DIAGNOSTIC_IMAGING_TYPES_LIST,
    component: () =>
      import('@/features/diagnostic-imaging-types/views/DiagnosticImagingTypesListView.vue'),
  },
  {
    path: '/catalogos-clinicos/tipos-imagen/:id',
    name: ROUTE_NAMES.DIAGNOSTIC_IMAGING_TYPE_DETAIL,
    component: () =>
      import('@/features/diagnostic-imaging-types/views/DiagnosticImagingTypeDetailView.vue'),
    props: true,
  },
]
