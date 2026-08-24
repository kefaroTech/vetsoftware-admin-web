import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const membershipsRoutes: RouteRecordRaw[] = [
  {
    path: '/membresias',
    name: ROUTE_NAMES.MEMBERSHIPS_LIST,
    redirect: { name: ROUTE_NAMES.COMMERCIAL_CATALOG },
  },
  {
    path: '/membresias/:id',
    name: ROUTE_NAMES.MEMBERSHIP_DETAIL,
    redirect: { name: ROUTE_NAMES.COMMERCIAL_CATALOG },
  },
]
