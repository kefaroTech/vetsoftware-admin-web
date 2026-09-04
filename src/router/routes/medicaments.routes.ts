import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const medicamentsRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/medicamentos',
    name: ROUTE_NAMES.MEDICAMENTS_LIST,
    component: () => import('@/features/medicaments/views/MedicamentsListView.vue'),
    meta: { title: 'Medicamentos' },
  },
  {
    // ANTES que `/:id`: si no, «plataforma» casaría como identificador y la
    // ficha de detalle intentaría abrir el medicamento «plataforma».
    path: '/catalogos-clinicos/medicamentos/plataforma',
    name: ROUTE_NAMES.MEDICAMENTS_PLATFORM,
    component: () => import('@/features/medicaments/views/MedicamentsPlatformView.vue'),
    meta: { title: 'Medicamentos en la plataforma' },
  },
  {
    path: '/catalogos-clinicos/medicamentos/:id',
    name: ROUTE_NAMES.MEDICAMENT_DETAIL,
    component: () => import('@/features/medicaments/views/MedicamentDetailView.vue'),
    meta: { title: 'Ficha del medicamento' },
    props: true,
  },
]
