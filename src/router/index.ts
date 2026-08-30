import { createRouter, createWebHistory } from 'vue-router'
import { popLoader, pushLoader } from '@/composables/useGlobalLoader'
import { authGuard } from './guards/auth.guard'
import { permissionGuard } from './guards/permission.guard'
import { authRoutes } from './routes/auth.routes'
import { platformAccessRoutes } from './routes/platform-access.routes'
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
import { medicamentsRoutes } from './routes/medicaments.routes'
import { configRoutes } from './routes/config.routes'

/* ──────────────────────────────────────────────────────────────────────────
 * Suscripciones · las entradas de menú de §2 de
 * `docs/ux/suscripciones-consola-especificacion.md`, en el orden de la cadena
 * del modelo: catálogo y precios → cotizaciones → contratos → cobranza, más
 * facturación de plataforma bajo Sistema.
 *
 * Regla de no colisión de §7: cada tarea de la onda 1 aporta su propio
 * `routes/<feature>.routes.ts` y **ninguna toca este fichero**; los imports los
 * registra una sola instancia (W1-B). Los que ya existen van importados; los que
 * aporta una tarea que todavía no ha aterrizado quedan **escritos y comentados**
 * en vez de inventados: un import a un fichero que no existe no compila, y
 * dejarlo fuera del todo escondería el hueco.
 *
 * Para activarlos basta descomentar la línea y su `...spread` de abajo — el
 * nombre del módulo y del export son los que fija la convención del repo
 * (`<feature-en-kebab>.routes.ts` → `<featureEnCamel>Routes`). Si la tarea que
 * lo aporta eligió otro nombre, esta línea es el único sitio que hay que
 * ajustar.
 * ────────────────────────────────────────────────────────────────────────── */
import { commercialCatalogRoutes } from './routes/commercial-catalog.routes'
// Habeas data · /asistente/supresion-datos. El eslabón «el asistente» de la
// cadena del menú, y la única pantalla que llama a
// POST /assistant/proposals/suppress.
import { proposalSuppressionRoutes } from './routes/proposal-suppression.routes'
// W1-D · /cotizaciones y /cotizaciones/:id (§4.3)
import { quotesRoutes } from './routes/quotes.routes'
import { subscriptionsAdminRoutes } from './routes/subscriptions-admin.routes'
import { billingDocumentsRoutes } from './routes/billing-documents.routes'
import { billingOperationsRoutes } from './routes/billing-operations.routes'
import { limitsRoutes } from './routes/limits.routes'
// W1-F · /configuracion/facturacion (§4.6)
import { platformBillingRoutes } from './routes/platform-billing.routes'
// Ampliación · las dos familias que quedaron escritas sin enganchar: la
// conciliación (§H) y las ventanas de prueba (§C).
import { reconciliationRoutes } from './routes/reconciliation.routes'
import { trialsRoutes } from './routes/trials.routes'
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
    ...platformAccessRoutes,
    ...companiesRoutes,
    // El orden de la cadena, igual que en el menú.
    ...commercialCatalogRoutes,
    ...proposalSuppressionRoutes,
    ...quotesRoutes,
    ...subscriptionsAdminRoutes,
    ...billingOperationsRoutes,
    // Iba sin registrar mientras `BillingDocumentsTable` ya enlazaba a su detalle por
    // fila: un enlace vivo en /cobranza que el router no resolvia, y tres fragmentos
    // que el empaquetador ya pagaba sin que nadie pudiera abrirlos.
    ...billingDocumentsRoutes,
    // Primero se cobra, después se cuadra.
    ...reconciliationRoutes,
    ...limitsRoutes,
    // El cupo y lo que se regala, juntos.
    ...trialsRoutes,
    ...platformBillingRoutes,
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
    ...medicamentsRoutes,
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
