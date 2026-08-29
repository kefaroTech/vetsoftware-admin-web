export const ROUTE_NAMES = {
  LOGIN: 'login',
  // Alta de superadministradores por invitación. Rutas en español, coherentes
  // con el tenant; `/login` se queda en inglés y esa incoherencia es previa.
  ACCESS_REQUEST: 'access-request',
  ACCESS_APPROVAL: 'access-approval',
  ACCESS_INVITATION: 'access-invitation',
  DASHBOARD: 'dashboard',
  COMPANIES_LIST: 'companies-list',
  COMPANY_DETAIL: 'company-detail',
  COMMERCIAL_CATALOG: 'commercial-catalog',
  SUBSCRIPTIONS_ADMIN: 'subscriptions-admin',
  /**
   * El expediente de un contrato: `/suscripciones/:companyId/:id`.
   *
   * <p>Vive aquí y no solo junto a su ruta porque lo necesita `SubscriptionRef`,
   * una primitiva de `components/ui/`. Que una primitiva importe de
   * `router/routes/**` es una dependencia hacia arriba que este árbol no tiene
   * en ningún sitio: `CompanyRef` importa de aquí, que es plano y no depende de
   * nada. `subscriptions-admin.routes.ts` sigue exportando
   * `SUBSCRIPTION_RECORD_ROUTE_NAMES` —sus consumidores no cambian— pero ahora
   * lo deriva de este nombre, así que solo hay un literal.
   */
  SUBSCRIPTION_RECORD: 'subscription-record',
  BILLING_OPERATIONS: 'billing-operations',
  // Alias de compatibilidad para componentes antiguos que siguen en el árbol.
  // Sus rutas ya no renderizan esas pantallas: redirigen al catálogo comercial.
  MEMBERSHIPS_LIST: 'memberships-list',
  MEMBERSHIP_DETAIL: 'membership-detail',
  MODULES_LIST: 'modules-list',
  MODULE_DETAIL: 'module-detail',
  SUBMODULES_LIST: 'submodules-list',
  SUBMODULE_DETAIL: 'submodule-detail',
  BASE_PERMISSIONS_LIST: 'base-permissions-list',
  BASE_PERMISSION_DETAIL: 'base-permission-detail',
  BASE_ROLES_LIST: 'base-roles-list',
  BASE_ROLE_DETAIL: 'base-role-detail',
  BASE_ROLE_PERMISSIONS_LIST: 'base-role-permissions-list',
  BASE_ROLE_PERMISSION_DETAIL: 'base-role-permission-detail',
  MEMBERSHIP_SUB_MODULES_LIST: 'membership-sub-modules-list',
  MEMBERSHIP_SUB_MODULE_DETAIL: 'membership-sub-module-detail',
  SPECIES_LIST: 'species-list',
  SPECIE_DETAIL: 'specie-detail',
  BREEDS_LIST: 'breeds-list',
  BREED_DETAIL: 'breed-detail',
  ANIMAL_COLORS_LIST: 'animal-colors-list',
  ANIMAL_COLOR_DETAIL: 'animal-color-detail',
  CONSULTATION_TYPES_LIST: 'consultation-types-list',
  CONSULTATION_TYPE_DETAIL: 'consultation-type-detail',
  VACCINATION_TYPES_LIST: 'vaccination-types-list',
  VACCINATION_TYPE_DETAIL: 'vaccination-type-detail',
  SURGERY_TYPES_LIST: 'surgery-types-list',
  SURGERY_TYPE_DETAIL: 'surgery-type-detail',
  LABORATORY_TEST_TYPES_LIST: 'laboratory-test-types-list',
  LABORATORY_TEST_TYPE_DETAIL: 'laboratory-test-type-detail',
  DIAGNOSTIC_IMAGING_TYPES_LIST: 'diagnostic-imaging-types-list',
  DIAGNOSTIC_IMAGING_TYPE_DETAIL: 'diagnostic-imaging-type-detail',
  SPA_TYPES_LIST: 'spa-types-list',
  SPA_TYPE_DETAIL: 'spa-type-detail',
  MEDICAMENTS_LIST: 'medicaments-list',
  MEDICAMENT_DETAIL: 'medicament-detail',
  /** Lente de consulta del listado mixto. No tiene entrada de menú a propósito. */
  MEDICAMENTS_PLATFORM: 'medicaments-platform',
  CONFIG: 'config',
} as const
