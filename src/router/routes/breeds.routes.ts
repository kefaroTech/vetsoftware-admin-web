import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const breedsRoutes: RouteRecordRaw[] = [
  {
    path: '/animales/razas',
    name: ROUTE_NAMES.BREEDS_LIST,
    component: () => import('@/features/breeds/views/BreedsListView.vue'),
    meta: { title: 'Razas' },
  },
  {
    path: '/animales/razas/:id',
    name: ROUTE_NAMES.BREED_DETAIL,
    component: () => import('@/features/breeds/views/BreedDetailView.vue'),
    meta: { title: 'Ficha de la raza' },
    props: true,
  },
]
