import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const companiesRoutes: RouteRecordRaw[] = [
  {
    path: '/empresas',
    name: ROUTE_NAMES.COMPANIES_LIST,
    component: () => import('@/features/companies/views/CompaniesListView.vue'),
  },
  {
    path: '/empresas/:id',
    name: ROUTE_NAMES.COMPANY_DETAIL,
    component: () => import('@/features/companies/views/CompanyDetailView.vue'),
    props: true,
  },
]
