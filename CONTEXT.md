# VetSoftwareFront — Estado del proyecto

> Snapshot al 2026-05-24. Este repo no tiene `CLAUDE.md` en raíz (sólo carpeta `.claude/`); este archivo cubre arquitectura básica + estado actual.

## Stack y rol

Front del **admin de plataforma** (operador del sistema, NO admin de empresa). Consume el backend Spring Boot en `http://localhost:8080/api/v1`.

- Vue 3.5 + TypeScript 6 + Vite 8 + Vuetify 3.7 + vue-router 4.6 + Axios 1.15
- **Pinia 3.0** (stores por feature, `*.store.ts`)
- Iconos: `@iconify/vue` + `@iconify-json/tabler`
- Commitlint con `commitlint-config-gitmoji` (mensajes con emojis)

Repos hermanos:

- `../VetSoftware/` — Backend único.
- `../VetSoftwarePublicFront/` — Front del empleado de clínica (no confundir).

## Git state

- **Branch**: `master`
- **HEAD**: `25264da` (2026-05-16) — `:bug: fix: logout con hard-redirect y limpiar todo el storage`
- 14 commits totales desde 2026-04-19
- **Sin CI**. Sólo Husky + commitlint local.

## Features bajo `src/features/`

Patrón uniforme por feature: `api/*.api.ts`, `stores/*.store.ts`, `composables/use*.ts`, `types/*.types.ts`, `components/*Form.vue`, `views/*ListView.vue` + `*DetailView.vue`.

| Feature                     | Endpoints                                                                   | UI                                                   |
| --------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| `auth/`                     | `POST /auth/login/system` (+ `/auth/login/employee` declarado pero sin UI)  | `LoginView.vue`                                      |
| `dashboard/`                | —                                                                           | `DashboardView.vue` (sin guard de permiso)           |
| `companies/`                | CRUD `/companies`                                                           | List, Detail                                         |
| `memberships/`              | CRUD `/memberships`                                                         | List, Detail + `MembershipStatusBadge`               |
| `modules/`                  | CRUD `/modules`                                                             | List, Detail                                         |
| `submodules/`               | CRUD `/sub-modules` (folder es `submodules`, path `/sub-modules`)           | List, Detail                                         |
| `base-permissions/`         | CRUD `/base-permissions`                                                    | List, Detail                                         |
| `base-roles/`               | CRUD `/base-roles` (ruta `/roles-base`)                                     | List, Detail                                         |
| `base-role-permissions/`    | CRUD `/base-role-permissions` + **`POST /admin/admin-permissions/publish`** | List (con botón "Publicar permisos a ADMIN"), Detail |
| `membership-sub-modules/`   | CRUD `/membership-sub-modules`                                              | List, Detail                                         |
| `species/`                  | CRUD `/species`                                                             | List, Detail                                         |
| `breeds/`                   | CRUD `/breeds` + `GET /species/{specieId}/breeds`                           | List, Detail                                         |
| `animal-colors/`            | CRUD `/animal-colors`                                                       | List, Detail                                         |
| `consultation-types/`       | CRUD `/consultation-types`                                                  | List, Detail                                         |
| `vaccination-types/`        | CRUD `/vaccination-types`                                                   | List, Detail                                         |
| `surgery-types/`            | CRUD `/surgery-types`                                                       | List, Detail                                         |
| `laboratory-test-types/`    | CRUD `/laboratory-test-types`                                               | List, Detail                                         |
| `diagnostic-imaging-types/` | CRUD `/diagnostic-imaging-types`                                            | List, Detail                                         |

## Cliente HTTP

`src/services/http/http.client.ts`:

- `baseURL = ${VITE_API_URL ?? ''}/api/v1` (dev: `http://localhost:8080/api/v1`)
- Request interceptor: añade `Authorization: Bearer <token>` desde `storageService.getToken()` y dispara `pushLoader()`.
- Response interceptor: `popLoader()` siempre. En **401** (URL distinta a `/auth/login`) borra token y hace `window.location.href = '/login'`.
- Helper `getProblemDetailMessage(error, fallback)` extrae `detail`/`title` de `ProblemDetail`.

## Autenticación

- **Storage**: `localStorage['vet_token']` como **string plano** (no JSON). `TOKEN_KEY` en `src/services/storage/storage.service.ts`.
- **Login**: `POST /auth/login/system` con `LoginSystemUserCommand = { code, password }`.
- **Response**: `TokenResponse = { token, type }`.
- **Store** (`src/features/auth/stores/auth.store.ts`): decodifica JWT en cliente (`decodeJwt`), expone `userId`, `userType` (`EMPLOYEE | SYSTEM_USER`), `permissions: ref<string[]>` (vacío, no se popula).
- **Logout**: `storageService.clearAll()` (limpia ambos localStorage y sessionStorage) + `window.location.href = '/login'`.

## Tipos

**Sin mappers** — consume tipos backend directamente.

- `src/types/api.types.ts` — `ApiResponse<T>`, `PagedResponse<T>` (Spring style), `ProblemDetail`, `ProblemDetailFieldError`.
- `src/types/common.types.ts` — `EmployeeStatus`, `MembershipStatus`, `SelectOption<T>`, `IdNameSummary`, `IdNameCodeSummary`.
- Cada feature define sus tipos de dominio + `Create*Command` + `Update*Command`.

## Routing

`src/router/index.ts`. Rutas con paths en español: `/empresas`, `/membresias`, `/modulos`, `/submodulos`, `/permisos-base`, `/roles-base`, `/permisos-roles-base`, `/membresias-submodulos`, `/animales/{especies|razas|colores}`, `/catalogos-clinicos/{tipos-consulta|tipos-vacuna|...}`.

**Guards globales**:

1. Loader de navegación.
2. `authGuard`: si `meta.public !== true` y no hay token → `login`. Sólo `/login` es `public`.
3. `permissionGuard`: si `to.meta.permission` y `authStore.hasPermission(...)` falla → `dashboard`.

⚠️ **Permission system no funcional**: `authStore.permissions` nunca se popula y ninguna ruta declara `meta.permission`. El `permissionGuard` es no-op. Cualquier `SYSTEM_USER` autenticado ve todas las rutas.

## Cambios desde 2026-05-10

Sólo 2 commits posteriores:

1. **`f780e05` (2026-05-11)** — `feat: add publish admin permissions action`. Añadió `src/features/base-role-permissions/api/admin-permission-publish.api.ts`, composable y botón "Publicar permisos a ADMIN" en `BaseRolePermissionsListView`. Consume `POST /admin/admin-permissions/publish`.
2. **`25264da` (2026-05-16)** — `fix: logout con hard-redirect y limpiar todo el storage`. Añadió `storageService.clearAll()`.

## Endpoints del backend NO consumidos

Lista de endpoints que el front podría consumir pero hoy no:

- `/roles`, `/permissions`, `/role-permissions`, `/employee-roles` raw (estos son admin-de-empresa; los gestiona PublicFront vía `/by-company`)
- `/system-users`, `/system-permissions`, `/system-user-permissions`
- `/spas`, `/spa-types`
- `/auth/me` — no consumido aquí (sólo PublicFront)
- `/role-permissions/by-role/{roleId}` — no consumido aquí
- Catálogos clínicos: sólo CRUD plano, no `/available`

## Gaps abiertos

- **Sistema de permisos**: guard, store y catálogo definidos pero sin hidratación. No existe `/auth/me` para `SYSTEM_USER` en backend. Hasta que se cree, gating real es imposible.
- **Sidebar con link roto**: `AppSidebar.vue` enlaza a `/empleados` pero el feature `employees` fue eliminado en commit `d38af72` (2026-04-28). La ruta no existe.
- **`PagedResponse<T>` declarado pero no usado**: todos los `list()` devuelven `T[]` raw. Si crecen los catálogos, habrá que conectar paginación.
- **Inconsistencia naming**: feature `submodules/` (sin guion) vs resto con guion (`base-roles/`, `animal-colors/`, etc.).

## Tests y CI

- **Cero tests escritos** pese a tener vitest + `@vitest/coverage-v8` + `@vue/test-utils` + jsdom instalados. Scripts `test` y `test:coverage` corren sobre vacío.
- **Sin CI** (no hay `.github/`). Sólo Husky + commitlint local.
- Scripts: `dev`, `build` (`vue-tsc -b && vite build`), `preview`, `test`, `test:coverage`, `lint`, `format`, `prepare` (husky).
