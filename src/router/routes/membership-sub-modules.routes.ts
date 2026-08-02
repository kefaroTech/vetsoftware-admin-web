import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const membershipSubModulesRoutes: RouteRecordRaw[] = [
  {
    path: '/membresias-submodulos',
    name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULES_LIST,
    component: () =>
      import('@/features/membership-sub-modules/views/MembershipSubModulesListView.vue'),
  },
  {
    path: '/membresias-submodulos/:id',
    name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULE_DETAIL,
    component: () =>
      import('@/features/membership-sub-modules/views/MembershipSubModuleDetailView.vue'),
    props: true,
  },
]
