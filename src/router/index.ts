import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './guards/auth.guard'
import { permissionGuard } from './guards/permission.guard'
import { authRoutes } from './routes/auth.routes'
import { companiesRoutes } from './routes/companies.routes'
import { employeesRoutes } from './routes/employees.routes'
import { membershipsRoutes } from './routes/memberships.routes'
import { modulesRoutes } from './routes/modules.routes'
import { submodulesRoutes } from './routes/submodules.routes'
import { basePermissionsRoutes } from './routes/base-permissions.routes'
import { permissionsRoutes } from './routes/permissions.routes'
import { baseRolesRoutes } from './routes/base-roles.routes'
import { baseRolePermissionsRoutes } from './routes/base-role-permissions.routes'
import { membershipSubModulesRoutes } from './routes/membership-sub-modules.routes'
import { ROUTE_NAMES } from '@/constants/routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: ROUTE_NAMES.DASHBOARD },
    },
    {
      path: '/dashboard',
      name: ROUTE_NAMES.DASHBOARD,
      component: () => import('@/features/dashboard/views/DashboardView.vue'),
    },
    ...authRoutes,
    ...companiesRoutes,
    ...employeesRoutes,
    ...membershipsRoutes,
    ...modulesRoutes,
    ...submodulesRoutes,
    ...basePermissionsRoutes,
    ...permissionsRoutes,
    ...baseRolesRoutes,
    ...baseRolePermissionsRoutes,
    ...membershipSubModulesRoutes,
  ],
})

router.beforeEach(authGuard)
router.beforeEach(permissionGuard)

export default router
