# Catálogo de medicamentos — especificación de UI para la consola de plataforma

**Repositorio:** `VetSoftwareFront` (consola de plataforma / superusuario).
**Estado:** especificación, lista para implementar. Nada de `src/` se ha tocado al escribirla.
**Versión:** 3 — 2026-08-26.

> **Historial de decisiones, porque explica el documento.**
>
> - **v1.** Escrita contra un backend sin ningún camino HTTP para escribir un medicamento global.
>   Acotaba la pantalla a solo lectura y mostraba globales y privados juntos.
> - **v2.** Se abrió `/admin/medicaments` (seis endpoints, `hasRole('SYSTEM')`, sin `X-Company-Id`).
>   La pantalla principal pasó a ser el **catálogo global puro** con pestañas Activos/Pausados, y el
>   listado mixto se **reubicó** —no se eliminó— como vista de contexto de solo lectura.
> - **v3, esta.** Decisión de producto: **hay búsqueda por nombre, servida por el servidor**, en los
>   dos listados. Era el único delta que la v2 dejaba abierto. Se añaden §5.5 (comportamiento del
>   buscador), §5.7 (los cuatro estados vacíos, que antes eran uno) y §6.4; se corrige §3.5 —el
>   `ORDER BY` que faltaba en los pausados se arregla en el origen, así que ya **no** se ordena en
>   cliente— y se **retira** la región viva extra que la v2 proponía para el cambio de pestaña, que
>   habría duplicado anuncios (§8.2).
>
> Lo que **no** ha cambiado desde la v1, y no va a cambiar: nada de filtrar en cliente sobre un
> endpoint paginado; ninguna acción sobre filas de otra empresa, ni deshabilitada; el aviso de
> alcance una sola vez y no por fila; y no se edita el dato de un tenant desde esta consola.

**Fecha de verificación del árbol:** 2026-08-26, leyendo `VetSoftwareFront`, `VetSoftwarePublicFront`
y `VetSoftware` (backend). Si algún `fichero:línea` no cuadra, **manda el código**.

Toda ruta lleva delante su repositorio, como exige `docs/ux/README.md` («Toda ruta lleva delante su
repositorio. Sin prefijo no hay ruta»). Los ficheros gemelos TR-02 (`tokens.css`, `primitives.css`)
se citan sin prefijo.

---

## 0. Resumen ejecutivo, para quien no lea el resto

1. La feature **replica el patrón de los 9 catálogos maestros que ya existen** en esta consola (§2),
   con una desviación justificada: el composable se apoya en `useServerPaged` y no en
   `createCatalogStore`, porque el endpoint pagina (§9.4).
2. **Dos pantallas, una entrada de menú.**
   - **Principal — «Catálogo de medicamentos»**: el vademécum **global puro**, sobre
     `/admin/medicaments`. Escribible: alta, edición, pausa y reactivación. Conmutador de estado
     **Activos / Pausados**.
   - **Secundaria — «Medicamentos en toda la plataforma»**: el listado **mixto** (globales + privados
     de cada empresa) sobre `GET /medicaments`. **Solo lectura, sin una sola acción**, con columna
     «Ámbito». No va al menú: se llega desde un enlace de la principal.
3. **Las dos pantallas llevan buscador por nombre, servido por el servidor** (§5.5, §6.4). Con 153
   moléculas sembradas y páginas de 20, encontrar «Amoxicilina» eran 8 clics. El parámetro es **`q`**,
   la convención verificada del repositorio (§3.3).
4. **La búsqueda NO se filtra en el navegador**, y la razón es la misma que este documento sostiene
   desde la v1: sobre una respuesta paginada, filtrar en memoria mira solo las 20 filas visibles y
   **diría «no existe» sobre lo que está en la página 6**, con lo que el operador crearía un
   duplicado. Es exactamente el defecto que el parámetro servido resuelve.
5. **Sin resultados ≠ catálogo vacío.** Son cuatro estados distintos en la pantalla principal, con
   cuatro textos y dos salidas distintas: limpiar la búsqueda, o crear el primer medicamento (§5.7).
6. **La pestaña «Pausados» existe** (`GET /admin/medicaments/disabled`) y **ya llega ordenada por
   nombre**: el orden arbitrario que detectó la v2 se arregla en el backend, no en el cliente.
7. La columna «Estado» **sigue sin pintarse**, y con mejor argumento que nunca (§5.6).
8. Casi todo el design system necesario existe: `AppListSearch` **se reutiliza sin tocar** y ya trae
   la accesibilidad del patrón de búsqueda resuelta. Hay que crear **dos iconos** y **un conmutador
   de pestañas accesible que la consola no tiene** (§9.2).
9. Se mantienen los **dos defectos sistémicos de `AppPagination.vue`**, que estas pantallas heredan y
   que afectan a **24 pantallas** (§8.4). Uno de ellos —no anunciar el rango— es justo el defecto que
   `AppListSearch` **sí** tiene resuelto; el contraste está documentado en §8.3.

---

## 1. Encuadre: qué tarea resuelve y para quién

El usuario es un **superadministrador de plataforma** (`SystemUserContext`), no un veterinario. No
tiene el animal delante. Su tarea real es de **gobierno del vademécum global**:

- **mantener el catálogo global**: dar de alta lo que toda clínica debe poder recetar, corregir
  nombres, retirar lo que ya no se usa y recuperar lo retirado por error;
- **ver qué han creado los tenants por su cuenta**, que es la evidencia de qué falta en el catálogo
  global y de qué se está duplicando con veinte grafías distintas.

Son **dos tareas distintas**, y de ahí salen dos pantallas. La primera es de escritura y ocurre a
diario; la segunda es de diagnóstico y ocurre de vez en cuando.

Y las dos son **tareas de búsqueda antes que de navegación**. Un vademécum no se recorre: se consulta
por nombre. Con 153 moléculas sembradas y páginas de 20 filas, llegar a «Amoxicilina» por el paginador
son 8 pulsaciones y una lectura visual en cada página. Ese es el motivo por el que §5.5 no es un
adorno: es el mecanismo principal de acceso a las dos pantallas.

Dos consecuencias que atraviesan la especificación:

- **No es una pantalla de urgencia.** No hay «una sola mano» ni prisa clínica. Puede permitirse una
  tabla densa. Lo que **no** puede permitirse es mentir sobre cuántos registros hay ni sobre si algo
  existe: es la única ventana al vademécum de la plataforma.
- **Lo que aquí se toque lo sufre cada clínica sin enterarse.** Un global mal escrito llega a las
  recetas de todos los tenants, y pausar uno lo retira del recetario de todos a la vez. Por eso la
  confirmación de §5.8 nombra ese alcance, y por eso §6.3 rechaza dar acciones sobre datos de un
  tenant.

---

## 2. El patrón real de los catálogos maestros de esta consola

Extraído de `laboratory-test-types` y `vaccination-types` (los dos más parecidos por tener
`name` + `description`), leídos con CodeGraph.

### 2.1 Estructura de carpetas — invariante, seis directorios

```
VetSoftwareFront/src/features/<feature-kebab>/
  api/         <feature-kebab>.api.ts     · objeto literal con métodos async sobre `http`
  components/  <Entidad>Form.vue          · formulario, sin modal: el modal lo pone la vista
  composables/ use<Entidades>.ts          · store + api + avisos; exporta `<Entidad>FormData`
  stores/      <feature-kebab>.store.ts   · una línea: `createCatalogStore<T>('camelCase')`
  types/       <feature-kebab>.types.ts   · `…Response`, `Create…Request`, `Update…Request`
  views/       <Entidades>ListView.vue    · listado
               <Entidad>DetailView.vue    · edición, ruta completa (no modal)
```

### 2.2 Las siete piezas y su reparto de responsabilidad

| Pieza | Qué hace, y qué NO hace | Evidencia |
|---|---|---|
| `types` | Espejo literal del DTO del backend. `company` es `…CompanySummary \| null`, `general: boolean`. | `VetSoftwareFront/src/features/laboratory-test-types/types/laboratory-test-types.types.ts` |
| `api` | Objeto literal, un método por endpoint, sin `try`. Solo `http` y tipos. | `…/api/laboratory-test-types.api.ts` |
| `stores` | **Una línea.** `createCatalogStore<T>(name)` da `items/selected/loading/error/errorTraceId` + 4 setters. No hace fetch y no avisa, **a propósito**. | `VetSoftwareFront/src/stores/createCatalogStore.ts:1-79` |
| `composables` | Único sitio con API + avisos. `fetchAll` escribe `store.setError(getProblemDetailMessage(...), getTraceId(...))` **y además** `errorFrom(...)`. `create/update/remove` avisan con `success(...)` y **relanzan** el error. | `…/composables/useLaboratoryTestTypes.ts:18-106` |
| `views/…ListView` | Dueña del estado de UI: `showModal`, `saving`, `formRef`, término de búsqueda. `onMounted(fetchAll)`. `useUnsavedChangesGuard`. `saving = false` **en el `finally`** (FORM-09). | `…/views/LaboratoryTestTypesListView.vue:16-87` |
| `views/…DetailView` | La **edición es una ruta completa**, no un modal. Recibe `id: string` por `props: true`, `fetchById` en `onMounted`, y al guardar `router.push({ name: ROUTE_NAMES.…_LIST })`. | `…/views/LaboratoryTestTypeDetailView.vue:12-35` |
| `components/…Form` | `errors` es un `computed` puro sobre `@/composables/validators`; el error solo se pinta con `submitted === true`; `watch(() => props.initial, …, { immediate: true })` resetea también con `null`; `defineExpose({ isDirty })`. | `…/components/LaboratoryTestTypeForm.vue:25-62` |

### 2.3 Registro en router y en menú — tres ficheros, siempre los mismos

1. `VetSoftwareFront/src/constants/routes.ts` — claves en `ROUTE_NAMES`, en `kebab-case`.
2. `VetSoftwareFront/src/router/routes/<feature>.routes.ts` — array `RouteRecordRaw[]`, componentes
   con `import()` diferido, las de detalle con `props: true`. Se importa en
   `VetSoftwareFront/src/router/index.ts`.
3. `VetSoftwareFront/src/components/layout/sidebar-nav.ts` — una `NavLeaf` dentro del grupo
   `Configuración › Catálogos clínicos`. **La entrada solo se pinta si el router conoce la ruta**
   (`isAvailable`): una entrada que lleva a una pantalla en blanco es lo que el usuario reporta como
   «la consola está rota».

### 2.4 Lo que el patrón hace con `general` — y por qué aquí lo hace el servidor

Los 9 catálogos existentes filtran **en el navegador**:

```ts
// VetSoftwareFront/src/features/laboratory-test-types/composables/useLaboratoryTestTypes.ts:23
store.setItems(data.filter((t) => t.general))
```

Eso es correcto **allí** porque `GET /laboratory-test-types` devuelve el array entero sin paginar.
El propio código deja escrito el límite:

> «El día que ese endpoint pase a `PageResponse<T>`, esta búsqueda pasa a mentir y hay que bajarla al
> servidor con su `/search`.» — `…/views/LaboratoryTestTypesListView.vue:31-33`

**Medicamentos es ese día**, y por eso **ni el filtro por ámbito ni la búsqueda se hacen en el
cliente**: los dos los hace el servidor. Es la misma regla del patrón resuelta un piso más abajo, no
una excepción a él.

---

## 3. El contrato real del backend, verificado

Fuente: `VetSoftware/src/main/java/com/vetsoftware/app/medicament/`.

### 3.1 Forma del recurso — una sola, compartida por las dos superficies

`MedicamentResponse` (`…/infrastructure/web/response/MedicamentResponse.java`):

| Campo | Tipo | Nulo | Nota |
|---|---|---|---|
| `id` | `Long` | no | |
| `name` | `String` | no | `@NotBlank`, `@Size(max = 200)` en los cuatro request |
| `description` | `String` | **sí** | `@Size(max = 500)` **sin** `@NotBlank` → opcional |
| `company` | `CompanySummary{id,name,identifier}` | **sí** | `null` ⟺ `general = true`. **Siempre `null`** en `/admin/medicaments`. |
| `general` | `boolean` | no | **Siempre `true`** en `/admin/medicaments`. |
| `createdDate` | `LocalDateTime` | no | ISO sin zona |
| `enabled` | `boolean` | no | constante dentro de cada listado; ver §5.6 |

El `GlobalMedicamentController` reutiliza **el mismo `toResponse`** que el del tenant y lo justifica:
«la `MedicamentResponse` es una sola y el front no tiene que aprender dos formas del mismo recurso».
**Consecuencia para el front: un solo tipo `MedicamentResponse` en `types/`, para las dos pantallas.**

Invariante de dominio (`…/domain/Medicament.java:47-51`): **XOR estricto** — `general ⇒ company == null`
y `!general ⇒ company != null`. La UI puede confiar en él: no hay fila «global con empresa».

### 3.2 Por qué esta consola no escribe por `/medicaments`

Los siete endpoints de `/medicaments` que mutan o leen por id resuelven la empresa con
`Authz.currentCompanyId()`, que para un `SystemUserContext` —el actor de esta consola— llama a
`requiredSystemCompanyId()`, lee la cabecera `X-Company-Id` y **lanza** sin ella
(`Authz.java:48-55`, `:157-165`). El cliente HTTP de la consola no la añade: `COMPANY_ID_HEADER`
existe como constante (`VetSoftwareFront/src/services/http/http.client.ts:59`) pero no hay
interceptor. Y aunque se enviara, `POST /medicaments` fija `general = false` a fuego.

Por eso el backend abrió **una raíz separada**, y lo argumenta en el javadoc del controlador nuevo:
`/medicaments` es la superficie del tenant con gates `prescription.*`, y colgar de ella la
administración global obligaría a bifurcar por rol dentro del mismo endpoint —lo que el CLAUDE.md
prohíbe—. **La separación se lee en la URL y no depende de leerse un `if`.**

**Regla para el front:** `medicaments.api.ts` tiene **dos grupos de métodos con prefijo distinto** y
un comentario que dice esto en dos líneas. Nadie debe deducirlo leyendo el backend.

### 3.3 La superficie de administración — `/admin/medicaments`

`…/infrastructure/web/GlobalMedicamentController.java`. Los seis van con
`@PreAuthorize("hasRole('SYSTEM')")` **a secas** en su puerto, y el controlador **no inyecta `Authz`**:
no pide `X-Company-Id` ni puede pedirla. **La consola los llama tal cual.**

| Método | Ruta | Devuelve | Notas |
|---|---|---|---|
| `POST` | `/admin/medicaments` | `201` + `MedicamentResponse` | Request de **dos campos**: `name`, `description`. **No acepta `companyId` ni `general`**: los pone el servidor (`company = null`, `general = true`). |
| `GET` | `/admin/medicaments?q&page&pageSize` | `PageResponse<MedicamentResponse>` | Globales **activos**, paginado y **filtrado en servidor**. `pageSize` por defecto **20**. |
| `GET` | `/admin/medicaments/disabled?q` | `List<MedicamentResponse>` | Globales **pausados**. **Sin paginar** y **ordenado por nombre** (§3.5). |
| `PUT` | `/admin/medicaments/{id}` | `MedicamentResponse` | Solo `name` y `description`. |
| `DELETE` | `/admin/medicaments/{id}` | `204` | **Baja lógica** (`@SQLDelete … SET enabled = false`). |
| `PATCH` | `/admin/medicaments/{id}/enable` | `MedicamentResponse` | Reactiva. |

`GET /medicaments?q&page&pageSize` sigue siendo el **listado de contexto**: globales **más** privados
de todas las empresas, paginado, `hasRole('SYSTEM')` desde BE-29. Es la fuente de §6.

#### El parámetro de búsqueda es `q` — convención verificada, no inventada

El coordinador pedía dejarlo «a confirmar» si no encontraba la convención del repositorio. **Se ha
encontrado, y es unánime en los dos lados:**

- **Backend — 14 controladores** usan `q` para el término de búsqueda:
  `@RequestParam("q") String query` en `CompanyController.java:80` y `OwnerController.java:71`;
  `@RequestParam(name = "q", required = false)` en `ClinicalHistoryController`, `DewormingController`,
  `DiagnosticImagingController`, `HospitalizationController`, `LaboratoryTestController`,
  `SpaController`, `SurgeryController`, `VaccinationController`; y `@RequestParam(required = false)
  String q` en `EmployeeController.java:144`, `InventoryController.java:123`,
  `OpenAccountController.java:84`.
- **Front — el único consumidor de búsqueda servida de esta consola** envía exactamente eso:
  `params: { q: query, page, pageSize }` (`VetSoftwareFront/src/features/companies/api/companies.api.ts:52`).

**Comportamiento que la pantalla necesita**, con la semántica que el repositorio ya usa:

| Aspecto | Qué se necesita | Precedente |
|---|---|---|
| Coincidencia | **Subcadena**, no prefijo. Buscar «amox» encuentra «Amoxicilina» y también «Trihidrato de amoxicilina». | `LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))` — `CompanyJpaRepository.java:49-50`, `OwnerJpaRepository.java:48` |
| Mayúsculas | **Insensible.** | el `LOWER(...)` de arriba |
| Acentos | **Insensible.** No es opcional aquí: es el **mismo criterio con el que la base decide un choque de nombre** (`utf8mb4_0900_ai_ci`, §3.6). Si buscar distinguiera acentos y el índice único no, el operador buscaría «Cloxacilina», no la encontraría, la crearía, y recibiría un 409 sobre algo que acaba de buscar sin éxito. **Buscar y chocar tienen que responder al mismo criterio.** | collation de la columna, `MedicamentRepository.findByNameAndCompanyIdIncludingDisabled` |
| Campos | **Solo `name`.** La decisión de producto dice «búsqueda por nombre». El `placeholder` del campo dirá exactamente eso y no prometerá la descripción (§5.5). | — |
| Ausencia | `q` **opcional**. Sin él o vacío, el listado completo. | `required = false` en 12 de los 14 |
| Vacío | Un `q` en blanco se trata como ausente; el front ya lo manda recortado (`options.query?.value.trim()`, `useServerPaged.ts:66`). | — |

> **A confirmar al regenerar el contrato:** que el backend adopte `q` y no otro nombre. Si por algún
> motivo eligiera otro, **lo único que cambia es una línea de `medicaments.api.ts`**; la especificación
> de comportamiento de esta tabla se mantiene. El front **no** debe adaptarse a dos nombres a la vez.

**Dos barreras del backend que la UI no tiene que replicar, pero sí conocer:**

- `Update` y `Delete` globales llevan `.filter(Medicament::isGeneral)` y devuelven **404, no 403**,
  si el id es de una fila privada. El javadoc lo llama «LA barrera», no defensa en profundidad: sin
  ella, un `PUT` con el id de un medicamento privado le pondría `company = null, general = true` y
  **la fila de una clínica pasaría en silencio al catálogo global**.
- `Reactivate` va por `reactivateGlobal(id)` con `company_id IS NULL`, no por `reactivate(id, null)`:
  en SQL `company_id = NULL` no casa jamás, y ese era el motivo de que un global pausado fuera
  **irrecuperable**. **Ambos defectos estaban señalados en la v1 de este documento y están cerrados
  en el código.**

### 3.4 Estado y visibilidad — de dónde sale la pestaña «Pausados»

`MedicamentJpaEntity` lleva `@SQLRestriction("enabled = true")` y `@SQLDelete(... SET enabled = false ...)`
(`…/persistence/MedicamentJpaEntity.java:11-12`). Por tanto:

- `GET /admin/medicaments` devuelve **solo activos** (`enabled` siempre `true`).
- `GET /admin/medicaments/disabled` es una **nativa** que salta el `@SQLRestriction`
  (`WHERE enabled = false AND company_id IS NULL`) y devuelve **solo pausados** (`enabled` siempre
  `false`).
- `GET /medicaments` (contexto) devuelve **solo activos**.

**Ningún listado mezcla estados.** De ahí sale, a la vez, que la pestaña «Pausados» sea posible y que
la columna «Estado» siga sin tener sentido (§5.6).

### 3.5 Orden — corregido en la v3

- `findAllGlobal` ordena en servidor `name ASC, id ASC`, «para que la paginacion sea determinista»
  (`JpaMedicamentRepository.java:63-70`). **No hay parámetro `sort`.** Reordenar en el navegador
  ordenaría *la página*, no el catálogo: la fila buscada seguiría en la página 7. **No se pintan
  cabeceras ordenables.** Se dice, una vez, en el pie: «Orden alfabético por nombre.»
- `findAllDisabledGlobal` **era** una nativa sin `ORDER BY` (`MedicamentJpaRepository.java:85-91`),
  así que el orden llegaba arbitrario y la v2 mandaba ordenar en cliente. **El backend le añade el
  `ORDER BY name`**, con lo que el arreglo va al origen y las dos pestañas comparten criterio de
  orden. **La v3 retira la ordenación en cliente**: ya no hace falta, y mantenerla sería un
  `localeCompare` que reordena lo que el servidor ya ordenó, con el riesgo de discrepar de él en los
  acentos.

### 3.6 Conflicto de nombre — código exacto para el formulario

`GlobalExceptionHandler` devuelve `409` con `code = "MEDICAMENT_NAME_ALREADY_EXISTS"` y
`detail = "Ya existe un medicamento activo con ese nombre en este ámbito."`
(rama de `uq_medicaments_owner_active_name` / `uq_medicaments_name`). El front lo lee con
`getProblemDetailCode(error)` (`VetSoftwareFront/src/services/http/http.client.ts:342`).

El ámbito es real, no retórico: la clave única es `(owner_scope, active_name)` con
`owner_scope = COALESCE(company_id, 0)`, así que **que la empresa 7 ya tenga su «Amoxicilina» privada
no bloquea el alta global** — son claves distintas. El formulario **no** debe sugerir lo contrario.

### 3.7 Tres bordes del contrato que el diseño tiene que conocer

- **El alta puede resucitar, y eso ahora es visible.** `CreateGlobalMedicamentService` busca por
  nombre **incluyendo pausadas** y, si la encuentra, **la reactiva con el nombre y la descripción
  recién escritos** en vez de insertar otra (#432). Con la pestaña «Pausados» en pantalla esto deja
  de ser invisible y pasa a ser un **riesgo de estado obsoleto**: la fila desaparece de «Pausados»
  sin que esa pestaña se entere. Mitigación obligatoria en §5.10.
- **La igualdad de nombres la decide la base** con `utf8mb4_0900_ai_ci`: insensible a acentos y a
  caja. «Amoxicilina» y «amoxicilina» **chocan**. Es también el criterio que debe seguir la búsqueda
  (§3.3) y lo que dice el `hint` del campo (§7.3).
- **Pausar un global falla si CUALQUIER clínica lo tiene recetado.** `DeleteGlobalMedicamentService`
  comprueba recetas activas **sin acotar por empresa**, a propósito: «un global lo receta cualquier
  tenant». Es un fallo de alta probabilidad, no un borde raro, y por eso tiene texto propio en §7.5.

---

## 4. Mapa de pantallas

| Pantalla | Ruta | Fuente | Buscador | Escritura | En el menú |
|---|---|---|---|---|---|
| **Catálogo de medicamentos** | `/catalogos-clinicos/medicamentos` | `GET /admin/medicaments` (+ `/disabled`) | **sí** | **sí** | **sí** |
| Editar medicamento global | `/catalogos-clinicos/medicamentos/:id` | estado del listado + `PUT` | no | sí | no |
| **Medicamentos en toda la plataforma** | `/catalogos-clinicos/medicamentos/plataforma` | `GET /medicaments` | **sí** | **no** | **no**, enlace desde la principal |

---

## 5. Pantalla principal — «Catálogo de medicamentos»

### 5.1 Por qué la pantalla principal es el catálogo global **puro**

La v1 mostraba globales y privados juntos con una columna «Ámbito». Con `/admin/medicaments`
paginando solo-globales **en el servidor**, esa decisión se reevaluó y cambió en la v2.

**El motivo de la v1 para mezclar era aritmético, y caducó.** `PageResponse.totalElements` cuenta
todas las filas, así que descartar las privadas en el navegador producía «Mostrando 1–20 de 340» con 6
filas pintadas y, en cuanto una empresa tuviera 20 medicamentos propios seguidos —el orden es
alfabético global, ocurre con un solo tenant activo—, **páginas enteras vacías** con el paginador
afirmando que hay 340 registros. Inevitable mientras el único listado fuera mixto; ya no.

**Tres cosas que se ganan al separar:**

1. **Las acciones coinciden con el contenido.** En una tabla mixta, unas filas aceptan Editar/Pausar
   y otras no, así que el operador tiene que **leer la columna de ámbito antes de cada clic**. En la
   tabla pura, todas las filas se comportan igual. Nielsen #4 (consistencia) y #6 (reconocer antes
   que recordar).
2. **El estado vacío vuelve a decir la verdad.** En la tabla mixta, «Aún no hay medicamentos» era
   prácticamente inalcanzable: cualquier medicamento de cualquier tenant la llenaba, de modo que un
   **catálogo global vacío parecía poblado**.
3. **El recuento significa algo.** `totalElements` es **el tamaño del vademécum global**, que es lo
   que el superusuario gobierna. Antes era una mezcla de datos de plataforma y de tenants: un número
   sin dueño.

**Qué NO se tira.** El listado mixto sigue siendo la única ventana a lo que crean los tenants. **No se
elimina: se reubica** en §6, con el mismo diseño de columna «Ámbito» y la misma prohibición de
acciones que la v1 fijó.

**Consecuencia sobre el nombre.** La pantalla se llama **«Catálogo de medicamentos»**, con subtítulo
que dice de quién es el catálogo. No «Medicamentos globales»: el rótulo del menú y el `<h1>` se leen
antes que el subtítulo, y «Catálogo de medicamentos» es como el usuario llama a la cosa.

### 5.2 Conmutador de estado: **Activos / Pausados**

Un conmutador segmentado en la cabecera, a la izquierda del botón primario. Dos opciones:
**`Activos`** (por defecto) y **`Pausados`**.

- **El eje es limpio: es estado, no ámbito.** Las dos pestañas son globales; la pantalla entera lo
  es. Un conmutador que mezclara ejes («Globales / Pausados») no tendría un opuesto claro.
- **Vocabulario del tenant, deliberadamente.** `VetSoftwarePublicFront/src/features/medicamentos/views/MedicamentosView.vue`
  ya dice «Pausados» y «Reactivar». Un mismo concepto no puede llamarse distinto en los dos fronts.
  Se cambia solo «Disponibles» por **«Activos»**: en la consola nada está «disponible para recetar»,
  porque desde aquí no se receta.
- Patrón APG **Tabs** (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): `role="tablist"` con
  `role="tab"` reales, `aria-selected`, `aria-controls`, foco gestionado con flechas y un solo tab
  en el orden de tabulación. **La consola no tiene este componente y hay que crearlo** (§9.2). El
  antipatrón a evitar está documentado en el propio tenant: un `role="tablist"` cuyos botones no eran
  `role="tab"` (`MedicamentosView.vue`, comentario de `.head-actions`).
- **Sin contadores en los rótulos.** «Activos (153)» exigiría una segunda petición por pestaña en cada
  pulsación de tecla del buscador, o un número que se queda viejo en cuanto se busca. **R14 · un hueco
  honesto antes que un dato inventado.** El recuento vive donde es exacto: el pie del paginador y la
  región viva del buscador.

**Regla dura:** el conmutador **no se pinta como dos botones sueltos con un `v-if`**. Si el
componente accesible no está listo, se implementa antes; no se degrada a algo que anuncia mal.

### 5.3 Cabecera y disposición

```
Subtítulo:         El vademécum que comparten todas las clínicas de la plataforma.
H1:                Catálogo de medicamentos
Acciones:          [ Activos | Pausados ]   [ + Nuevo medicamento ]
Enlace secundario: Ver los medicamentos de todas las empresas →
─────────────────────────────────────────────────────────────────
Buscador:          [ 🔍 Nombre del medicamento…            ✕ ]     ← FUERA del tabpanel
─────────────────────────────────────────────────────────────────
Panel de la pestaña activa: tabla + paginador
```

- Un solo `<h1 class="ds-title">`; el subtítulo en `<p class="ds-subtitle">` (`primitives.css:586`).
- El botón primario (`ds-btn ds-btn--primary`, icono `ICONS.ADD` a 15 px) **solo se pinta en la
  pestaña Activos**. En «Pausados» crear no es la acción de esa vista, y el tenant ya toma esa misma
  decisión.
- El enlace a la vista de contexto es un `RouterLink` con clase `ds-btn ds-btn--ghost ds-btn--sm`, no
  una entrada de menú (§9.3 explica por qué no va al sidebar).
- **El buscador va entre el conmutador y la tabla, y FUERA del `role="tabpanel"`.** Es la consecuencia
  estructural de §5.5.3: el término se conserva al cambiar de pestaña, así que el control pertenece a
  la pantalla, no al panel. Meterlo dentro del panel diría al lector de pantalla que es propiedad de
  «Activos» y desaparecería y reaparecería en cada cambio.

### 5.4 Columnas y acciones por fila

**Pestaña «Activos»** — `AppTable` con `:headers`:

| # | Cabecera | Contenido | Clase | Notas |
|---|---|---|---|---|
| 1 | `Medicamento` | `m.name` | `ds-text-strong` | Sin truncar: es el dato que se busca a ojo. |
| 2 | `Descripción` | `m.description \|\| '—'` | `ds-meta` | Sin truncar. `—` es el marcador vacío de la casa. |
| 3 | `Fecha creación` | `formatDate(m.createdDate)` | `ds-meta` | `VetSoftwareFront/src/composables/format.ts:76`. **No** el ISO crudo, como hace hoy `LaboratoryTestTypesListView.vue:145`. |
| 4 | `Acciones` | ✏️ Editar · ⏸ Pausar | `ds-col-actions` | `.ds-icon-btn` y `.ds-icon-btn--danger`. |

**Pestaña «Pausados»** — tres columnas: `Medicamento`, `Descripción`, `Acciones` (↻ **Reactivar**).
Se omite `Fecha creación`: en una fila resucitada es **la fecha original** (§3.7) y pintar una fecha
que no explica nada de la pausa es ruido. La acción va con **rótulo de texto**, no icono a secas
—`ds-btn ds-btn--ghost ds-btn--sm` con `ICONS.RETRY`—: es la única acción de la vista y no compite
por espacio.

**Ninguna columna «Ámbito» en esta pantalla.** Todas las filas son globales por construcción del
endpoint; una columna constante es decorado (R14).

Los `<th>` de acciones llevan el literal **`Acciones`** visible, no vacío: el lector de pantalla
anuncia la cabecera al entrar en la celda.

La tabla ya se desplaza en horizontal en pantallas estrechas: `AppTable` envuelve en
`.ds-table-scroll` (**R15**, WCAG 2.2 §1.4.10 Reflow), y su `<style scoped>` documenta por qué el
`overflow: hidden` salió de ahí (`VetSoftwareFront/src/components/ui/AppTable.vue:135-149`).

### 5.5 Buscador — dónde vive y cómo se comporta

Componente: **`AppListSearch`** (`VetSoftwareFront/src/components/ui/AppListSearch.vue`), **sin
modificar**. Tiene 30 consumidores en esta consola y ya trae resuelto todo lo de §8.3.

```html
<AppListSearch
  :model-value="filtros.q"
  label="Buscar medicamentos"
  placeholder="Nombre del medicamento…"
  :result-count="recuento"
  @update:model-value="buscar"
/>
```

#### 5.5.1 Servida, no en cliente — y el porqué en una frase

> Filtrar en el navegador una respuesta paginada mira solo las 20 filas visibles: **diría «no existe»
> sobre lo que está en la página 6, y el operador crearía un duplicado** que después el índice único
> rechaza con un 409 sobre algo que él mismo acaba de buscar sin encontrar. El parámetro `q` servido
> es exactamente lo que cierra ese agujero.

Criterio: `VetSoftwareFront/docs/ux/patron-de-busqueda-en-listado.md` §3 «Relación con la paginación»
y §5 «Dictamen sobre los listados sin endpoint de búsqueda». Precedente en el propio código:
`CompaniesListView.vue:172-175` y `companies.api.ts:40-43`.

**«Pausados» también busca en servidor**, aunque su respuesta no esté paginada y filtrar en cliente
allí sería técnicamente legítimo (§3.5). Razón: **un mismo control no puede tener dos semánticas
según la pestaña.** Si en «Activos» buscara subcadena insensible a acentos en el servidor y en
«Pausados» hiciera otra cosa en el navegador, la misma consulta daría resultados distintos según
dónde estuviera el usuario, y nadie podría explicar por qué. Un solo criterio, en un solo sitio.

#### 5.5.2 Comportamiento, punto por punto

| Aspecto | Decisión | Cómo se consigue |
|---|---|---|
| **Rebote** | **300 ms**, el número de la casa | valor por defecto de `AppListSearch` (`delayMs: 300`) y de `useServerPaged` (`debounceMs: 300`). **No se toca.** |
| **Enter** | busca ya, sin esperar el rebote, y **nunca recarga la página** | `@keydown.enter.prevent="onEnter"`, ya en el componente. «Alguien con prisa lo pulsa por costumbre y no puede perder la pantalla por ello». |
| **Escape** | limpia el término y devuelve el listado completo, **sin mover el foco** | `onEscape()`, ya en el componente |
| **Botón ✕** | limpia y **devuelve el foco al campo** | `limpiar()` hace `inputEl.focus()`, ya en el componente |
| **Petición en vuelo** | se **aborta** la anterior en cada término nuevo | `useServerPaged` (`inflight?.abort()`), para que la respuesta de «amox» no llegue después de la de «amoxi» y la pise |
| **Vuelta a la página 1** | **sí, siempre**, al cambiar el término | Ya lo hace `useServerPaged`: `watch(options.query, () => … fetchPage(1))`, con el comentario «mantener la 5 al cambiar de termino deja al usuario mirando un hueco vacio del resultado nuevo». **Se consigue pasando `query` como `Ref` al composable, no llamando a `goTo` a mano.** |
| **Estado de carga** | **sin velo global.** Las filas anteriores **se conservan** mientras la consulta viaja; solo cambia `aria-busy` | `skipGlobalLoader: true` en la petición, como `companies.api.ts:53`. En `AppTable`, la rama de refresco conserva las filas: el esqueleto solo aparece con `loading && empty`, es decir en la **primera** carga. Así teclear no produce parpadeo. |
| **Persistencia** | el término, la pestaña y la página viven en la **URL** | `useQuerySync({ q: '', page: '1', estado: 'activos' }, { debounceMs: 300 })`. Escribe con `router.replace`, no `push`: ocho letras no pueden meter ocho entradas en el historial. Hace la búsqueda compartible y superviviente a un F5 y al botón «atrás». |
| **Campos que mira** | **solo el nombre**, y el `placeholder` lo dice | El `placeholder` de un buscador **tiene que decir la verdad** sobre lo que busca. `Nombre del medicamento…`, no `Nombre o descripción…`. |

#### 5.5.3 El término **se conserva** al cambiar de pestaña

**Decisión: el término persiste, y el cambio de pestaña vuelve a ejecutar la búsqueda en el conjunto
nuevo.** Tres razones, en orden de peso:

1. **Es el flujo real, no un caso raro.** El recorrido más frecuente de esta pantalla es exactamente:
   buscar «amoxi» en Activos → no aparece → **comprobar si está pausado**. Limpiar el término al
   cambiar de pestaña obliga a reescribirlo justo en el momento en que el usuario está siguiendo un
   hilo. Sería borrar el trabajo del usuario, que es la primera cosa que este producto no puede
   hacer.
2. **El control está fuera del panel, y por tanto no es del panel.** El buscador se aplica a los dos
   conjuntos y vive físicamente encima de los dos (§5.3). Un control que persiste en pantalla pero
   se vacía solo al pulsar otra cosa es un cambio de estado que el usuario no pidió — Nielsen #1
   (visibilidad) y #7 (flexibilidad).
3. **Coherencia con la decisión de la v2.** Allí escribí «o en las dos, o en ninguna» sobre poner
   buscador solo en «Pausados». La misma lógica se aplica al término: un buscador que vale para las
   dos pestañas pero cuyo contenido solo vale para una es medio buscador.

**El riesgo que hay que neutralizar, y cómo.** Con el término conservado, cambiar a «Pausados» puede
mostrar «sin resultados» y hacer creer que **la pestaña** está vacía cuando lo que está vacío es **la
búsqueda dentro de la pestaña**. Se neutraliza en el propio estado vacío (§5.7), que:

- **nombra el término y la pestaña**: «Sin resultados para «amoxi» entre los pausados»;
- ofrece **dos salidas**, no una: `Limpiar búsqueda` y **`Buscar «amoxi» en activos`**, un botón que
  cambia de pestaña **conservando el término**. Eso convierte el riesgo en el atajo del flujo del
  punto 1.

**En la URL** el término y la pestaña son claves independientes (`q`, `estado`), así que un enlace
compartido reproduce las dos cosas.

### 5.6 Por qué sigue sin haber columna «Estado» — R14 revisada

La v1 la descartó porque el único listado devolvía solo activos. Con dos listados, el argumento **se
refuerza en vez de caer**: dentro de cada pestaña el estado es **constante por construcción del
endpoint** (§3.4). Una columna «Estado» diría «Activo» en las 20 filas de una pestaña y «Pausado» en
las 20 de la otra.

**El estado lo comunica el conmutador, que además es el control con el que se cambia de conjunto.**
Duplicarlo en una columna es repetir un dato constante y sugerir un filtro que no existe — exactamente
**R14 · «Un hueco honesto antes que un dato inventado»**
(`VetSoftwareFront/docs/ux/reglas-de-interfaz.md`).

Por lo mismo, **el campo `enabled` de la respuesta no se pinta nunca**, en ninguna de las tres
pantallas.

### 5.7 Estados: carga, error, y los **cuatro** vacíos

Carga y error los pone `AppTable` (`VetSoftwareFront/src/components/ui/AppTable.vue`), que ya resuelve
los cuatro **con el orden de ramas correcto: error ANTES que vacío**, y el propio componente explica
por qué invertirlas disfraza un 500 de «no hay registros» (`AppTable.vue:15-24`).

| Estado | Qué se pinta | Props |
|---|---|---|
| **Primera carga** | esqueleto de 5 filas, `aria-hidden="true"`, `<table aria-busy>`, y un `<p class="ds-sr-only" role="status">Cargando…</p>` **fuera** de la tabla | `:loading` + `:empty` |
| **Refresco** (buscar, paginar, cambiar de pestaña) | **las filas se conservan**; solo cambia `aria-busy` | ídem |
| **Error** | banner `.ds-banner--error` con `role="alert"`, botón **Reintentar** y la traza con botón **Copiar** | `:error` `:trace-id` `@retry` |
| **Vacío** | slot `#empty` de la vista, con las cuatro ramas de abajo | `:empty` |

Umbrales de NN/g (*Response Times*): por debajo de 1 s no hace falta indicador. Una página de 20 filas
cae ahí, y por eso la búsqueda **no** monta un indicador propio: el rebote de 300 ms más una respuesta
corta quedan por debajo del umbral de percepción, y conservar las filas anteriores es menos molesto
que hacerlas parpadear. Recordatorio de **R06**: `PawLoader` es el único loader de la casa y aquí no
se usa ninguno.

#### Los cuatro vacíos — **sin resultados ≠ catálogo vacío**

Es la distinción que la v2 no tenía porque no había búsqueda. Son **cuatro pantallas distintas, con
cuatro textos y dos salidas distintas**. Confundirlas es el defecto que `AppTable` documenta en su
slot `#empty`: «Vacío de búsqueda y vacío de verdad son estados DISTINTOS».

**A · Activos, con término — la búsqueda no casó**

```
Título:       Sin resultados para «amoxi»
Descripción:  Revisa la escritura o prueba con menos palabras. La búsqueda no distingue
              mayúsculas ni acentos.
Acciones:     [ Limpiar búsqueda ]          ds-btn ds-btn--ghost
              [ Buscarlo en pausados ]      ds-btn ds-btn--ghost   ← conserva el término
```

**Sin botón de crear.** Quien busca quiere encontrar, no dar de alta: es la regla que ya aplican
`LaboratoryTestTypesListView.vue:116-140` y `CompaniesListView.vue:192-210`. Y **antes de ofrecer
crear hay que descartar que esté pausado**, que es justo lo que hace el segundo botón: sin él, el
camino natural desde aquí es crear un duplicado de algo que existe pausado y comerse el 409 de §3.6.

**B · Activos, sin término — el catálogo global está vacío de verdad**

```
Título:       Aún no hay medicamentos globales
Descripción:  El vademécum global es lo que toda clínica puede recetar sin haberlo creado.
Acción:       [ + Nuevo medicamento ]       ds-btn ds-btn--primary
```

**Con** botón de crear: es la salida que NN/g (*Empty State Interface Design*) exige de un estado
vacío real.

**C · Pausados, con término**

```
Título:       Sin resultados para «amoxi» entre los pausados
Descripción:  Puede que exista y esté activo.
Acciones:     [ Limpiar búsqueda ]          ds-btn ds-btn--ghost
              [ Buscarlo en activos ]       ds-btn ds-btn--ghost   ← conserva el término
```

El título **nombra la pestaña**, no solo el término: es la mitigación de §5.5.3 y lo que impide leer
«no hay nada pausado» donde pone «no hay nada pausado *que se llame así*».

**D · Pausados, sin término**

```
Título:       No hay medicamentos pausados
Descripción:  Aquí aparecen los globales que se retiraron del recetario, para poder reactivarlos.
Acción:       (ninguna)
```

Es un **buen** estado, no una carencia: no hay nada que el usuario deba hacer. Ofrecer «Nuevo
medicamento» aquí sería empujar a un sitio que no tiene que ver con lo que está mirando.

**Regla de implementación:** la rama la decide `filtros.q.trim()`, y el término se pinta **recortado**
y entre comillas latinas, como en los dos precedentes de la consola.

### 5.8 Confirmación destructiva

Único diálogo de la casa: `useConfirmDialog()`
(`VetSoftwareFront/src/composables/useConfirmDialog.ts`), que expone `message`, `consequence` y
`confirmLabel`. El rótulo **nombra la acción**, nunca «Aceptar» — WCAG 2.2 §3.3.4 y NN/g.

```ts
const ok = await confirm({
  message: `¿Pausar el medicamento global "${m.name}"?`,
  consequence:
    'Dejará de estar disponible al recetar en TODAS las clínicas de la plataforma. ' +
    'Podrás reactivarlo desde la pestaña «Pausados». Las recetas ya emitidas no cambian.',
  confirmLabel: 'Pausar medicamento',
})
```

Cuatro decisiones de redacción:

- **«Pausar», no «Eliminar».** El verbo describe lo que pasa: `DELETE` es baja lógica. Llamarlo
  «eliminar» —como hacen hoy los otros 9 catálogos— miente en la dirección peligrosa: hace creer
  irreversible algo que no lo es, y hace dudar de pulsar.
- **«TODAS las clínicas».** Es la diferencia entera entre esta pantalla y la del tenant, y hay que
  leerla antes de confirmar, no después.
- **«Podrás reactivarlo desde «Pausados».»** La reversibilidad **es cierta y alcanzable** desde que
  se cerró el defecto de `reactivateGlobal`. Decirlo baja el coste percibido de la acción — Nielsen
  #3, control y libertad.
- **«Las recetas ya emitidas no cambian.»** Sin ese renglón el operador no puede saber si está
  tocando el histórico clínico.

**La reactivación no se confirma**: es constructiva y reversible. Confirmar lo inocuo entrena a
confirmar sin leer.

### 5.9 Paginación

`AppPagination` (`VetSoftwareFront/src/components/ui/AppPagination.vue`) sobre `useServerPaged`
(`VetSoftwareFront/src/composables/useServerPaged.ts`). `pageSize` = 20, el `DEFAULT_PAGE_SIZE` de
`VetSoftwareFront/src/types/pagination.ts` **y** el default del controlador: que las dos puntas
coincidan evita que la primera página se sirva con un tamaño y las siguientes con otro.

`useServerPaged` ya hace lo que aquí importa: convierte 1-based ↔ 0-based **en un solo sitio**, aborta
la petición en vuelo, **vuelve a la página 1 al cambiar el término** (§5.5.2), y ante un fallo vacía
la lista y guarda mensaje + `X-Trace-Id` (**R05**).

**El paginador solo existe en «Activos».** «Pausados» no está paginado (§3.3) y pintar un paginador
sobre una lista completa sería una promesa falsa de que hay más.

**No se pinta cargando ni bajo error** — misma guarda que `CompaniesListView.vue:253-254`:

```html
<AppPagination v-if="!loading && !error && total > 0" … />
```

«Mostrando 0–0 de 0» bajo un banner de error afirma que no hay registros cuando lo cierto es que no
se pudo preguntar. Con búsqueda activa, `total` es **el total de coincidencias**, no el del catálogo:
es lo que `AppPagination` documenta en su prop (`total`: «Elementos que casan con la consulta, no los
del catálogo entero»). En «Pausados», el pie equivalente es un `<p class="ds-meta">` con el recuento
simple, y **tampoco** se pinta bajo error.

### 5.10 Sincronía entre las dos pestañas — obligatoria, no opcional

Las dos listas son conjuntos disjuntos que **se alimentan la una de la otra**. Toda mutación mueve
una fila de un lado al otro, y una pestaña con datos rancios produce un 404 sobre algo que el usuario
está viendo.

| Acción | Efecto en la lista de origen | Efecto en la otra |
|---|---|---|
| **Crear** | la fila entra en «Activos» → recargar la página actual | **invalidar «Pausados»**: el alta pudo ser una **resurrección** (§3.7) y esa fila ya no está pausada |
| **Editar** | reemplazar la fila en «Activos» | — |
| **Pausar** | quitar la fila de «Activos» y **recargar la página actual** (el hueco lo llena una fila de la página siguiente) | invalidar «Pausados» |
| **Reactivar** | quitar la fila de «Pausados» | invalidar «Activos» |

«Invalidar» = marcar la lista como no cargada y volver a pedirla **al entrar en su pestaña**, no de
inmediato: refrescar una lista que nadie está mirando gasta una petición y puede pisar un error.
**La recarga al entrar reutiliza el término vigente** (§5.5.3): se pide con el `q` actual, no sin él.

**El defecto concreto que esta regla evita:** crear «Amoxicilina» cuando existe una global pausada con
ese nombre devuelve `201` y **resucita la pausada**. Sin invalidar, el usuario cambia a «Pausados»,
ve la fila que ya no existe, pulsa **Reactivar** y recibe un 404 sobre algo que tiene delante.

**Una mutación NO limpia el término.** Tras crear, editar, pausar o reactivar, la búsqueda vigente se
mantiene y la lista se recarga con ella. Limpiarla sería sacar al usuario del sitio donde estaba
trabajando.

---

## 6. Pantalla secundaria — «Medicamentos en toda la plataforma»

Ruta `/catalogos-clinicos/medicamentos/plataforma`. Fuente `GET /medicaments` (paginado,
`hasRole('SYSTEM')`). **Solo lectura.**

### 6.1 Para qué existe

Para responder a una sola pregunta: **qué están creando los tenants por su cuenta**. Ahí está la lista
de lo que falta en el vademécum global y la de los duplicados con grafías distintas. Es una **lente de
consulta**, no un puesto de trabajo.

### 6.2 Columnas

| # | Cabecera | Contenido |
|---|---|---|
| 1 | `Medicamento` | `m.name`, `ds-text-strong` |
| 2 | `Descripción` | `m.description \|\| '—'`, `ds-meta` |
| 3 | `Ámbito` | ver §6.3 |
| 4 | `Fecha creación` | `formatDate(m.createdDate)`, `ds-meta` |

**Sin columna «Acciones».** Una columna sin contenido en ninguna fila es una cabecera que promete algo
que no llega.

### 6.3 Cómo se distinguen los ámbitos — **y por qué no hay acciones, tampoco en las filas globales**

Dos representaciones que se diferencian **por texto, no solo por color** (WCAG 2.2 §1.4.1, A):

- **Global** → `<span class="ds-pill ds-tone--accent-soft">` con icono `Globe` (14 px,
  `aria-hidden="true"`) y el literal **`Global`**. Mismo lenguaje visual que el tenant, pero **sin
  copiar su CSS**: `.ds-pill` (`primitives.css:1349`) y `.ds-tone--accent-soft` (`:299`) ya existen en
  la consola. Escribirlo en el `<style scoped>` lo rechazaría `vetsoftware/no-duplicate-primitive`
  (FE-08), y con razón. El borde local del tenant **no se replica**.
- **De empresa** → **el nombre de la empresa en texto plano** y, debajo, su `identifier` en
  `class="ds-meta"`:

  ```
  Veterinaria San Roque
  NIT 900123456-7
  ```

**Por qué la empresa NO lleva píldora.** El tenant pinta «Propio» porque para él es un estado; aquí es
**un dato**, uno distinto por fila. Veinte píldoras con veinte nombres convierten la columna en
confeti y destruyen justo lo que la píldora aporta: que «Global» salte a la vista. La asimetría es
intencionada — **hay un estado singular y muchos datos**.

**Por qué no dos columnas «Ámbito» y «Empresa».** Su contenido es mutuamente excluyente por invariante
de dominio (§3.1): una estaría siempre vacía en cada fila. Un `—` sistemático es ruido de exploración
sin información.

Fallback: si `general === false` y `company === null` —imposible por dominio, pero un DTO puede llegar
recortado— se pinta `—` y **nunca** «Global». No se infiere «Global» de la ausencia de empresa.

**Ninguna fila ofrece acciones, ni siquiera las globales**, y **ninguna se pinta deshabilitada**:

- Sobre una fila **de empresa**, porque no hay nada legítimo que hacer (§6.5).
- Sobre una fila **global**, porque esa misma fila **ya es editable en la pantalla principal**.
  Duplicar el afordance crea dos caminos a la misma mutación y anima a operar desde la vista
  equivocada. Esta pantalla se lee; se actúa en la otra.
- **Y nunca un botón deshabilitado.** Un control apagado no explica si falta permiso, si la fila está
  bloqueada o si la consola está rota (NN/g, GOV.UK). Además, un `<button disabled>` **no es
  enfocable**: quien navega con teclado o lector de pantalla no recibe el «no disponible», recibe
  silencio. Y `.ds-icon-btn:disabled` cae a `opacity: 0.4` (`primitives.css:1085`), por debajo de
  cualquier umbral legible.

### 6.4 Buscador — mismo componente, mismo comportamiento, distinto alcance

`AppListSearch` en la misma posición: bajo la cabecera, sobre la tabla. Sin pestañas de por medio,
así que no hay nada que decidir sobre conservar el término.

```html
<AppListSearch
  :model-value="filtros.q"
  label="Buscar medicamentos en la plataforma"
  placeholder="Nombre del medicamento…"
  :result-count="recuento"
  @update:model-value="buscar"
/>
```

- **Servida por `GET /medicaments?q=…`**, por el mismo motivo de §5.5.1 y con más fuerza: aquí el
  conjunto incluye lo de **todos** los tenants, así que el número de páginas es el mayor de las tres
  pantallas y el filtro en cliente sería el más engañoso.
- **Misma semántica que la principal** —subcadena, insensible a caja y acentos, solo `name`— para que
  el mismo término dé un resultado explicable en las dos pantallas.
- **El vacío de búsqueda también se separa del vacío real**, con la salida propia de esta vista:

```
Con término:
  Título:       Sin resultados para «amoxi»
  Descripción:  Revisa la escritura o prueba con menos palabras. La búsqueda no distingue
                mayúsculas ni acentos.
  Acción:       [ Limpiar búsqueda ]          ds-btn ds-btn--ghost

Sin término:
  Título:       Aún no hay medicamentos en la plataforma
  Descripción:  Aquí aparecen el vademécum global y lo que cada empresa da de alta por su cuenta.
  Acción:       [ Ir al catálogo global ]     ds-btn ds-btn--ghost, RouterLink a la principal
```

La salida del vacío real existe pero **no es «crear»**: desde esta vista no se crea nada, y ofrecerlo
aquí sería enseñar el camino equivocado.

### 6.5 Por qué no se edita el dato de un tenant — ni aquí ni en ningún sitio

`medicaments` **no tiene columna de firma de plataforma**. El modelo de suscripciones sí la tiene donde
importa (`price_lists.published_by_system_user_id`, `subscription_amendments.requested_by_system_user_id`;
ver el javadoc de `Authz.currentSystemUserId()`), precisamente porque una decisión que afecta a un
cliente tiene que quedar firmada. Aquí no quedaría nada: la clínica vería cambiar su vademécum sin
rastro de quién lo hizo.

El backend lo respalda: `DeleteGlobalMedicamentService` filtra por `isGeneral` y su javadoc describe
el daño exacto que evita — «un DELETE de plataforma con el id del medicamento PRIVADO de una clínica
devolvería 204, lo pausaría, y la clínica dejaría de verlo en su catálogo sin una sola traza».
**La UI no debe ofrecer lo que el backend acaba de blindar.**

La acción legítima del superusuario sobre una fila de empresa es **«promover a global»**, que **no es
una edición** y está fuera de alcance (§10.2).

### 6.6 Aviso de alcance — una vez, arriba

Un `.ds-banner .ds-banner--info .ds-banner--sm` con `role="note"` e icono `ICONS.INFO` (`:size="14"`,
`class="ds-banner-icon"`), el patrón que ya usa `LaboratoryTestTypeForm.vue:81-84`:

> «Esta vista reúne el vademécum global y los medicamentos que cada empresa da de alta por su cuenta.
> Es de solo lectura: los globales se administran en **Catálogo de medicamentos** y los de una
> empresa los gestiona su propia clínica.»

Es la explicación **única** que hace innecesarios los «Solo lectura» por fila. Repetirlos —como hace
el tenant— es la misma frase multiplicada por el número de filas, y anunciada por el lector de
pantalla en cada una.

---

## 7. Formulario de alta y edición

Componente `MedicamentForm.vue`, calcado de
`VetSoftwareFront/src/features/laboratory-test-types/components/LaboratoryTestTypeForm.vue`, con las
tres mejoras de §7.4. **Alta en modal** (`AppModal`, desde el listado); **edición en ruta completa**
(`MedicamentDetailView.vue`), como manda el patrón.

### 7.1 Campos

| Campo | Control | Obligatorio | Límite | `placeholder` |
|---|---|---|---|---|
| Nombre | `AppInput` | sí (`required`) | **2–200** | `Amoxicilina 500 mg` |
| Descripción | `AppTextarea` `:rows="3"` | **no** | **≤ 500** | `Antibiótico betalactámico de amplio espectro` |

Los máximos salen de `CreateGlobalMedicamentRequest` / `UpdateGlobalMedicamentRequest`
(`@Size(max = 200)` / `@Size(max = 500)`), no de una convención del front. El **mínimo de 2 es un
suelo del front**, que el backend no impone: se conserva por coherencia con los 9 catálogos
existentes (`LaboratoryTestTypeForm.vue:33` usa `length(…, 2, 100)`) y porque un nombre de un carácter
es una errata. Queda declarado como tal para que nadie lo confunda con el contrato.

**Que la descripción sea opcional no es negociable**: el backend la acepta vacía (`@Size` sin
`@NotBlank`). Exigirla sería el front inventándose una regla, que es exactamente lo que prohíbe el
comentario de `LaboratoryTestTypeForm.vue:34-36`: «Manda el contrato, no el front».

**Y no hay ningún campo más.** Ni empresa ni ámbito: `CreateGlobalMedicamentRequest` **no los acepta**
y su javadoc explica por qué («aceptarla sería dejar que el cliente eligiera de quién es la fila que
crea»). Un selector de empresa en este formulario sería un control que el servidor ignora.

### 7.2 Validación — mensajes literales

Con `@/composables/validators` (`VetSoftwareFront/src/composables/validators.ts`), sin literales a
mano:

```ts
const errors = computed(() => ({
  name: length(form.value.name, 'El nombre del medicamento', 2, 200),
  description: maxLength(form.value.description, 'La descripción', 500),
}))
```

Textos exactos que produce, y que son los que deben aparecer en pantalla:

| Situación | Mensaje |
|---|---|
| Nombre vacío | `El nombre del medicamento es obligatorio.` |
| Nombre con 1 carácter | `El nombre del medicamento debe tener al menos 2 caracteres.` |
| Nombre > 200 | `El nombre del medicamento no puede pasar de 200 caracteres.` |
| Descripción > 500 | `La descripción no puede pasar de 500 caracteres.` |

Las cuatro cumplen las reglas de redacción de la casa (sujeto, regla real, punto final, sin culpar), y
la concordancia de género la resuelve `esObligatorio()` a partir del artículo. **No se reformulan.**

### 7.3 Texto de ayuda del campo Nombre

`AppInput` acepta `hint` y lo ata al control con `aria-describedby` cuando no hay error
(`VetSoftwareFront/src/components/ui/AppInput.vue:76-81`):

```
hint = "Se comparará sin distinguir mayúsculas ni acentos: «Amoxicilina» y «amoxicilina» son el mismo."
```

**Evita** un 409 en vez de explicarlo después (NN/g *Errors in Forms* #1: prevenir antes que señalar),
describe el comportamiento real de la collation (§3.7) y **es el mismo criterio que el buscador**, lo
que hace que el usuario pueda predecir uno desde el otro.

### 7.4 Momento de la validación, y las tres cosas que el patrón actual hace mal

**Nunca validación prematura.** El error solo aparece tras enviar: `submitted.value = true` en
`submit()`, y en la plantilla `:error="submitted ? errors.name : ''"`. Es la convención del admin
—distinta de la del tenant, que valida por `@blur`— y **aquí manda la del admin**, porque es un
formulario de dos campos que se ven a la vez.

Tres cosas que la pantalla nueva **debe añadir** y que el patrón heredado no tiene:

1. **El foco va al primer campo inválido al fallar el envío.** Hoy `submit()` pone `submitted = true`
   y no se mueve: el mensaje puede quedar fuera de la vista. WCAG 2.2 §2.4.3 y GOV.UK *Validation*.
   Implementación: `defineExpose` de un `focusFirstError()`, o `getElementById` sobre el `id` que
   `AppInput` ya genera con `useId()`.
2. **`maxlength` en el control**, además del mensaje: es la única forma de que la restricción exista
   antes de fallar. Va **junto** al validador, nunca en su lugar — `maxlength` no protege del pegado
   en todos los navegadores ni del autorrelleno.
3. **Rótulo del botón según el modo**, que el patrón sí trae y hay que conservar:
   `{{ saving ? 'Guardando…' : initial ? 'Guardar' : 'Crear' }}`.

**`ErrorSummary`** (`VetSoftwareFront/src/components/feedback/ErrorSummary.vue` + `toSummaryItems`)
existe y GOV.UK lo recomienda para todo formulario. Aquí se marca como **nota, no obligatorio**: con
dos campos visibles a la vez en un modal de 560 px, el resumen repite lo que ya está delante y aleja
el foco del control. Si el formulario llega a cuatro campos, pasa a obligatorio.

### 7.5 Guardado, errores del servidor y estado `saving`

Del patrón, **sin cambios**, porque cada línea arregló un defecto con nombre:

```ts
async function handleCreate(data: MedicamentFormData) {
  if (saving.value) return          // FORM-09 · reenvío
  saving.value = true
  try {
    await create(data)
    showModal.value = false
  } catch {
    // El composable ya avisó; el modal sigue abierto CON lo escrito.
  } finally {
    saving.value = false            // FORM-09 · AQUÍ, no dentro del try
  }
}
```

`saving` también deshabilita **Cancelar**: cancelar a mitad de un `POST` deja al usuario sin saber si
se guardó (`LaboratoryTestTypeForm.vue:12-17`). **`useUnsavedChangesGuard`** con
`showModal && formRef?.isDirty()` en el listado y con `formRef?.isDirty()` a secas en el detalle
(FORM-08).

**Errores del servidor, por caso:**

| Caso | Qué hace la UI |
|---|---|
| **409 `MEDICAMENT_NAME_ALREADY_EXISTS`** | El modal **sigue abierto**. Se marca `name` con el error en línea `Ya existe un medicamento activo con ese nombre en este ámbito.` —**texto literal del servidor**, no reformulado— y se le devuelve el foco. Detección: `getProblemDetailCode(e) === 'MEDICAMENT_NAME_ALREADY_EXISTS'` (`http.client.ts:342`). |
| **409 recetas activas** (`MedicamentHasActiveChildrenException`, al pausar) | `errorFrom('No se pudo pausar el medicamento', e, 'Alguna clínica lo tiene recetado ahora mismo.')`. La fila **se queda como estaba**. **Es un fallo probable, no raro** (§3.7): el suelo del mensaje tiene que explicar la causa aunque el `ProblemDetail` venga escueto. |
| **409 concurrencia** (`ObjectOptimisticLockingFailureException`) | `warnFrom('Otro operador editó primero', e)` — **tono `warn`, no `error`**: no es un fallo, es que alguien llegó antes. `useToast` ya tiene el método y conserva la traza (`VetSoftwareFront/src/composables/useToast.ts`). Se recarga la página actual. |
| **404 al editar/pausar** | La fila ya no existe o no es global. `errorFrom('El medicamento ya no está disponible', e)` + recarga de la página actual. **No** se dice «no tienes permiso»: el backend devuelve 404 a propósito, para no revelar de quién es la fila. |
| **Cualquier otro** | `errorFrom(<título>, e, <suelo>)`. **Nunca** `error(titulo, getProblemDetailMessage(e))` a mano: eso tira el `X-Trace-Id` y soporte se queda sin poder correlacionar. |

Avisos de éxito, con el vocabulario del tenant: `Medicamento creado`, `Medicamento actualizado`,
`Medicamento pausado`, `Medicamento reactivado`.

---

## 8. Accesibilidad — WCAG 2.2 nivel AA

### 8.1 Lo que las primitivas ya resuelven — **conservar sin tocar**

| Pieza | Qué aporta | Criterio |
|---|---|---|
| `AppInput` / `AppTextarea` | `aria-invalid` **y** `aria-describedby` apuntando al `id` del mensaje; `hint` por el mismo canal cuando no hay error | **§3.3.1 Identificación de errores (A)** · `AppInput.vue:62-81`, `AppTextarea.vue:90-91` |
| `AppTable` | `<p class="ds-sr-only" role="status">` fuera de la tabla, `aria-busy` en `<table>`, banner de error con `role="alert"` | **§4.1.3 Mensajes de estado (AA)** · `AppTable.vue:54-63` |
| `AppListSearch` | el patrón de búsqueda entero — ver §8.3 | §3.3.2, §4.1.3, §2.1.1 |
| `AppModal` → `ModalShell` | `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape y foco inicial | §4.1.2, §2.1.2 |
| `AppPagination` | `<nav aria-label="Paginación">` + rango «Mostrando x–y de z» | §1.3.1, §2.4.6 |
| `.ds-focus-ring` | anillo tokenizado, **R03** medido ≥ 3:1 contra la superficie | **§2.4.11 Focus Appearance (AA, nueva en 2.2)** |
| `.ds-icon-btn` | **28 × 28 px** | **§2.5.8 Target Size (AA, nueva en 2.2): ≥ 24 × 24.** Pasa. `primitives.css:1066-1071` |

**Esta feature no reimplementa ninguna de las siete.** Un `aria-*` que ya pone la primitiva y se repite
en la vista es un `aria-*` que algún día divergirá.

### 8.2 Lo que la feature **sí** tiene que aportar

1. **Un solo `<h1>` por pantalla**, `class="ds-title"`, más `<p class="ds-subtitle">`
   (`primitives.css:586`). §2.4.6 y §2.4.2 — la consola declara `<html lang="es">` desde **R08**.
2. **El conmutador Activos/Pausados con el patrón APG Tabs completo** (§5.2 y §9.2):
   `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls`, navegación con flechas y un
   solo tab en el orden de tabulación. §4.1.2 y §2.1.1.
3. **El buscador va FUERA del `role="tabpanel"`** (§5.3). El panel envuelve solo la tabla y su
   paginador. Si el campo quedara dentro, el árbol de accesibilidad diría que pertenece a «Activos»
   y desaparecería del panel al cambiar de pestaña, contradiciendo que el término se conserva.
4. **Una sola región viva, no dos** — **corrección de la v2.** La v2 pedía un `ds-sr-only` extra con
   `role="status"` para anunciar el cambio de pestaña. **Se retira.** `AppListSearch` ya tiene una
   región `role="status"` persistente cuyo `watch` observa `[resultCount, modelValue]`, así que
   **también se dispara cuando cambia el recuento sin cambiar el término** — que es exactamente lo
   que pasa al cambiar de pestaña. Dos regiones `polite` actualizándose por la misma acción del
   usuario producen el clásico anuncio doble. La secuencia correcta queda: *«Pausados, seleccionado»*
   (semántica del tab) → *«12 resultados»* (región del buscador).
5. **Nombres accesibles con el sujeto de la fila** — **R04**, §2.4.4 / §4.1.2. `aria-label="Editar"`
   repetido en 20 filas produce veinte controles indistinguibles:

   ```html
   <RouterLink :aria-label="`Editar ${m.name}`" …>
   <button    :aria-label="`Pausar ${m.name}`"  …>
   <button    :aria-label="`Reactivar ${m.name}`" …>
   ```

   Hoy `LaboratoryTestTypesListView.vue:151,158` incumple esto. **No se hereda.**
6. **Iconos decorativos con `aria-hidden="true"`**: el `Globe` de la píldora y los de los botones
   —estos ya llevan el nombre en el `aria-label`—. §1.1.1.
7. **La píldora «Global» dice «Global» en texto.** Un icono a solas no comunica el ámbito ni a un
   lector de pantalla ni a quien no distingue el matiz de amatista. §1.4.1 (A).
8. **`v-for :key="m.id"`**, jamás el índice ni el nombre — **R12**.
9. **Foco tras una mutación.** Al pausar o reactivar, la fila desaparece y **el foco cae al `<body>`**.
   Tras la operación, el foco va al **conmutador de la pestaña activa** (§2.4.3, §3.2.2).
10. **El foco NO se mueve cuando la tabla se actualiza por una búsqueda.** El usuario está tecleando;
    robarle el foco hacia la tabla o hacia el estado vacío rompería la escritura y sería un cambio de
    contexto no solicitado — **WCAG 2.2 §3.2.2 Al recibir entradas (A)**. Los únicos movimientos de
    foco permitidos en el buscador son los que ya trae el componente: el botón ✕ devuelve el foco al
    campo, y Escape limpia **sin** moverlo.

### 8.3 Accesibilidad del patrón de búsqueda — ya resuelta, y **no se toca**

`AppListSearch` la trae completa. Se documenta aquí para que nadie la «mejore»:

| Elemento | Cómo está resuelto | Criterio |
|---|---|---|
| **Etiqueta** | `<label :for="fieldId">` **visible**, con `useId()`. `hideLabel` existe pero **aquí no se usa**: un `placeholder` no es una etiqueta y desaparece al escribir. | **§3.3.2 Etiquetas o instrucciones (A)**, §1.3.1 |
| **Rol del campo** | `type="search"`, no `type="text"` | §4.1.2 |
| **Icono de lupa** | `aria-hidden="true"` | §1.1.1 |
| **Botón de limpiar** | `aria-label="Limpiar búsqueda"`; el nativo de `type="search"` se oculta por CSS porque **no tiene nombre accesible** y serían dos botones | §4.1.2, §2.4.4 |
| **Anuncio del recuento** | `<p class="ds-sr-only" role="status">` con `«N resultados»` / `«Sin resultados»` | **§4.1.3 Mensajes de estado (AA)** |
| **La región es PERSISTENTE** | el nodo existe siempre y **solo cambia su texto**. El propio componente lo explica: si se montara con `v-if` a la vez que el mensaje, «muchos lectores no anunciarían nada porque la región no existía cuando cambió». **No convertirla en `v-if`.** | §4.1.3 |
| **El anuncio va con el MISMO rebote** | si no, «el lector de pantalla recitaría un número por pulsación y la región viva se volvería ruido del que la gente se defiende apagándola» | §4.1.3, y sentido común |
| **Nada se anuncia mientras carga** | `:result-count="null"` ⇒ región vacía. Se cablea con `computed(() => (loading ? null : total))`, como `CompaniesListView.vue:97` | evita anunciar un número obsoleto |
| **Teclado** | Enter busca sin recargar; Escape limpia sin mover el foco | **§2.1.1 Teclado (A)** |

> **El contraste que conviene tener presente.** `AppListSearch` **sí** anuncia su recuento por región
> viva; `AppPagination` **no** anuncia su rango (§8.4). Son el mismo criterio —§4.1.3— resuelto en un
> componente y olvidado en el otro. El buscador es la referencia de cómo debe quedar el paginador,
> no al revés: **que nadie «armonice» quitándole la región al buscador.**

### 8.4 Contraste — lo que hay que medir antes de dar por bueno el diseño

**No ejecutado en esta especificación.** Se declara como tal, igual que en la v1 y la v2:

- `.ds-tone--accent-soft` = `--amatista-700` (`oklch(42% 0.16 var(--hue))`) sobre `--amatista-50`
  (`oklch(97% 0.015 var(--hue))`), a `--text-xs` = **12 px** (`.ds-pill`, `primitives.css:1354`).
  12 px es **texto normal**, no grande: el umbral es **4,5:1**, no 3:1 (WCAG 2.2 §1.4.3). La
  combinación ya se usa en 5 sitios de la consola y **R10** dice que el color de texto se mide antes
  de entrar; **el número concreto no consta medido en ningún artefacto del repositorio.**
  **Acción:** convertir los dos OKLCH a sRGB y calcular el ratio con la fórmula de luminancia
  relativa (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) o con
  https://webaim.org/resources/contrastchecker/ **antes** de aprobar el diseño. Si no llega a 4,5:1,
  el remedio va **en el token o en la primitiva** —nunca en el `<style scoped>`— y lo ejecuta
  `front-parity`, porque `primitives.css` es gemelo TR-02.
- **El tono seleccionado del conmutador**, igualmente **sin medir**. Además, no puede distinguirse
  solo por color (§1.4.1): `aria-selected` da la semántica, y visualmente hace falta peso tipográfico
  o subrayado además del tono.
- El borde de la píldora del tenant (`1px solid var(--amatista-200)`) **no se replica**: si se
  replicara sería un elemento gráfico portador de información y entraría en **§1.4.11 No-text
  Contrast (3:1)**. Sin borde, la información la lleva el texto y §1.4.11 no aplica.

### 8.5 Dos defectos de `AppPagination` que estas pantallas heredan — **alcance: 24 pantallas**

Detectados en la v1, **siguen abiertos**. No se arreglan en esta feature y **no se bifurca la
primitiva**. Se proponen como issue en §10.3.

> **[grave]** El foco se pierde al llegar a la última (o primera) página — `VetSoftwareFront/src/components/ui/AppPagination.vue:47-65`
> **Criterio:** WCAG 2.2 §2.4.3 Orden del foco (A) · §3.2.2 Al recibir entradas (A).
> **Impacto:** quien pagina con teclado pulsa «Siguiente»; al alcanzar la última página el botón pasa
> a `:disabled`, deja de ser enfocable y **el foco cae al `<body>`**. El siguiente Tab reempieza por
> el principio del documento. Afecta a las **24 pantallas** que consumen `AppPagination`.
> **Arreglo:** cuando el botón recién pulsado quede deshabilitado, mover el foco al párrafo del rango
> (`.rango`, con `tabindex="-1"`).

> **[grave]** El cambio de página no se anuncia — `AppPagination.vue:45`
> **Criterio:** WCAG 2.2 §4.1.3 Mensajes de estado (AA).
> **Impacto:** «Mostrando 21–40 de 340» se actualiza en silencio. Un lector de pantalla no dice nada
> tras activar «Siguiente». El `role="status"` de `AppTable` solo dice «Cargando…» y por debajo de
> ~200 ms puede no emitirse. **`AppListSearch` resuelve este mismo criterio correctamente** (§8.3):
> la solución ya existe en la casa, solo hay que llevarla al paginador.
> **Arreglo:** `aria-live="polite"` en el `<p class="rango">`. Una línea, y cubre las 24 pantallas.

---

## 9. Design system: qué se reutiliza y qué hay que crear

### 9.1 Se reutiliza tal cual — **no se escribe una línea de CSS de color en las vistas**

**Componentes** (`VetSoftwareFront/src/components/`): `AppLayout`, `AppTable`, **`AppListSearch`**,
`AppPagination`, `AppEmptyState`, `AppModal`, `AppInput`, `AppTextarea`, `AppConfirmDialog` (vía
`useConfirmDialog`), `ToastStack` (vía `useToast`).

**Composables**: `useServerPaged`, **`useQuerySync`**, `useConfirmDialog`, `useToast`,
`useUnsavedChangesGuard`, `validators`, `format`.

**Primitivas de `primitives.css` (gemelo TR-02, solo lectura para esta especificación):**
`.ds-head`, `.ds-title`, `.ds-subtitle`, `.ds-stack--16/18`, `.ds-btn--primary/--ghost/--sm`,
`.ds-icon-btn` (+`--danger`), `.ds-actions`/`--start`, `.ds-table`, `.ds-table-scroll`,
`.ds-row-hover`, `.ds-text-strong`, `.ds-meta`, `.ds-col-actions`, `.ds-banner--info`/`--sm`,
`.ds-banner-icon`, `.ds-empty`, `.ds-sr-only`, `.ds-focus-ring`, `.ds-field`/`.ds-field-rest`,
`.ds-hover-accent`, `.ds-pill`, `.ds-tone--accent-soft`, y para el conmutador
`.ds-tone--accent-selected` / `.ds-tone--neutral-soft`.

**Recordatorio de la trampa de especificidad** (`AGENTS.md:103-122`): la regla base de un componente en
`scoped` pesa `(0,2,0)` con su `[data-v-…]` y **le gana** a la primitiva global, que pesa `(0,1,0)`.
Por eso la base local se queda **solo con geometría** y el color viaja en la clase de tono desde el
marcado, **incluido el estado por defecto**. **Cualquier `background` o `color` en el `<style scoped>`
de estas vistas es un bug**, y lo rechazan `vetsoftware/no-duplicate-primitive` (FE-08) y el trinquete
de `scripts/css-budget.mjs` (`maxStyleMinusScript: 0`, `maxDuplicateGroups: 0`, `maxSfcLines: 500`),
**cuyos números no se suben**.

### 9.2 Hay que crear — **la búsqueda no añade nada a esta lista**

| # | Qué | Dónde | Quién |
|---|---|---|---|
| 1 | **Dos iconos.** `ICONS` no tiene ninguno de medicamento: añadir `MEDICAMENT: Pill` y `GLOBE: Globe`, importando de `lucide-vue-next`. `ICONS.SEARCH` y `ICONS.CLOSE`, que usa el buscador, **ya existen**. | `VetSoftwareFront/src/constants/icons.ts` | `front-feature` |
| 2 | **Conmutador de estado accesible.** La consola **no tiene** primitiva de tabs/segmentado: sus cuatro pantallas con conmutador lo resuelven cada una a su manera (`BillingOperationsView`, `CommercialCatalogView`, `ConfiguratorView`, `SubscriptionRecordNav`). El tenant tiene `SegTabs`, pero **es de su repo y no es gemelo declarado**: copiarlo crearía un gemelo de facto no registrado, que es justo lo que TR-02 existe para evitar. Se crea `AppSegmentedTabs.vue` en `components/ui/`, con el patrón APG Tabs completo. | `VetSoftwareFront/src/components/ui/` | `front-feature`, con visto bueno de `front-parity` sobre el nombre |
| 3 | **Feature completa**: `api/` (los dos grupos de §3.2), `composables/`, `types/`, `views/` (tres) y `components/MedicamentForm.vue`. **Sin `stores/`**: ver §9.4. | `VetSoftwareFront/src/features/medicaments/` | `front-feature` |
| 4 | **Registro**: claves en `ROUTE_NAMES`, `router/routes/medicaments.routes.ts`, import en `router/index.ts`, una `NavLeaf` en `sidebar-nav.ts`. | §9.3 | `front-feature` |
| 5 | **Nada en `primitives.css` ni en `tokens.css`.** Si la medición de §8.4 obliga a corregir un tono, el cambio es de `front-parity` y en los **dos** repos. | — | `front-parity` |

**Qué cambia la búsqueda en el trabajo de design system: casi nada, y es una buena noticia.**

- **`AppListSearch` no se toca.** Tiene 30 consumidores y ya trae etiqueta, región viva persistente,
  rebote, Enter, Escape, botón de limpiar con nombre accesible y devolución de foco. Todo lo que §8.3
  pide **ya está**. No hace falta ni una prop nueva.
- **`AppSegmentedTabs.vue` gana una restricción de contrato**, que hay que escribir en su javadoc: el
  componente **expone el `id` de su `tabpanel`** para que la vista pueda dejar el buscador fuera y aun
  así cablear `aria-controls` correctamente. Es decir, el componente **no** envuelve todo lo que hay
  bajo la cabecera; envuelve solo el panel.
- **Sin contadores en los rótulos de las pestañas** (§5.2), lo que evita que `AppSegmentedTabs` tenga
  que aceptar un `badge` por opción — una prop que nace para esta pantalla y que aquí es
  explícitamente indeseable.

### 9.3 Registro exacto

```ts
// VetSoftwareFront/src/constants/routes.ts
MEDICAMENTS_LIST: 'medicaments-list',
MEDICAMENT_DETAIL: 'medicament-detail',
MEDICAMENTS_PLATFORM: 'medicaments-platform',
```

```ts
// VetSoftwareFront/src/router/routes/medicaments.routes.ts
export const medicamentsRoutes: RouteRecordRaw[] = [
  {
    path: '/catalogos-clinicos/medicamentos',
    name: ROUTE_NAMES.MEDICAMENTS_LIST,
    component: () => import('@/features/medicaments/views/MedicamentsListView.vue'),
  },
  {
    // ANTES que `/:id`: si no, «plataforma» casaría como id y el detalle
    // pediría `GET /admin/medicaments/plataforma`.
    path: '/catalogos-clinicos/medicamentos/plataforma',
    name: ROUTE_NAMES.MEDICAMENTS_PLATFORM,
    component: () => import('@/features/medicaments/views/MedicamentsPlatformView.vue'),
  },
  {
    path: '/catalogos-clinicos/medicamentos/:id',
    name: ROUTE_NAMES.MEDICAMENT_DETAIL,
    component: () => import('@/features/medicaments/views/MedicamentDetailView.vue'),
    props: true,
  },
]
```

```ts
// VetSoftwareFront/src/components/layout/sidebar-nav.ts
// Grupo «Configuración» › «Catálogos clínicos», ÚLTIMA entrada del subgrupo.
{
  name: ROUTE_NAMES.MEDICAMENTS_LIST,
  label: 'Medicamentos',
  path: '/catalogos-clinicos/medicamentos',
  icon: ICONS.MEDICAMENT,
},
```

**Por qué la última y no la primera.** Las seis entradas existentes son «Tipos de …» y forman una serie
homogénea. «Medicamentos» no es un tipo: es un vademécum. En medio rompe la lectura de la serie; al
final se lee como lo que es. **El orden del subgrupo no se toca por lo demás**: el orden de menú de
esta consola está sujeto por `VetSoftwareFront/tests/unit/sidebar-sin-cifras-inventadas.spec.ts` para
el grupo de suscripciones, y mover entradas sin motivo es cambiar la historia que el menú cuenta.

**Por qué la vista de plataforma NO va al menú.** Es una lente de consulta de un mismo concepto, no un
destino de trabajo. Dos entradas de sidebar para «medicamentos» obligan a elegir entre ellas **antes**
de saber en qué se diferencian. Es el criterio que `sidebar-nav.ts` ya aplica en §2.1 con
`/platform-billing-config`. Se llega por el enlace de §5.3, desde el contexto que la explica.

### 9.4 Composable — la desviación del patrón, y su porqué

`useMedicaments()` **no** usa `createCatalogStore`, y la feature **no tiene carpeta `stores/`**:

```ts
export function useMedicaments(termino: Ref<string>) {
  // El término va como `Ref` al composable, NO se llama a `goTo` a mano:
  // así `useServerPaged` aplica su rebote y su vuelta a la página 1 (§5.5.2).
  const activos = useServerPaged<MedicamentResponse>(
    (page, pageSize, q, signal) => medicamentsApi.listGlobal(page, pageSize, q, signal),
    { query: termino },
  )
  // «Pausados» NO está paginado y YA llega ordenado por nombre (§3.5):
  // ni se pagina ni se ordena en cliente. Su búsqueda también es servida.
  …
}
```

Motivo: `createCatalogStore` guarda **la colección entera** (`items: T[]`) y no tiene `page`, `total`
ni `pageCount`; `useServerPaged` sí, y además aborta la petición en vuelo y gestiona el rebote del
término. Es el camino que ya tomaron `useCompanies`, `useQuotes`, `useCommercialCatalog` y
`useBillingDocumentSequences` en esta consola: **el patrón para lo paginado ya existe, y es este.**

Los métodos de `api/` que sirven búsquedas llevan **`skipGlobalLoader: true`**, como
`companies.api.ts:53`: bloquear la pantalla con el velo global en cada tecla sería invasivo.

`create/update/remove/enable` viven en este mismo composable, avisan con `success` / `errorFrom` /
`warnFrom`, **relanzan** el error para que la vista decida si cierra el modal, y aplican la
invalidación cruzada de §5.10 **conservando el término vigente**.

**Nada de `ref()` de ámbito de módulo** para compartir estado entre las dos pestañas o las dos
pantallas: está prohibido en este proyecto. Si hiciera falta compartir, es Pinia.

---

## 10. Lo que queda fuera de esta especificación

### 10.1 Deltas de backend — **ninguno bloqueante**

La v2 dejaba uno abierto (la búsqueda). **Se cierra con esta versión**: el backend añade `q` a
`GET /admin/medicaments` y a `GET /medicaments`, y el `ORDER BY name` a
`GET /admin/medicaments/disabled`. Lo único pendiente es **confirmar el nombre del parámetro al
regenerar el contrato**; la especificación asume `q` con la evidencia de §3.3, y si cambiara, cambia
una línea de `medicaments.api.ts`.

**Fuera de alcance por decisión, no por falta:** `?scope=global|company` en `GET /medicaments`, que
permitiría a la vista de plataforma acotar a lo de los tenants. No se pide ahora porque la columna
«Ámbito» ya deja ver la distinción y añadir un segundo filtro sin necesidad demostrada es complicar
la pantalla de diagnóstico.

### 10.2 «Promover a global» — fuera de alcance, y no es trivial

Es la acción que el superusuario querrá en cuanto vea la vista de plataforma llena de duplicados. **No
se diseña aquí** porque no es un cambio de bandera: el dominio prohíbe `general && company != null`
(`Medicament.java:47-51`), así que promover significa **crear un global y retirar el propio de la
empresa**, lo cual cambia lo que una clínica ve al recetar y necesita una firma de auditoría que la
tabla `medicaments` no tiene (§6.5). Es una funcionalidad con diseño de dominio propio, no un botón.

### 10.3 Issue propuesto para `AppPagination`

**Título:** `AppPagination: el foco se pierde en el último clic y el cambio de página no se anuncia`
**Cuerpo:** los dos hallazgos de §8.5, con criterio WCAG, `fichero:línea` y el alcance de **24
pantallas**. La solución del segundo **ya existe en la casa**: es lo que `AppListSearch` hace con su
región viva persistente. Corrección de dos líneas en un solo componente. **No lo abre este
documento**: lo decide el humano.

---

## 11. Verificación — qué comprobar y con qué

**Lo que esta especificación NO ejecutó, declarado:** no se arrancó el servidor de desarrollo, ni
`npm run quality`, ni Stylelint, ni Playwright, ni `ds:audit`. **No se midió ningún contraste** —ni el
de la píldora «Global» ni el del tono seleccionado del conmutador—. No se ejecutaron los gates de
build del backend: la superficie `/admin/medicaments` se verificó **leyendo el árbol**, y el
parámetro `q` de medicamentos **aún no existe en el código**: la convención está verificada en otros
14 controladores (§3.3), no en este. Todo lo afirmado sale de leer código.

Al implementar, hay que comprobar:

| # | Qué | Cómo |
|---|---|---|
| 1 | Ratio de `.ds-tone--accent-soft` a 12 px ≥ **4,5:1**, y el del estado seleccionado del conmutador | §8.4. **Bloqueante** si falla; el remedio va en el token, no en la vista. |
| 2 | **La búsqueda viaja al servidor**: la petición lleva `q` y la vista **no** filtra el array | Test de composable con espía sobre el cliente HTTP. Es la salvaguarda de §5.5.1 contra un `filter()` bienintencionado. |
| 3 | **Buscar vuelve a la página 1** | Test: ir a la página 3, teclear, afirmar `page === 1`. Lo da `useServerPaged` **solo si** el término se pasa como `Ref`; el test protege de que alguien lo cablee a mano. |
| 4 | **Los cuatro estados vacíos** de §5.7, cada uno con su título y sus botones | Test de componente, uno por rama. El que más importa: la rama con término **no** ofrece «Nuevo medicamento». |
| 5 | **El término sobrevive al cambio de pestaña** y la nueva pestaña busca con él | Test de vista. Es la decisión de §5.5.3 y lo primero que se rompería en un refactor. |
| 6 | **Una sola región viva** al cambiar de pestaña (no dos anuncios) | `toMatchAriaSnapshot()` de Playwright (https://playwright.dev/docs/aria-snapshots). |
| 7 | El paginador **no** aparece con `error` ni con `loading`, y **no aparece en «Pausados»** | Test de componente. |
| 8 | El total del paginador coincide con `totalElements`, también con búsqueda activa | Test con 25 filas y un término que case con 3. |
| 9 | **Sincronía entre pestañas** (§5.10): crear un nombre que existe pausado deja «Pausados» sin esa fila | Test de composable. Es el defecto de estado obsoleto más probable de la pantalla. |
| 10 | El conmutador cumple el patrón APG Tabs (roles, `aria-selected`, flechas, un solo tab tabulable) y **el buscador queda fuera del `tabpanel`** | Mismo snapshot ARIA. |
| 11 | La píldora «Global» conserva su **texto**, no solo el icono | Mismo snapshot ARIA. |
| 12 | Cero violaciones de axe en las tres pantallas | `@axe-core/playwright`. **Hoy no existe ninguna dependencia de accesibilidad en el pipeline de ninguno de los dos fronts** — abierto en admin-web #44 / public-web #57. Esta feature no puede cerrarlo, pero es buen sitio para estrenarlo. |
| 13 | Los cuatro literales de error del formulario | Test unitario sobre `validators`, comparando cadena a cadena con §7.2. |

Comprobaciones de teclado, en este orden: Tab llega al conmutador; flechas cambian de pestaña; Tab
llega al buscador; se teclea y **el foco no se mueve** al actualizarse la tabla (§8.2 punto 10);
Escape limpia sin mover el foco; el botón ✕ devuelve el foco al campo; Tab entra en la tabla; Enter en
«Siguiente» pagina y **el foco no se pierde al llegar al final** (§8.5); al pausar, el foco vuelve al
conmutador (§8.2 punto 9); Escape cierra el modal sin perder lo escrito y el guard avisa al navegar
con el formulario sucio.

---

## Fuentes citadas

- WCAG 2.2 (Recommendation): https://www.w3.org/TR/WCAG22/ · §1.1.1, §1.3.1, §1.4.1, §1.4.3, §1.4.10,
  §1.4.11, §2.1.1, §2.4.3, §2.4.4, §2.4.6, §2.4.11, §2.5.8, §3.2.2, §3.3.1, §3.3.2, §3.3.4, §4.1.2,
  §4.1.3
- Understanding 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- Understanding 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- APG · patrón **Tabs**: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- WAI Tutorial · Forms: https://www.w3.org/WAI/tutorials/forms/
- GOV.UK Design System · Validation: https://design-system.service.gov.uk/patterns/validation/
- NN/g · Empty State Interface Design: https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g · Error Message Guidelines (formularios): https://www.nngroup.com/articles/errors-forms-design-guidelines/
- NN/g · Response Times: https://www.nngroup.com/articles/response-times-3-important-limits/
- NN/g · 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- Playwright · ARIA snapshots: https://playwright.dev/docs/aria-snapshots
- Del repositorio: `VetSoftwareFront/docs/ux/reglas-de-interfaz.md` (R03, R04, R05, R06, R08, R10,
  R12, R14, R15) · `VetSoftwareFront/docs/ux/patron-de-busqueda-en-listado.md` §3 y §5 ·
  `VetSoftwareFront/docs/ux/patron-de-mensajes.md` · `AGENTS.md` §especificidad y §FE-08
