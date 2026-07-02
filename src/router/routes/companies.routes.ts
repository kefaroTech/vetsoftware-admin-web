import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import { PERMISSIONS } from '@/constants/permissions'

export const companiesRoutes: RouteRecordRaw[] = [
  {
    path: '/empresas',
    name: ROUTE_NAMES.COMPANIES_LIST,
    component: () => import('@/features/companies/views/CompaniesListView.vue'),
    meta: { permission: PERMISSIONS.COMPANY_CREATE },
  },
  {
    path: '/empresas/:id',
    name: ROUTE_NAMES.COMPANY_DETAIL,
    component: () => import('@/features/companies/views/CompanyDetailView.vue'),
    props: true,
    meta: { permission: PERMISSIONS.COMPANY_CREATE },
  },
]
