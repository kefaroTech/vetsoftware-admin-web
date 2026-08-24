/**
 * Inventario de códigos de permiso (`@PreAuthorize("hasAuthority('...')")`)
 * que el backend declara para las 54 rutas nuevas de suscripciones
 * (docs/ux/suscripciones-consola-especificacion.md, tarea W1-A, issue B-4).
 *
 * ⚠️ **Hallazgo que hay que leer antes de usar esto para ocultar nada.**
 * Todo operador de esta consola es un `SystemUserContext`
 * (`Authz.java:48-55`), y el backend le concede `ROLE_SYSTEM` en el JWT sin
 * mirar sus `permissions()` (`AuthFilter.java:200-210`,
 * `boolean systemRole = switch (authContext) { case SystemUserContext _ ->
 * true; ... }`). Cada `@PreAuthorize` de las 54 rutas tiene la forma
 * `hasRole('SYSTEM') or (hasAuthority('xxx.yyy') and
 * @authz.isMyCompany(...))`, así que **`hasRole('SYSTEM')` basta y pasa
 * siempre** — la mitad `hasAuthority(...)` de la condición nunca se evalúa
 * para un system user. En el front, `authStore.hasPermission()`
 * (`features/auth/stores/auth.store.ts:67-68`) ya replica ese atajo:
 * `userType.value === 'SYSTEM_USER' || permissions.value.includes(...)`.
 *
 * **Consecuencia práctica: hoy ningún operador de esta consola puede quedar
 * bloqueado por un código de permiso** — ni por el guard de ruta
 * (`permissionGuard`) ni por `authStore.hasPermission()`. Las constantes de
 * abajo no gatean nada todavía; existen para que:
 *
 * 1. `meta.permission` documente, con el literal exacto del backend, qué
 *    autoridad correspondería a cada ruta si algún día los tres perfiles de
 *    operador de §0 (comercial / soporte / administración) se diferencian
 *    por permiso — hoy no lo están, y diferenciarlos es un cambio del modelo
 *    de auth, fuera del alcance de W1-A.
 * 2. Ningún futuro llamador escriba el string de autoridad a mano y lo
 *    desalinee de lo que el backend realmente exige.
 *
 * **Cómo se construyó**: leyendo `@PreAuthorize` en
 * `<feature>/application/port/in/*.java` de `subscription`, `entitlement`,
 * `quote`, `subscriptionpayment`, `subscriptionbilling` y `dunning`, y
 * cruzando cada uso case con el `@GetMapping`/`@PostMapping`/... de su
 * controller para confirmar que pertenece a una de las 54 rutas de la
 * especificación (no a otra familia del mismo paquete — p.ej.
 * `billingDocumentApplication.read`, de `BillingDocumentApplicationController`,
 * NO es una de las 54 y por eso no está aquí).
 *
 * **Rutas de las 54 SIN código de permiso — no inventar uno.** La mayoría de
 * las escrituras solo llevan `hasRole('SYSTEM')`, sin `hasAuthority(...)`
 * alternativa: no hay autoridad más fina que gatear, y ponerles un
 * `meta.permission` con un código inexistente rompería el día en que
 * `hasPermission()` deje de ser un atajo universal para `SYSTEM_USER` (un
 * caller que no fuera `SYSTEM_USER` fallaría el `permissions.value.includes(...)`
 * contra un código que el backend nunca comprueba). Rutas confirmadas así:
 * - Todo `/catalog-items/**`, `/catalog-prices/**`, `/price-lists/**`,
 *   `/configurator/**`, `/platform-billing-config`, `/system/billing-document-
 *   sequences`, `/platform-subscriptions` (+ `/item-overlaps`) — global de
 *   plataforma, ninguna tiene `hasAuthority`.
 * - `/subscriptions/{id}/items` POST (`AddSubscriptionItemUseCase.java:44`,
 *   con su propio comentario: dejarla solo en `hasRole('SYSTEM')` es
 *   deliberado — el cuerpo trae precio sin recalcular contra la tarifa, y
 *   abrirla a una autoridad de empresa sería una alta gratuita autoservida).
 * - `/subscriptions/{id}/status` PATCH (`ChangeSubscriptionStatusUseCase.java:28`).
 * - `POST /subscription-payments`, `PATCH .../status`, `PATCH .../reconciliation`
 *   (`RegisterSubscriptionPaymentUseCase.java:37`,
 *   `ChangeSubscriptionPaymentStatusUseCase.java:20`,
 *   `ReconcileSubscriptionPaymentUseCase.java:20`).
 * - `POST /dunning-events` (`RecordDunningEventUseCase.java:23`).
 * - `POST /entitlements/recalculate` (`RecalculateCompanyEntitlementsUseCase.java:25`).
 * - `GET /entitlements/access` (`FindCompanyAccessUseCase.java:22`): solo
 *   `hasRole('SYSTEM') or @authz.isMyCompany(#companyId)`, sin `hasAuthority`.
 * - Las 7 escrituras de `/system/subscription-billing/companies/{companyId}/**`
 *   (cargo, anular cargo, generar documento, await-external, nota crédito,
 *   factura externa, anular documento) — la empresa viaja en la URL, no hay
 *   autoridad de negocio, solo `hasRole('SYSTEM')`.
 * - `POST /quotes`, `DELETE /quotes/{id}`, `POST /quotes/{id}/send` — igual.
 * - Los 3 listados `/system/**` (`GET /system/subscription-payments`,
 *   `GET /system/dunning-events`, `GET /system/subscription-billing/documents/*`)
 *   — cross-tenant, solo `hasRole('SYSTEM')` por diseño (no filtran por
 *   empresa y BE-29 exige que eso sea SYSTEM puro).
 *
 * Las que SÍ tienen una autoridad de negocio (abajo) la comparten con el
 * front del tenant: son las mismas rutas que un `EmployeeContext` usa para
 * ver **su propia** empresa (`@authz.isMyCompany(...)`), y por eso existe el
 * código — no porque esta consola lo necesite para diferenciar operadores.
 */
export const PERMISSIONS = {
  COMPANY_CREATE: 'company.create',

  // --- Suscripciones (docs/ux/suscripciones-consola-especificacion.md §1.1, W1-A) ---
  // `GET /subscriptions/{id}|/current|/items|/amendments|/status-history`
  SUBSCRIPTION_READ: 'subscription.read',
  // `PATCH /subscriptions/{id}/items/remove`, `POST .../items/quantity`
  SUBSCRIPTION_UPDATE: 'subscription.update',
  // `PATCH /subscriptions/{id}/cancel`
  SUBSCRIPTION_CANCEL: 'subscription.cancel',

  // `GET /quotes/{id}` (detalle) y `GET /quotes` por empresa (no la usa esta
  // consola: su lista es `GET /quotes/platform`, sin autoridad, §1.1)
  QUOTE_READ: 'quote.read',
  // `POST /quotes/{id}/accept`
  QUOTE_ACCEPT: 'quote.accept',
  // `POST /quotes/{id}/reject`
  QUOTE_REJECT: 'quote.reject',

  // `GET /entitlements` (lista derivada de la empresa)
  ENTITLEMENT_READ: 'entitlement.read',

  // `GET /dunning-events`, `GET /dunning-events/{id}`
  DUNNING_EVENT_READ: 'dunningEvent.read',

  // `GET /subscription-payments/{id}`, `GET /subscription-payments`
  SUBSCRIPTION_PAYMENT_READ: 'subscriptionPayment.read',

  // Los 4 GET de `/subscription-billing/{charges,documents}[/{id}]`
  SUBSCRIPTION_BILLING_READ: 'subscriptionBilling.read',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
