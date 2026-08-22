# Patrón de búsqueda en listado

> **Estado:** especificación aprobada, sin implementar. Documento **gemelo byte a byte** en
> `VetSoftwareFront/docs/ux/` y `VetSoftwarePublicFront/docs/ux/`. `T` = app del tenant
> (`VetSoftwarePublicFront`) · `C` = consola de plataforma (`VetSoftwareFront`).

## 0 · El hueco, y una premisa que hay que corregir antes de nada

La consola de plataforma tiene **17 vistas de listado** (`ls
VetSoftwareFront/src/features/*/views/*ListView.vue | wc -l` → 17, no 15) y **ninguna tiene campo de
búsqueda**. Lo que sí tiene es peor que nada:

```html
<!-- VetSoftwareFront/src/components/layout/AppHeader.vue:21-24 -->
<div class="search">
  <component :is="ICONS.SEARCH" :size="14" class="search-icon" />
  <span class="search-placeholder ds-truncate">Buscar empresas, módulos, permisos…</span>
</div>
```

Eso es un `<span>` dentro de un `<div>` con aspecto de campo de texto. **No es un input, no recibe
foco, no se puede teclear y no existe para un lector de pantalla.** Está en la cabecera de las 17
pantallas.

### La premisa que hay que corregir

El encargo parte de que buscar en cliente «sobre una página ya truncada encuentra menos de lo que hay
y miente peor que no buscar». Eso es **cierto y grave**, pero **no aplica a 16 de los 17 listados de
la consola**, y verificarlo cambia por completo el dictamen. Los controladores devuelven el conjunto
**entero, sin paginar**:

```java
// VetSoftware/.../module/infrastructure/web/ModuleController.java:48-49
@GetMapping
public List<ModuleResponse> listAll() { … }
```

Comprobado igual en `AnimalColorController`, `BreedController`, `SpeciesController`,
`SubModuleController`, `MembershipController`, `ConsultationTypeController`, `SurgeryTypeController`,
`VaccinationTypeController`, `SpaTypeController`, `LaboratoryTestTypeController`,
`DiagnosticImagingTypeController`, `BasePermissionController`, `BaseRoleController` — y en el frente,
las 16 `*.api.ts` los tipan como `Response[]`
(`grep -rn "http.get<" VetSoftwareFront/src/features/*/api/*.ts`).

**Si el cliente ya tiene el conjunto completo en memoria, filtrar en cliente no oculta nada: el
resultado es exhaustivo por construcción.** Lo que miente no es el filtro de cliente, es el filtro de
cliente **sobre una página**. Son cosas distintas y el dictamen (§5) se apoya en eso.

La única excepción es justo la que ya está resuelta en el backend: **Empresas**. Y ahí hay una bomba
sin desactivar, ficha F1.

## 1 · Dónde va el campo, y qué es

**Ubicación:** primera fila del cuerpo de la vista, **encima de la tabla y dentro del mismo bloque**,
alineado a la izquierda, ancho máximo 360 px, con el resto de acciones de listado a su derecha. Es lo
que ya hace `VetSoftwarePublicFront/src/features/acciones/components/ListBody.vue:126-133` y no hay
motivo para inventar otra cosa. **No va en la cabecera de la aplicación**: una búsqueda global sin
endpoint global es la mentira de `AppHeader.vue`.

**Marcado obligatorio** — hoy `ListBody.vue:131` no cumple ninguno de estos tres puntos:

```html
<div class="search">
  <label for="q-empresas" class="ds-sr-only">Buscar empresas</label>
  <SearchIcon aria-hidden="true" />
  <input
    id="q-empresas"
    v-model="q"
    type="search"
    class="input"
    placeholder="Nombre o NIT…"
    autocomplete="off"
  />
</div>
```

1. **Etiqueta asociada siempre.** El `placeholder` **no es una etiqueta**: desaparece al escribir, y
   entonces el campo se queda sin nombre accesible. WCAG 2.2 §3.3.2 Labels or Instructions (A) y
   §4.1.2 Name, Role, Value (A). Si no cabe visualmente, `.ds-sr-only` — la primitiva existe.
2. **`type="search"`**, no `type="text"`: da el rol correcto y el botón nativo de limpiar.
3. **El icono es decorativo** → `aria-hidden="true"`. Hoy el `<Search>` de Lucide entra sin él.

**Objetivo táctil:** el campo y su botón de limpiar, mínimo **24×24 px CSS** (WCAG 2.2 §2.5.8 Target
Size (Minimum), AA). La app se usa con una mano y el animal en la otra; esto no es teórico.

## 2 · Cómo se comporta

**Al teclear, con retardo de 300 ms.** No al enviar. Motivo: en un catálogo el usuario **no sabe qué
hay**, y la lista que se estrecha mientras escribe es la que se lo enseña; obligarle a pulsar Enter
convierte cada tanteo en un viaje de ida y vuelta. Los 300 ms son el número que la casa ya usa en dos
sitios (`VetSoftwarePublicFront/src/composables/useServerPaged.ts:33` y
`useQuerySync.ts:9`) y está por debajo del umbral de 1 s de NN/g para «el flujo de pensamiento no se
interrumpe».

**Enter no rompe nada.** El campo va dentro de un `<form @submit.prevent>` o el `input` lleva
`@keydown.enter.prevent`: pulsar Enter dispara la búsqueda inmediata (cancelando el retardo) y
**nunca** recarga la página. Un usuario con prisa pulsa Enter por costumbre y no puede perder la
pantalla por ello.

**Escape limpia el término** y devuelve el listado completo, con el foco donde estaba. Es el
comportamiento nativo de `type="search"` en la mayoría de navegadores; se implementa explícito para
que no dependa del motor.

**Búsqueda servida: se aborta lo anterior.** Cada término nuevo aborta la petición en vuelo. Sin eso,
la respuesta de «mil» puede llegar después de la de «milo» y pisarla. `useServerPaged.ts:56-58` ya lo
hace con `AbortController`; **no se reimplementa**.

**Nunca se deshabilita el campo mientras carga.** Bloquear el input durante la petición hace perder
las teclas que el usuario ya está escribiendo. Se indica con `aria-busy` en la tabla, no quitándole el
teclado.

## 3 · Relación con la paginación

Tres reglas, y las tres tienen una víctima concreta si se incumplen:

1. **Buscar vuelve a la página 1.** Mantener la página 5 al cambiar el término deja al usuario
   mirando un hueco vacío de un resultado que sí tiene filas. Ya está resuelto en
   `useServerPaged.ts:110-117`; en modo cliente lo hace `usePaged.ts:6-11` al cambiar la longitud —
   **eso es un bug latente**: si el filtro devuelve el mismo número de elementos, la página no se
   reinicia. En el modo cliente hay que vigilar **el término**, no la longitud.
2. **El rango se refiere a lo filtrado, no al total.** «Mostrando 1–10 de 34» donde 34 es el número de
   coincidencias, no el del catálogo. Mezclarlos es la forma más rápida de que alguien crea que faltan
   registros. `AppPagination.vue:37-38` calcula sobre `totalElements`: se le pasa el filtrado.
3. **Paginar no borra la búsqueda, y volver atrás no la pierde.** Se deriva de §6.

## 4 · Vacío de búsqueda ≠ vacío de verdad

Éste es el defecto que hay que no repetir, y está **vivo hoy** en el tenant:

```html
<!-- VetSoftwarePublicFront/src/features/acciones/components/ListBody.vue:158 -->
<div v-else-if="total === 0" class="state empty">{{ emptyText }}</div>
```

`emptyText` vale por defecto `'No hay registros aún'`. Con un término escrito y cero coincidencias,
las siete pantallas clínicas que montan `ListBody` dicen **«No hay registros aún»**: al veterinario
que buscó «Milo» le están diciendo que el paciente no tiene vacunas, cuando lo cierto es que ninguna
vacuna coincide con «Milo». Es el mismo error de categoría que EST-01 arregló para el fallo de red, en
la rama de al lado.

**Son cuatro estados, no dos, y el orden de las ramas es normativo:**

| # | Condición | Qué se pinta |
| --- | --- | --- |
| 1 | `error` | banner de error con reintento y traza — **ya existe**, no se toca |
| 2 | `loading && sin filas` | esqueleto |
| 3 | `total === 0 && q !== ''` | **vacío de búsqueda** |
| 4 | `total === 0 && q === ''` | **vacío de verdad** |

**Rama 3 — vacío de búsqueda.** Título: «Sin resultados para “{q}”». Descripción: «Revisa la
escritura o prueba con menos palabras.» Acción: un botón **«Limpiar búsqueda»** que vacía el término.
No lleva el botón de crear: quien busca quiere encontrar, no dar de alta. **El término se cita
literalmente** para que el usuario vea qué buscó de verdad — es donde se descubren los espacios de más
y el pegado con salto de línea.

**Rama 4 — vacío de verdad.** Título: «Aún no hay {entidad}». Descripción: para qué sirve la entidad,
una línea. Acción: **el mismo botón de crear que vive en la cabecera de la vista** (NN/g, *Empty State
Interface Design*: el estado vacío es la mejor oportunidad de enseñar el producto).
`VetSoftwareFront/src/components/feedback/AppEmptyState.vue` ya está escrito para esto, con `title`,
`description` y un `slot` para la acción, y hoy lo consume **solo** `AppTable.vue:107` con un
`<AppEmptyState title="Sin resultados" />` pelado y sin salida.

**La rama 3 no puede pintar el botón de crear y la rama 4 no puede decir «Sin resultados».** Si una
implementación no distingue las dos, no está terminada.

**Anuncio del recuento (WCAG 2.2 §4.1.3, AA).** Quien no ve la tabla no sabe si la búsqueda encontró
algo. Región viva **polite** y persistente, junto al campo:

```html
<p class="ds-sr-only" role="status">{{ anuncioResultados }}</p>
```

donde `anuncioResultados` es `''` mientras carga, `'Sin resultados'` en la rama 3, y
`'{n} resultados'` cuando hay filas. **Se calcula con el mismo retardo que la búsqueda**, no en cada
tecla: si no, el lector recita un número por pulsación. Nunca `assertive` — ver
`patron-de-mensajes.md`, §4.2b.

## 5 · Dictamen sobre los listados sin endpoint de búsqueda

**Pregunta:** ¿esperan al backend o hay solución honesta ya?

**Dictamen: no hace falta backend para 16 de los 17. Se hacen ya, en cliente.**

El razonamiento entero está en §0: esos 16 endpoints devuelven `List<X>` sin paginar, así que el
navegador **ya tiene el conjunto completo** antes de que el usuario teclee. Filtrar sobre él es
exhaustivo. No hay nada que ocultar y por tanto no hay mentira. Además son **catálogos maestros de
plataforma** —especies, razas, módulos, permisos, tipos de consulta—: crecen por decisión humana, no
por uso, y su tamaño es del orden de decenas o pocos cientos de filas.

Ahora bien, la honestidad de esto depende de **una invariante que hoy nadie vigila**, y ése es el
verdadero encargo:

> **Regla de honestidad.** El modo de búsqueda lo decide **la forma de la respuesta**, no la
> comodidad del que implementa.
> - Respuesta `T[]` (conjunto completo) → **búsqueda en cliente**, permitida.
> - Respuesta `PageResponse<T>` (página) → **búsqueda servida obligatoria**. Filtrar en cliente una
>   página es un defecto, no una aproximación.
>
> Corolario para el backend: **el día que un endpoint de listado pase de `List<T>` a
> `PageResponse<T>`, tiene que llevar su `/search` en el mismo PR.** Paginar sin buscar convierte
> silenciosamente un filtro correcto en uno que miente, y el frente no se entera: ni el `tsc`, ni
> `api.contract.ts` —que compara *esquemas*, no envolturas (ver su cabecera, «Qué NO comprueba»)— lo
> detectan.

**Eso ya ha pasado. Es la ficha F1 y es un bloqueante activo.**

**Lo que sí hay que encargar al backend, y solo esto:** nada urgente para las 16 vistas. Si algún día
un catálogo crece (razas y colores son los candidatos), su paginación y su `/search` entran juntos.
El patrón ya está establecido en el propio backend, con **once** `@GetMapping("/search")` vivos
(`CompanyController`, `OwnerController`, `ProductController`, `ServiceController`,
`SupplierController`, `EmployeeController`, `LaboratoryTestController`, `OpenAccountController`,
`GoodsReceiptController`, `PurchaseOrderController`, `SupplierInvoiceController`), así que no hay
diseño nuevo que hacer: hay que copiarlo cuando toque.

**Salvaguarda visible mientras dure el modo cliente.** Para que la invariante no dependa de la
memoria de nadie, el pie del listado en modo cliente dice siempre **«Mostrando 1–10 de 34»** con el 34
como número real de elementos en memoria. El día que el backend trunque, ese número dejará de coincidir
con la realidad de forma **observable** en la propia pantalla y en el spec de `front-e2e-visual`, en
vez de degradar en silencio.

## 6 · El término vive en la URL

**No se duplica EST-07: se reutiliza.** Ya existe `VetSoftwarePublicFront/src/composables/useQuerySync.ts`,
104 líneas, con las tres decisiones que hacen falta ya tomadas y documentadas en su cabecera:
`router.replace` y no `push` (para que «atrás» siga sirviendo para volver a la pantalla anterior, no
para borrar una letra), omisión de los valores por defecto (URL corta) y conservación de las claves
ajenas (no borra `returnTo`). Tiene `debounceMs` y su propio comentario dice que para un buscador son
300 ms — el mismo número de §2.

**Contrato de la URL, idéntico en los dos fronts:**

| Clave | Valor | Por defecto (se omite de la URL) |
| --- | --- | --- |
| `q` | término tal cual lo escribió el usuario | `''` |
| `page` | página **1-based**, la que ve el usuario | `1` |

`?q=milo&page=2`. La conversión a la base 0 del backend vive **en un solo sitio**
(`useServerPaged.ts:64`) y no se replica en la URL: al usuario no se le enseña un índice de programador.

**En `C` el composable no existe.** Portarlo crea un gemelo de facto, y los gemelos son de
`front-parity` (regla de frontera, y precedente exacto: `ModalShell.vue`, gemelo byte a byte no
declarado). Por tanto:

- **`front-parity`** copia `useQuerySync.ts` a `VetSoftwareFront/src/composables/` **byte a byte** y
  lo **da de alta en el manifiesto de gemelos TR-02**, junto con `ModalShell.vue`, que sigue sin estar.
  Sin ese alta, las dos copias divergirán como ya divergieron los catálogos de primitivas
  (`App*` frente a `Base*`).
- **`front-feature`** solo lo consume. Si necesita cambiarlo, lo pide; no lo edita en un solo lado.

## 7 · Fichas de trabajo

### F1 · **[Bloqueante]** El listado de Empresas está roto contra el backend desplegado — `VetSoftwareFront/src/features/companies/api/companies.api.ts:9-12`

```ts
async listAll(): Promise<CompanyResponse[]> {
  const { data } = await http.get<CompanyResponse[]>('/companies')
  return data
}
```

frente a

```java
// VetSoftware/.../company/infrastructure/web/CompanyController.java:67-73  (VUE-06)
@GetMapping
public PageResponse<CompanyResponse> listAll(@RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int pageSize) { … }
```

**Criterio:** NN/g H1 · WCAG 2.2 §1.3.1 (A), la tabla deja de ser una tabla de datos.
**Impacto:** el backend ya devuelve un objeto `{content, page, totalElements, …}` y el frente lo
guarda tal cual con `store.setItems(data)` (`useCompanies.ts:16`). Entonces:
`companies.length` es `undefined`, así que `:empty="companies.length === 0"`
(`CompaniesListView.vue:51`) evalúa a **falso** y **el estado vacío nunca se pinta**; y
`v-for="company in companies"` itera las **propiedades del sobre de paginación**, pintando filas
basura. La consola de plataforma no lista empresas. **Nada lo detecta:**
`VetSoftwareFront/src/types/api.generated.d.ts` no contiene `/companies/search` (está desactualizado)
y `api.contract.ts` compara esquemas de campo, no envolturas de respuesta. Este defecto es la prueba
empírica de la regla de honestidad de §5.
**Arreglo:** ver F2 — se arregla adoptando la paginación servida, no parcheando el tipo.
**Ejecuta:** `front-feature` (`C`), **antes que cualquier otra ficha de este documento**.

### F2 · **[Grave]** Empresas: búsqueda servida, paginación y estados — `VetSoftwareFront/src/features/companies/`

**Alcance:** `companies.api.ts`, `companies.types.ts`, `useCompanies.ts`, `CompaniesListView.vue`.
**Arreglo:**
1. `companies.api.ts`: `listAll(page, pageSize)` y `search(q, page, pageSize)` devolviendo
   `PageResponse<CompanyResponse>`. El tipo `PageResponse<T>` **no existe en `C`**
   (`ls VetSoftwareFront/src/types/` no tiene `pagination.ts`); `T` sí lo tiene en
   `VetSoftwarePublicFront/src/types/pagination.ts`. Es otro gemelo → **`front-parity`** lo porta y lo
   declara, igual que `useQuerySync`.
2. `useCompanies.ts`: sustituir `fetchAll` por el consumo de un `useServerPaged` — **también gemelo,
   también de `front-parity`**. Un `q` no vacío llama a `/companies/search`; vacío, a `/companies`.
   La decisión vive en el loader, en una línea, y no se filtra a la vista.
3. `CompaniesListView.vue`: campo de búsqueda de §1, `AppPagination` (que hoy tiene **cero
   consumidores** pese a estar reescrito para esto, ver su cabecera DS-03b/VUE-06), las cuatro ramas
   de estado de §4 vía las props que `AppTable` ya acepta (`error`, `traceId`, `loading`, `empty`,
   `@retry`), y el `<slot name="empty">` con el `AppEmptyState` correcto en cada rama.
4. `useQuerySync({ q: '', page: '1' }, { debounceMs: 300 })` para la URL.
5. Placeholder: `Nombre o NIT…` — el backend busca *«por nombre o identificador fiscal»*
   (`CompanyController.java:75-78`), y el placeholder tiene que decir la verdad sobre qué campos mira.
6. Entra en el **mismo PR** que H6 de `patron-de-mensajes.md` (la columna «Estado»), porque tocan la
   misma tabla.

**Ejecuta:** `front-feature` (`C`), con `front-parity` por delante para los tres gemelos.
**Verifica:** `front-e2e-visual` — un spec que afirme (a) el nombre accesible del campo, (b) que el
vacío de búsqueda y el vacío real dan **textos distintos**, (c) que `?q=` sobrevive a recargar y a
«atrás».

### F3 · **[Grave]** Las 16 vistas restantes: búsqueda en cliente sobre el conjunto completo

**Arreglo:** un componente `AppListSearch.vue` en `VetSoftwareFront/src/components/ui/` que encapsule
el marcado de §1, el retardo, Escape, el anuncio de recuento de §4 y la sincronía con `?q=`. Las 16
vistas lo montan y filtran con un predicado propio de tres o cuatro campos. **No se copia el marcado
16 veces**: eso es exactamente lo que `stylelint-plugins/no-duplicate-primitive.mjs` (FE-08) y
`scripts/css-budget.mjs` con `maxDuplicateGroups: 0` existen para impedir.

**`AppListSearch.vue` es de `C` y no es gemelo:** `T` ya resuelve esto dentro de `ListBody.vue`, que
tiene otra forma. **No lo suban a `primitives.css`** — su geometría es la de `.search` de `ListBody`,
pero unificarlas es una decisión de paridad aparte, no un efecto colateral de esta ficha.

**Corrección del `empty` de cada vista:** hoy las 17 caen en el `AppEmptyState title="Sin resultados"`
por defecto de `AppTable.vue:107`, que es **el texto de la rama 3 usado en la rama 4**. Cada vista
declara su `<slot name="empty">` con su texto de §4.

**Ejecuta:** `front-feature` (`C`). Se puede partir por lotes de vistas; el componente va en el primer
lote.

### F4 · **[Grave]** Retirar el falso buscador de la cabecera — `VetSoftwareFront/src/components/layout/AppHeader.vue:21-24`

**Criterio:** NN/g H2 (correspondencia con el mundo real) y H4 (consistencia y estándares) · WCAG 2.2
§3.2.4 Consistent Identification (AA), en cuanto a que un mismo aspecto debe significar lo mismo en
todo el sitio.
**Impacto:** un elemento con aspecto de campo de búsqueda que no se puede enfocar ni teclear, presente
en las 17 pantallas. El usuario que hace clic y no puede escribir concluye que la aplicación está
rota; el que usa teclado tabula por encima sin encontrarlo. Y una vez que exista la búsqueda **por
listado** (F2, F3), la caja de la cabecera además **competirá** con ella y hará dudar de cuál manda.
**Arreglo:** **retirarlo.** No convertirlo en un input: no existe endpoint de búsqueda global y un
buscador global que solo mira una entidad es otra mentira. Cuando haya `GET /search` transversal, se
vuelve a poner con el patrón de §1.
**Ejecuta:** `front-feature` (`C`).

### F5 · **[Grave]** `ListBody` confunde «sin resultados» con «no hay registros» — `VetSoftwarePublicFront/src/features/acciones/components/ListBody.vue:158`

**Criterio:** NN/g H1 y H9 · §4 de este documento.
**Impacto:** siete pantallas clínicas (`LabListView`, `ImagingListView`, `VaccineListView`,
`HospListView`, `DewormListView`, `SurgeryListView`, `SpaListView`) le dicen al veterinario que el
paciente no tiene registros cuando lo único cierto es que su término no casó. Es el hermano del bug
que EST-01 ya arregló dos ramas más arriba, en el mismo `v-if`.
**Arreglo:** partir la rama en las dos de §4, según `query.trim() !== ''`. Añadir la etiqueta asociada
y `type="search"` al input de `:131` (hoy es `type="text"` con solo `placeholder`), el
`aria-hidden="true"` al icono de `:129`, y el anuncio de recuento. **La rama de error de `:140-158`
no se toca.**
**Además, un bug latente:** `usePaged.ts:6-11` reinicia la página vigilando `items.value.length`; si
el filtro devuelve el mismo número de elementos, la página **no** se reinicia. Vigilar el término.
**Ejecuta:** `front-feature` (`T`). **Verifica:** `front-e2e-visual`.

## 8 · Reparto de trabajo

| Ficha | Agente | Repo | Depende de |
| --- | --- | --- | --- |
| Portar `pagination.ts`, `useServerPaged.ts` y `useQuerySync.ts`, y dar de alta los tres —más `ModalShell.vue`— en el manifiesto TR-02 | **`front-parity`** | `C` | — |
| F1 + F2 · Empresas | `front-feature` | `C` | `front-parity` |
| F3 · `AppListSearch` + 16 vistas | `front-feature` | `C` | F2 (fija el patrón) |
| F4 · retirar el falso buscador | `front-feature` | `C` | — |
| F5 · `ListBody` | `front-feature` | `T` | — |
| Cobertura de F2, F3 y F5 | `front-e2e-visual` | ambos | las fichas |
| Nada por ahora | `backend-feature` | — | ver §5 |

**Encargo condicional a `backend-feature`, para cuando toque:** ningún endpoint de listado puede pasar
de `List<T>` a `PageResponse<T>` sin llevar su `@GetMapping("/search")` en el mismo PR. Vale la pena
convertirlo en regla de ArchUnit, al estilo de la de BE-29 para los listados sin `scope` de empresa:
sería la única forma de que la invariante de §5 no dependa de que alguien se acuerde.

## 9 · Comprobaciones — qué se midió y qué no

**Ejecutado (lectura):** el censo de las 17 vistas, la forma de respuesta de los 14 controladores de
catálogo y de `CompanyController`, los tipos de las 16 `*.api.ts`, el marcado de `ListBody.vue`,
`AppTable.vue`, `AppPagination.vue`, `AppEmptyState.vue` y `AppHeader.vue`, y el código de
`useQuerySync`, `useServerPaged` y `usePaged`.

**No ejecutado, y declarado como tal:** no se levantó el servidor de desarrollo, no se corrió el
build, ni los tests, ni el lint, ni Playwright, ni `ds:audit`. **F1 se dictamina leyendo el contrato
de las dos partes, no observando la pantalla**: la ruptura es de tipos y de forma de respuesta, y es
concluyente sobre el código, pero **nadie ha visto el listado roto en un navegador**. Confirmarlo es
el primer paso de `front-feature`. Tampoco se ha medido el número real de filas de ningún catálogo:
la afirmación de §5 sobre su tamaño se apoya en su naturaleza (catálogos maestros de plataforma), no
en un `count(*)`.

## Fuentes

- WCAG 2.2 §3.3.2 Labels or Instructions (A) · §4.1.2 Name, Role, Value (A) · §4.1.3 Status Messages
  (AA) · §2.5.8 Target Size (AA) — https://www.w3.org/TR/WCAG22/
- APG, prácticas transversales (nombres accesibles, regiones vivas) —
  https://www.w3.org/WAI/ARIA/apg/practices/
- NN/g, *10 Usability Heuristics* — https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, *Empty State Interface Design* — https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g, *Response Times: The 3 Important Limits* —
  https://www.nngroup.com/articles/response-times-3-important-limits/
- Playwright, ARIA snapshots — https://playwright.dev/docs/aria-snapshots
- Testing Library, jerarquía de queries (`getByRole` primero) —
  https://testing-library.com/docs/queries/about/
