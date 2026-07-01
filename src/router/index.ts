import { createRouter, createWebHistory } from 'vue-router'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'
import { authGuard } from './guards/auth.guard'
import { permissionGuard } from './guards/permission.guard'
import { authRoutes } from './routes/auth.routes'
import { companiesRoutes } from './routes/companies.routes'
import { membershipsRoutes } from './routes/memberships.routes'
import { modulesRoutes } from './routes/modules.routes'
import { submodulesRoutes } from './routes/submodules.routes'
import { basePermissionsRoutes } from './routes/base-permissions.routes'
import { baseRolesRoutes } from './routes/base-roles.routes'
import { baseRolePermissionsRoutes } from './routes/base-role-permissions.routes'
import { membershipSubModulesRoutes } from './routes/membership-sub-modules.routes'
import { speciesRoutes } from './routes/species.routes'
import { breedsRoutes } from './routes/breeds.routes'
import { animalColorsRoutes } from './routes/animal-colors.routes'
import { consultationTypesRoutes } from './routes/consultation-types.routes'
import { vaccinationTypesRoutes } from './routes/vaccination-types.routes'
import { surgeryTypesRoutes } from './routes/surgery-types.routes'
import { laboratoryTestTypesRoutes } from './routes/laboratory-test-types.routes'
import { diagnosticImagingTypesRoutes } from './routes/diagnostic-imaging-types.routes'
import { spaTypesRoutes } from './routes/spa-types.routes'
import { configRoutes } from './routes/config.routes'
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
    ...membershipsRoutes,
    ...modulesRoutes,
    ...submodulesRoutes,
    ...basePermissionsRoutes,
    ...baseRolesRoutes,
    ...baseRolePermissionsRoutes,
    ...membershipSubModulesRoutes,
    ...speciesRoutes,
    ...breedsRoutes,
    ...animalColorsRoutes,
    ...consultationTypesRoutes,
    ...vaccinationTypesRoutes,
    ...surgeryTypesRoutes,
    ...laboratoryTestTypesRoutes,
    ...diagnosticImagingTypesRoutes,
    ...spaTypesRoutes,
    ...configRoutes,
  ],
})

let navigating = false

function startNavLoader() {
  if (!navigating) {
    navigating = true
    pushLoader()
  }
}

function endNavLoader() {
  if (navigating) {
    navigating = false
    popLoader()
  }
}

router.beforeEach((to, from) => {
  if (to.fullPath !== from.fullPath) startNavLoader()
})
router.beforeEach(authGuard)
router.beforeEach(permissionGuard)
router.afterEach(endNavLoader)
router.onError(endNavLoader)

export default router
