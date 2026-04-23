import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const membershipsRoutes: RouteRecordRaw[] = [
  {
    path: '/membresias',
    name: ROUTE_NAMES.MEMBERSHIPS_LIST,
    component: () => import('@/features/memberships/views/MembershipsListView.vue'),
  },
  {
    path: '/membresias/:id',
    name: ROUTE_NAMES.MEMBERSHIP_DETAIL,
    component: () => import('@/features/memberships/views/MembershipDetailView.vue'),
    props: true,
  },
]
