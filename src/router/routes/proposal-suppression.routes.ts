import type { RouteRecordRaw } from 'vue-router'

/**
 * Rutas de la **supresión de datos del asistente** a petición del titular.
 *
 * <p><b>El nombre vive aquí y no en `src/constants/routes.ts`</b>, por el mismo
 * motivo que en `limits.routes.ts`, `quotes.routes.ts` y `trials.routes.ts`: ese
 * fichero lo escriben a la vez varias tareas y es un punto de colisión. La
 * entrada de menú apunta por `path`, que es lo que `AppSidebar.isAvailable`
 * resuelve.
 *
 * <p><b>Sobre `meta.permission`.</b> No lo lleva, y es la misma decisión y el
 * mismo motivo que dejan escritos `limits.routes.ts` y `trials.routes.ts`: el
 * endpoint de detrás declara únicamente `hasRole('SYSTEM')`
 * (`SuppressProposalDataUseCase.java:26`) y no hay ningún código de permiso de
 * negocio que le corresponda — no hay `companyId` que revalidar porque una
 * propuesta no pertenece a ninguna empresa. Inventarle uno rompería el día en
 * que `hasPermission()` deje de ser un atajo universal para `SYSTEM_USER`.
 *
 * <p><b>Ruta en español y bajo `/asistente`</b>, no bajo `/privacidad`: lo que
 * gobierna esta pantalla son los datos del asistente, y `/asistente` es el hueco
 * que el orden documentado del menú ya reservaba entre el catálogo y la oferta.
 */
export const PROPOSAL_SUPPRESSION_ROUTE_NAMES = {
  ROOT: 'proposal-suppression',
} as const

export const proposalSuppressionRoutes: RouteRecordRaw[] = [
  {
    path: '/asistente/supresion-datos',
    name: PROPOSAL_SUPPRESSION_ROUTE_NAMES.ROOT,
    component: () => import('@/features/proposal-suppression/views/ProposalSuppressionView.vue'),
    meta: { title: 'Supresión de datos' },
  },
]
