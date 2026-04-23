import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'

export const employeesRoutes: RouteRecordRaw[] = [
  {
    path: '/empleados',
    name: ROUTE_NAMES.EMPLOYEES_LIST,
    component: () => import('@/features/employees/views/EmployeesListView.vue'),
  },
  {
    path: '/empleados/:id',
    name: ROUTE_NAMES.EMPLOYEE_DETAIL,
    component: () => import('@/features/employees/views/EmployeeDetailView.vue'),
    props: true,
  },
]
