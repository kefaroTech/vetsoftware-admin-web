import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const membershipSubModulesRoutes: RouteRecordRaw[] = [
  {
    path: '/membresias-submodulos',
    name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULES_LIST,
    redirect: { name: ROUTE_NAMES.COMMERCIAL_CATALOG },
  },
  {
    path: '/membresias-submodulos/:id',
    name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULE_DETAIL,
    redirect: { name: ROUTE_NAMES.COMMERCIAL_CATALOG },
  },
]
