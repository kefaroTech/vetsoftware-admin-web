import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const configRoutes: RouteRecordRaw[] = [
  {
    path: '/configuracion',
    name: ROUTE_NAMES.CONFIG,
    component: () => import('@/features/config/views/ConfigView.vue'),
    meta: { title: 'Configuración' },
  },
]
