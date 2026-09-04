import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const speciesRoutes: RouteRecordRaw[] = [
  {
    path: '/animales/especies',
    name: ROUTE_NAMES.SPECIES_LIST,
    component: () => import('@/features/species/views/SpeciesListView.vue'),
    meta: { title: 'Especies' },
  },
  {
    path: '/animales/especies/:id',
    name: ROUTE_NAMES.SPECIE_DETAIL,
    component: () => import('@/features/species/views/SpecieDetailView.vue'),
    meta: { title: 'Ficha de la especie' },
    props: true,
  },
]
