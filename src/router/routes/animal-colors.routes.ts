import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const animalColorsRoutes: RouteRecordRaw[] = [
  {
    path: '/animales/colores',
    name: ROUTE_NAMES.ANIMAL_COLORS_LIST,
    component: () => import('@/features/animal-colors/views/AnimalColorsListView.vue'),
    meta: { title: 'Colores' },
  },
  {
    path: '/animales/colores/:id',
    name: ROUTE_NAMES.ANIMAL_COLOR_DETAIL,
    component: () => import('@/features/animal-colors/views/AnimalColorDetailView.vue'),
    meta: { title: 'Ficha del color' },
    props: true,
  },
]
