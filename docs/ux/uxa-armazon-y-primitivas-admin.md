# Armazón y catálogo `App*` de la consola — auditoría de la capa que repite

**Ámbito:** `VetSoftwareFront` (consola de plataforma). Solo lo que **heredan todas las pantallas**:
`App.vue`, `src/components/layout/**`, `src/components/feedback/**`, `src/components/ui/App*` y
`ModalShell`. No se audita ninguna pantalla concreta: eso lo cubren otras instancias.

**Árbol auditado:** worktree `MainVetSoftware-uxaudit/admin-web`, rama `audit/ux-screens-admin`,
HEAD `f9ec359` (merge del rebranding a Lumbre, admin#234), árbol limpio.

**Autoridad, por orden:** `docs/ux/reglas-de-interfaz.md` (R01–R15, gemelo TR-02) →
`docs/ux/armazon-tablet-especificacion.md` §8 → WCAG 2.2 y APG del W3C → literatura de usabilidad.
Donde una regla propia ya decidió, se cita la regla y no la fuente externa.

**Nada se ejecutó.** No se levantó el servidor de desarrollo, no se corrió Playwright, ni
`npm run quality`, ni `css:budget`, ni `ds:audit`: había dos tandas de Playwright en curso en estos
worktrees. Todos los ratios y geometrías que se citan vienen de comentarios ya verificados del
propio árbol, no de una medición de este turno. Lo que sí se hizo es lectura del código y censos con
`grep`, reproducibles y anotados en cada ficha.

---

## 0. Lo que ya está cerrado, y por qué importa decirlo

El encargo llegaba con siete huecos «verificados». **Cinco están cerrados en este árbol** y abrirlos
otra vez habría sido trabajo destructivo. Se dejan escritos para que nadie los vuelva a levantar:

| Hueco del encargo | Estado real | Evidencia |
|---|---|---|
| Sin skip link (§2.4.1) | **Cerrado** | `src/components/layout/AppLayout.vue:14`, con `:focus-visible` en :88 y prueba §8.19 en `e2e/tablet/armazon-tablet.spec.ts:463` |
| Sin `aria-current` (§4.1.2) | **Cerrado** | `AppSidebar.vue:147` y `:183`, vía `RouterLink custom`; prueba en `tests/unit/sidebar-nav-a11y.spec.ts:147` |
| Sin focus trap en diálogos (§2.4.3) | **Cerrado** | `src/composables/useModalFocus.ts:47-64`, consumido por `ModalShell.vue:188` y por el cajón en `useNavDrawer.ts:40-45`; pruebas §8.14–8.16 |
| `<html lang="en">` (§3.1.1) | **Cerrado** | `index.html:2` dice `es`; sujeto por `tests/unit/security-headers.spec.ts` (R08) |
| Sin `aria-describedby` (§3.3.1) | **Cerrado en la capa de campo** | `AppInput.vue:84-89,128`, `AppTextarea.vue:58-63,99`, `AppSelect.vue:43-48,253`; y hay resumen de errores propio, `components/feedback/ErrorSummary.vue`, con **33 consumidores** |
| Sin `aria-current` (§4.1.2) | **Cerrado, y además es el patrón de la casa** | 7 atributos reales en 6 ficheros (`grep -rn "aria-current" src --include=*.vue` → 15 líneas, 8 de ellas comentarios que citan el patrón). Nació en `AppSidebar.vue:147,183` y se copió a las cinco barras de pestañas de feature: `BillingOperationsView.vue:77`, `CompanyRecordNav.vue:46`, `LimitsView.vue:61`, `SubscriptionRecordNav.vue:51`, `TrialsView.vue:84` |
| `prefers-reduced-motion` solo parcial | **Cerrado** | `src/assets/styles/base.css:108-119` es la guarda global `*, *::before, *::after` con `!important` y su `stylelint-disable` justificado. Eso es exactamente lo que pedía **admin-web #74** (ver H12) |
| Vuetify pintando pantallas | **Falso** | Un solo componente en todo `src/`: el contenedor `<v-app>` de `App.vue:9`. Cero `v-btn`/`v-card`/`v-text-field`/`v-select`/`v-dialog` (`grep -rn "<v-[a-z]" src --include=*.vue`) |
| Sin puerta de accesibilidad en CI | **Sigue abierto** | `package.json` no declara `axe-core`, `@axe-core/playwright`, `eslint-plugin-vuejs-accessibility` ni Lighthouse; `quality` encadena `tr02:parity → lint → stylelint → css:budget → email:palette → format → api:check → typecheck`. Es **admin-web #44** |

### 0.1 Cuatro fichas de `reglas-de-interfaz.md` ya no describen el árbol

El documento es **gemelo byte a byte por decisión escrita en su propia cabecera**, así que estas
fichas están caducadas **en los dos repos a la vez** y su arreglo es de `front-parity`, no de esta
auditoría ni de `front-feature`. Se citan con línea para que no haya que buscarlas. (La cuarta, la
del manifiesto, va en §2.3 porque su arreglo es el mismo trabajo.)

| Línea | Lo que afirma | Lo que dice el árbol |
|---|---|---|
| `docs/ux/reglas-de-interfaz.md:172-173` (R02, «Sin verificar») | «`ModalShell` … **sigue sin retener el foco** mientras está abierto (**no hay focus trap en ninguno de los dos repos**): Tab desde el último control del diálogo sale a la página de detrás» | **Falso.** `src/composables/useModalFocus.ts:47-64` implementa `onTrapTab` con ciclo en los dos extremos, y `ModalShell.vue:188` lo monta con `@keydown.capture`. Los dos ficheros son gemelos TR-02, así que el trap existe en los dos repos |
| `reglas-de-interfaz.md:517` y `:525-528` (R06) | «`VetSoftwareFront/src/assets/styles/main.css:222-234` **no es global**» y «**La consola sigue sin guarda global** … es copiar `main.css:80-91` del tenant» | **Falso, y la ruta ni existe.** `src/assets/styles/` de la consola contiene `tokens.css`, `base.css`, `primitives.css` y `app.css` — **no hay `main.css`** (el split DS-06 lo disolvió; `src/main.ts:8-11` importa los cuatro). La guarda global vive hoy en `base.css:108-119` |
| `reglas-de-interfaz.md:1411` («Puertas que faltan», punto 2) | «Copiar `main.css:80-91` del tenant a la consola (R06, **cierra admin-web #74**)» | Manda a copiar un bloque a un fichero que no existe, para arreglar algo ya arreglado. La puerta que sí falta es la **otra** mitad que el propio punto 8 enuncia: que ese bloque **no se pueda borrar** con el CI en verde |

Esto no es una errata cosmética: la puerta 2 está listada como «lo más barato que falta» y enviaría
a quien la tome a un fichero inexistente. Y R02, tal y como está escrita, invita a **implementar un
segundo focus trap** al lado del que ya funciona — que es exactamente lo que
`armazon-tablet-especificacion.md` §6.2 tuvo que salir a prohibir por escrito («la trampa de foco
**ya existe** — no escribas otra»).

La conclusión operativa es la misma que la de `reglas-de-interfaz.md`: el armazón de esta consola
está **por encima de la media del sector** en teclado y semántica, y lo que queda no son huecos
nuevos, son **medias reglas propias que nunca se aplicaron al lado de la consola**. Eso es más
grave que un hueco inédito, no menos: la regla está escrita, el arreglo está escrito en el repo
gemelo, y aquí no llegó.

---

## 1. Hallazgos

Doce, ordenados por severidad. El alcance es un conteo real sobre `src/`, con el `grep` que lo
reproduce.

---

### H01 · [grave] El pie del sidebar muestra una identidad inventada en las 86 pantallas

`src/components/layout/SidebarUserCard.vue:24,26,27`

```vue
<div class="avatar">AD</div>
<div class="user-name">Admin</div>
<div class="user-role">Super administrador</div>
```

**Criterio.** R14 · «Un hueco honesto antes que un dato inventado»
(`docs/ux/reglas-de-interfaz.md`, R14). Nielsen, heurísticas 1 y 9. WCAG 2.2 §4.1.2 (A) en el caso
del control de cuenta, tal y como la propia R14 lo enuncia.

**Impacto y alcance.** Es **el mismo defecto que EST-12 arregló en el tenant**, con las mismas tres
palabras, sobre el mismo componente y encima del mismo botón de cerrar sesión — y aquí sigue
intacto. Lo hereda **toda pantalla autenticada**: 53 SFC renderizan `<AppLayout>` directamente
(`grep -rl "<AppLayout" src --include=*.vue`) y las 33 restantes de las 86 vistas de
`src/features/**/views/` cuelgan de ellos como rutas hijas.

**Por qué el gate no lo vio, y esto es la mitad interesante.** R14 sí tiene guarda en la consola
—`tests/unit/sidebar-sin-cifras-inventadas.spec.ts`— pero recorre el DOM **dentro del `<nav>`**, y
esta tarjeta es hermana del `<nav>`, no descendiente (`AppSidebar.vue:128` abre el `<nav>`, `:197`
lo cierra, `:199` monta `<SidebarUserCard />`). La propia ficha R14 lo dejó anotado en «Sin
verificar»: *«Que la consola no vuelva a inventar fuera del `<nav>`»*. Esto es ese caso, ya
materializado.

**Arreglo.** El camino 3 de R14, el mismo que eligió el tenant: **quitar la línea**, no ir a
buscarla. `useAuth()` de la consola expone `{ login, logout, isAuthenticated }`
(`src/features/auth/composables/useAuth.ts:56`) y **no** expone `me`, así que no hay dato de sesión
del que tirar sin añadir una petición al arranque de cada navegación.

1. `SidebarUserCard.vue`: props opcionales `firstName?`, `lastName?`, `role?`. Sin ellas:
   - el avatar no se pinta (`v-if="iniciales"`),
   - el nombre cae al rótulo genérico del control, **`Mi cuenta`** — literal exacto tomado de
     `VetSoftwarePublicFront/src/components/ui/SidebarUserCard.vue:21-27`, para no inventar un
     tercer texto,
   - la línea del rol **no se pinta** (`v-if="role"`).
2. Comentario en el marcado con el porqué, con la forma del gemelo
   (`VetSoftwarePublicFront/src/components/layout/AppSidebar.vue:124-128`): que el siguiente que
   pase sepa que es decisión y no olvido.
3. **No** llamar a `GET /companies/{id}` ni añadir `me` al arranque solo para esto: R14 lo descarta
   por escrito.

**Verificación.** Extender `tests/unit/sidebar-sin-cifras-inventadas.spec.ts` con un segundo
`describe` que monte `AppSidebar` **entero** y recorra el `<aside>`, no el `<nav>`: ningún nodo de
texto fuera del `<nav>` puede coincidir con `/^(Admin|Super administrador|AD)$/`. Es la misma forma
de guarda —negativa y de rejilla dentro del componente— que ya tiene el fichero.

**Dependencia externa.** El dato real solo llega si `/auth/me` entrega rol y empresa. Ya está
redactado como **issue 1 de «Issues por abrir»** de `reglas-de-interfaz.md` (backend). No hay que
volver a redactarlo; sí hay que abrirlo.

---

### H02 · [grave] R04 nunca se censó en la consola: 30 botones idénticos «Editar»/«Eliminar» en 15 listados

15 ficheros, dos botones cada uno, los 15 dentro de un `v-for`. Reproducible:

```
grep -rln 'aria-label="\(Editar\|Eliminar\)"' src --include=*.vue          # 15
grep -rl  'aria-label="\(Editar\|Eliminar\)"' src --include=*.vue | xargs grep -l "v-for"   # 15
```

Muestra con línea: `src/features/companies/views/CompaniesListView.vue:236,242`;
`src/features/species/views/SpeciesListView.vue:139,145`;
`src/features/base-roles/views/BaseRolesListView.vue:151,157`;
`src/features/modules/views/ModulesListView.vue:143,149`;
`src/features/breeds/views/BreedsListView.vue:137,143`;
`src/features/animal-colors/views/AnimalColorsListView.vue:223,229`;
`src/features/base-permissions/views/BasePermissionsListView.vue:149,155`;
`src/features/base-role-permissions/views/BaseRolePermissionsListView.vue:173,180`;
`src/features/consultation-types/…:141,148`; `src/features/spa-types/…:141,148`;
`src/features/surgery-types/…:151,158`; `src/features/vaccination-types/…:152,159`;
`src/features/laboratory-test-types/…:152,159`;
`src/features/diagnostic-imaging-types/…:152,159`;
`src/features/submodules/views/SubmodulesListView.vue:147,153`.

**Criterio.** R04 · «El nombre accesible lleva el sujeto de la fila». Su ficha lo cierra sin
ambigüedad: *«**La consola entera.** Ninguna de las tres guardas existe en `VetSoftwareFront/tests/`»*
— y su censo de la mitad abierta se hizo **solo sobre `VetSoftwarePublicFront/src`**. Este es el
censo que faltaba. Norma: WCAG 2.2 §2.4.6 (AA) y §4.1.2 (A); regla de axe-core `aria-command-name`
(*serious*, mapea a 4.1.2).

**Impacto y alcance.** Una lista de 20 empresas presenta **20 botones llamados «Editar» y 20
llamados «Eliminar»**. Navegando por lista de botones —que es como se recorre una tabla con lector
de pantalla— la única forma de saber a cuál pertenece cada uno es contar. En
`CompaniesListView.vue:242` lo que se borra es una empresa entera. Alcance: 15 vistas de listado ×
N filas.

**Arreglo.** Verbo + objeto + sujeto, con la redacción literal que fija R04, y **sin** la palabra
«botón»:

```vue
<!-- así no -->
<RouterLink :to="`/empresas/${company.id}`" class="ds-icon-btn" aria-label="Editar">
<!-- así sí -->
<RouterLink :to="`/empresas/${company.id}`" class="ds-icon-btn"
            :aria-label="`Editar la empresa ${company.name}`">
<button class="ds-icon-btn ds-icon-btn--danger"
        :aria-label="`Eliminar la empresa ${company.name}`">
```

Sujeto = el campo que identifica la fila para el usuario, no el `id`. Para los catálogos clínicos y
de dominio (especies, razas, colores, tipos), el sujeto es el `name`/`description` que ya pinta la
primera celda. `title` **no** cuenta: R04 lo dice y lo argumenta.

**Verificación.** Copiar la forma —no el contenido— de
`VetSoftwarePublicFront/tests/unit/lab-results-adjuntos.spec.ts`: localizar el botón **por su
etiqueta completa** («Eliminar la empresa Veterinaria Norte») y comprobar que la acción cae sobre
**esa** fila. Una prueba escrita así no puede pasar con una etiqueta estática. Con dos listados
—uno de empresas, uno de catálogo— se sujeta el patrón; el barrido de rejilla es la puerta 7 de
«Puertas que faltan».

---

### H03 · [grave] Las tablas se desplazan pero no se pueden desplazar con teclado, y ninguna tiene nombre

`src/components/ui/AppTable.vue:130-131`

```vue
<div class="ds-table-scroll tabla-scroll">
  <table class="ds-table" :aria-busy="loading || undefined">
```

`.ds-table-scroll` es `overflow-x: auto` a secas (`src/assets/styles/primitives.css:753-756`), sin
`tabindex="0"`, sin `role="region"` y sin nombre accesible.

**Criterio.** R15 · «Una tabla ancha se desplaza, no se recorta» — cumplido en su primera mitad
(§1.4.10 Reflow) e incumplido en la segunda. Regla `scrollable-region-focusable` de axe-core
(*serious*, WCAG 2.1.1 y 2.1.3, nivel A): *«Ensure elements that have scrollable content are
accessible by keyboard»*. Y para el nombre, el tutorial de tablas del W3C y §1.3.1.

**Impacto y alcance.** Sin ratón —teclado, o tablet con teclado— las últimas columnas de una tabla
más ancha que su caja son **inalcanzables**: no hay nada que enfocar dentro del contenedor que se
desplaza. Alcance: **58 consumidores de `AppTable`** (`grep -rl "<AppTable" src --include=*.vue`)
más **7 usos directos** de la clase (`DocumentTaxBreakdown.vue:91`, `QuoteLinesTable.vue:48`,
`ExternalAmountsGrid.vue:56`, `SettlementAmounts.vue:71`, `SubscriptionItemsTable.vue:155` y las dos
barras de pestañas, que no cuentan porque contienen enlaces enfocables).
Segundo defecto acumulado: **ninguna de las 58 tablas tiene nombre accesible** salvo las que pasan
`money`, que reciben el `<caption>` de divisa (`AppTable.vue:134`). En las vistas de expediente hay
varias tablas por pantalla y la lista de tablas del lector las anuncia todas igual.

**Ya está redactado y sin abrir.** Es el punto (b) del **issue 4 de «Issues por abrir»** de
`reglas-de-interfaz.md`, que cifraba «los 11 usos del tenant … y todas las tablas de la consola vía
`AppTable`». Aquí queda la cifra de la consola: **58 + 7**. No se vuelve a redactar; se abre.

**Por qué el gate de R15 está verde con el defecto puesto.**
`tests/unit/app-table-scroll.spec.ts` tiene cuatro casos —envuelve, está entre la caja y la tabla,
`.tabla-caja` sin `overflow:hidden`, `.ds-table-scroll` aporta `overflow-x`— y **ninguno mira la
focalizabilidad**. La guarda comprueba la mitad que se arregló.

**Arreglo, y dónde va cada mitad.** La primitiva es TR-02 y **no se toca desde aquí**: lo que cambia
es el marcado de `AppTable.vue`, que es propio de la consola.

1. Nueva prop `caption: string` en `AppTable` (**obligatoria**, no opcional: una tabla sin nombre es
   el defecto que se está cerrando).
2. En el template:

```vue
<div
  class="ds-table-scroll tabla-scroll"
  role="region"
  tabindex="0"
  :aria-label="caption"
>
```

   `role="region"` **exige** nombre — sin él se añade un landmark anónimo y se empeora el árbol; por
   eso la prop es obligatoria y por eso el mismo texto sirve para las dos cosas.
3. `<caption class="ds-sr-only">{{ caption }}</caption>` cuando no hay `money`; con `money`, el
   `MoneyCaption` existente absorbe el texto. El `<caption>` va como primer hijo de `<table>`, que
   es lo único que admite el HTML y lo que ya respeta `AppTable.vue:132-134`.
4. Los 58 consumidores pasan un texto descriptivo: «Empresas», «Intentos de cobro de la suscripción
   #123». **No** «Tabla de…»: el rol ya lo anuncia.
5. Anillo de foco: `.ds-table-scroll` recibe el anillo por `.ds-focus-ring` desde el marcado, no por
   una regla nueva en el `scoped` — el color en `scoped` pesa (0,2,0) y es la trampa de AGENTS.md.

**Verificación.** Añadir a `tests/unit/app-table-scroll.spec.ts` un quinto caso: el contenedor
declara `tabindex="0"`, `role="region"` y un `aria-label` no vacío. Y un `toMatchAriaSnapshot` de
Playwright sobre una tabla de la galería `visual/`, que es la puerta 9 de «Puertas que faltan».

---

### H04 · [grave] `AppSelect` es un combobox sin `aria-controls`, y su listbox no tiene `id`

`src/components/ui/AppSelect.vue:243-256` (el disparador) y `:268` (el panel).

```vue
<button :id="controlId" role="combobox" aria-haspopup="listbox" :aria-expanded="open"
        :aria-activedescendant="open && highlighted >= 0 ? `${controlId}-opt-${highlighted}` : undefined">
…
<Teleport to="body">
  <ul v-if="open" ref="panel" class="app-select-panel" role="listbox" :style="panelStyle">
```

Falta `aria-controls` en el disparador y falta el `id` en el `<ul role="listbox">`.

**Criterio.** APG, patrón *Combobox* (consultado el 2026-09-04): *«The combobox element has
`aria-controls` set to a value that refers to the element that serves as the popup»*. Regla
`aria-required-attr` de axe-core (**critical**, WCAG §4.1.2, A). Y es una de las ocho reglas mínimas
que ya exige el criterio §8.10 de `docs/ux/armazon-tablet-especificacion.md`.

**Por qué aquí duele más que en el caso genérico.** El panel se **teletransporta a `<body>`**
(`:267`), así que no es descendiente del combobox. `aria-activedescendant` apunta a nodos
(`${controlId}-opt-${i}`, `:272`) que viven fuera del subárbol del control y **sin ninguna relación
declarada** entre ambos: no hay `aria-controls` ni `aria-owns`. Para el lector de pantalla, el
combobox dice tener un descendiente activo que no puede alcanzar. La única cosa que ata las dos
mitades es la coincidencia del prefijo de `id`, que es una convención del código, no del árbol de
accesibilidad.

**Alcance.** **32 consumidores** (`grep -rl "<AppSelect" src --include=*.vue`), es decir, la mayor
parte de los formularios de catálogo, contratación y facturación de la consola.

**Nota de mérito, para no romperlo.** El resto de este componente **sí** cumple el patrón y no hay
que tocarlo: `role`, `aria-haspopup`, `aria-expanded`, `aria-selected` por opción, `aria-activedescendant`,
ArrowUp/Down, Home/End, Enter, Espacio, Escape con devolución de foco (`close(true)`, `:98`),
typeahead con ventana de 600 ms, y cierre por fuera que **excluye el panel teletransportado**
(`:193-199`) — que es exactamente la salida correcta que exige R01 y que evita el `@mousedown`
activador. El defecto es de dos atributos, no de diseño.

**Arreglo.**

```vue
const listboxId = computed(() => `${controlId.value}-listbox`)

<button … :aria-controls="open ? listboxId : undefined">
<ul :id="listboxId" role="listbox" :aria-label="label ?? placeholder">
```

`aria-controls` solo mientras el panel es visible, que es lo que dice literalmente el APG. El
`aria-label` del listbox no lo exige el APG pero lo pide el sentido común cuando el panel vive en
`<body>`: se toma la etiqueta del campo, que ya existe como prop.

**Verificación.** Nueva `tests/unit/app-select-combobox.spec.ts`: con el panel abierto,
`aria-controls` del disparador resuelve a un nodo existente, ese nodo tiene `role="listbox"`, y
`aria-activedescendant` resuelve a un `role="option"` **dentro** de ese listbox. Es la guarda que
`reglas-de-interfaz.md` daba por existente en la consola al hablar de `SearchableSelect`
(public-web #108) — y que en realidad no existe en ninguno de los dos repos.

---

### H05 · [grave] 31 de las 86 vistas no tienen `<h1>`, y dos expedientes enteros no tienen ningún encabezado

Reproducible: `for f in $(find src/features -path '*/views/*.vue'); do grep -q "<h1" $f || echo $f; done`
→ 31 ficheros.

Los dos casos que mandan son los armazones de expediente:
`src/features/companies/views/CompanyRecordLayout.vue` y
`src/features/subscriptions-admin/views/SubscriptionRecordLayout.vue`. **Ninguno de los dos declara
un solo encabezado**, y sus 13 sub-vistas hijas arrancan en `<h2>`
(p. ej. `record/CompanySummaryView.vue:60`, `<h2 class="ds-title">Resumen</h2>`). Otras usan un
`<h2>` como titular de pantalla con `tabindex="-1"`
(`billing-operations/views/PaymentsView.vue:52`), que es la forma correcta con el nivel equivocado.

**Criterio.** WCAG 2.2 §1.3.1 Información y relaciones (A) y §2.4.6 Encabezados y etiquetas (AA).
Reglas `page-has-heading-one` y `heading-order` de axe-core (*moderate*, buenas prácticas).

**Impacto, y no es solo semántico.** Dos mecanismos del armazón resuelven el foco buscando
literalmente `main h1`:

- `src/composables/useModalFocus.ts:90-91` — cadena de respaldo al cerrar un modal cuyo disparador
  ya no está: `document.querySelector('main h1') ?? document.querySelector('h1')`.
- `src/composables/useNavDrawer.ts:100` — dónde aterriza el foco cuando el cajón se cierra **por una
  navegación**: `contenido?.querySelector('h1') ?? contenido`.

En las 31 vistas sin `h1` los dos caen al respaldo (`main#contenido`), que es correcto pero
**anuncia la región en vez de la pantalla** — justo lo que el comentario de `useNavDrawer.ts:82-88`
explica que se quería evitar. En tablet, cerrar el cajón navegando a un expediente deja al usuario
oyendo «principal» en lugar del nombre del expediente al que acaba de entrar. El criterio §8.17 del
armazón («el foco aterriza en un sitio razonable») pasa; la intención de diseño, no.

**Alcance.** 31 vistas de 86. Los 13 hijos de los dos expedientes son el bloque más denso.

**Arreglo.** Un `<h1>` por pantalla, en el armazón de la pantalla y no en cada hija:

1. `CompanyRecordLayout.vue` — `<h1>` con el nombre comercial de la empresa, dentro de
   `CompanyRecordHeader` (que ya recibe `:company`), **antes** del `CompanyRecordNav`. Las sub-vistas
   conservan sus `<h2>` y la jerarquía queda h1 → h2 sin saltos.
2. `SubscriptionRecordLayout.vue` — igual, con el identificador del contrato.
3. Las **14 vistas sin `h1` que ya titulan con `<h2 … tabindex="-1">`** suben ese mismo nodo a
   `<h1>`: es un cambio de etiqueta, conserva el `tabindex="-1"`, el `id` y el `aria-labelledby` de
   la `<section>` que ya lo referencia (`PaymentsView.vue:50,52`), y no toca ni una línea de CSS
   —las clases de tamaño son `ds-display--sm` / `ds-title`, no el selector de elemento—, así que no
   hay riesgo de `css:budget`.
4. `LoginView.vue` y las vistas de `platform-access` cuelgan de `PublicLayout`, que ya sabe titular:
   basta con que el `title` del shell se pinte como `<h1>`.

**Verificación.** Prueba unitaria de rejilla, del tipo de `loader-guard.spec.ts`: todo SFC bajo
`src/features/**/views/` contiene exactamente un `<h1` **o** está en una lista de deuda explícita
que solo puede encoger. Es barata, no necesita navegador y sube R? a rejilla, que es lo que pide la
puerta 7 de «Puertas que faltan».

---

### H06 · [grave] La consola autenticada no escribe `document.title`: 37 rutas comparten «Lumbre»

`index.html:6` declara `<title>Lumbre</title>` y es el único título que existe para toda la
aplicación autenticada. El mecanismo **ya está escrito** — pero solo en la capa pública:
`src/components/layout/PublicLayout.vue:33-34,67,70-71` acepta `documentTitle` y lo aplica en
`onMounted` y en un `watch`. `AppLayout.vue` no tiene nada equivalente, y ninguna vista bajo
`AppLayout` asigna título (`grep -rn "document.title" src` solo devuelve `PublicLayout` y sus cinco
consumidores de `platform-access`/`auth`).

**Criterio.** R08 · «Idioma declarado, y **título que describa la pantalla**». WCAG 2.2 §2.4.2
Página titulada (A): *«Web pages have titles that describe topic or purpose»*; en una SPA lo cumple
el router.

**Impacto y alcance.** La consola se usa con varias pestañas abiertas —una empresa en una, la
cobranza en otra— y son indistinguibles en la barra de pestañas y en el historial. R08 ya lo cifró:
«44 rutas con nombre en el tenant y **37 en la consola**, todas con el mismo título». Lo que la
ficha no dice es que el issue abierto (**public-web #133**) es **solo del tenant**: la mitad de la
consola no tiene issue, pese a que la mitad de la evidencia era suya.

**Arreglo.** Una vez, en el router, no 37 veces en las vistas:

1. `meta.title?: string` en cada `RouteRecordRaw` de `src/router/routes/*.routes.ts`.
2. En `src/router/index.ts`, un `afterEach`:
   `document.title = to.meta.title ? `${to.meta.title} · Lumbre` : 'Lumbre'`.
   El separador ` · ` es el que ya usan los cinco `documentTitle` existentes
   (`AprobarAccesoView.vue:234`, «Aprobar acceso · Lumbre») — no se inventa otro.
3. Para los expedientes, cuyo título depende del dato cargado, el armazón del expediente actualiza
   `document.title` cuando resuelve la empresa/el contrato, con el mismo formato.

**Verificación.** Prueba de rejilla sobre las definiciones de ruta: toda ruta con `name` declara
`meta.title`, salvo lista de excepciones vacía. Y `security-headers.spec.ts` —que ya sujeta la otra
mitad de R08— gana un `describe('título de la página')` que comprueba que el `afterEach` existe.

---

### H07 · [grave] La campana de la cabecera es un control muerto que además inventa un aviso

`src/components/layout/AppHeader.vue:57-60`

```vue
<button class="bell-btn ds-icon-btn--accent ds-focus-ring" aria-label="Notificaciones">
  <component :is="ICONS.BELL" :size="15" />
  <span class="bell-dot" />
</button>
```

No tiene `@click`. No tiene `type="button"`. Y `.bell-dot` (`:112-121`) es un punto de
`--amatista-700` **siempre encendido**: la convención universal de «tienes avisos sin leer».

**Criterio.** R14 (dato inventado) y Nielsen, heurística 1. WCAG 2.2 §4.1.2 (A): un control con
nombre y rol de botón que no tiene función. Y el propio fichero se autodenuncia: las líneas 26-35
documentan que se **retiró el buscador global** por ser «un control muerto que aparenta estar vivo»,
con este razonamiento exacto — y dejaron la campana tres líneas más abajo.

**Impacto y alcance.** El punto morado se ve en **las 86 pantallas**. Un auxiliar con prisa lo
interpreta como «hay algo que atender», lo pulsa, no pasa nada, y lo vuelve a pulsar. Es el mismo
patrón que los siete contadores inventados que EST-12 retiró del sidebar, sobrevivido en la
cabecera, que es justo el punto ciego que R14 dejó anotado.

**Arreglo.** El mismo criterio que se aplicó al buscador: **o se implementa, o se retira**. Sin
backend de notificaciones, se retira el botón entero (líneas 57-60) y sus reglas
(`.bell-btn` de `:85-101` y `:150-153`, `.bell-dot` de `:112-121`). Si hay que conservar el hueco
visual, se conserva el botón **sin punto** y con un `@click` que abra un `useToast().info` honesto
—«No tienes notificaciones nuevas.»—, que es exactamente lo que ya hace el gemelo del tenant
(`VetSoftwarePublicFront/src/components/layout/AppSidebar.vue:117-119`) y por tanto no inventa un
literal nuevo. **Nunca** dejar el punto sin dato detrás.

**Verificación.** Extensión del mismo `describe` que H01 propone: ningún indicador de estado
permanente fuera del `<nav>` sin una fuente de datos que lo alimente; en la práctica, que
`.bell-dot` no exista o que su `v-if` dependa de un contador.

---

### H08 · [grave] Paginar hasta el extremo deja el foco en `<body>`

`src/components/ui/AppPagination.vue:47-65`. Los dos botones se deshabilitan por `:disabled` en
cuanto se alcanza el borde (`hayPrevia`/`haySiguiente`, `:39-40`). Quien llega a la última página
**pulsando «Siguiente» con el teclado** ve cómo el botón que tiene enfocado se deshabilita bajo el
foco: el navegador lo suelta y el foco cae al `<body>`.

**Criterio.** APG, *Developing a Keyboard Interface* → «Persistence of focus», citado literalmente
por R02 en este mismo repositorio: *«browsers move focus to the body element, effectively causing a
loss of focus within the user interface»*. WCAG 2.2 §2.4.3 Orden del foco (A).

**Impacto y alcance.** El siguiente `Tab` reinicia el recorrido desde el principio del documento:
el usuario vuelve al enlace de salto y tiene que atravesar la cabecera otra vez para llegar a la
tabla que estaba leyendo. **25 consumidores** (`grep -rl "<AppPagination" src --include=*.vue`), es
decir, todos los listados paginados de facturación, cobranza, suscripciones y límites.

**Segundo defecto en el mismo componente, y el arreglo es el mismo sitio.** El rango «Mostrando
1–20 de 137» (`:45`) cambia en cada página **en silencio**: no hay región viva. La casa ya tiene el
patrón resuelto y probado, en `AppListSearch.vue:157-160` — un `<p class="ds-sr-only" role="status">`
**persistente**, montado siempre, del que solo cambia el texto (el comentario de esas líneas explica
por qué el `v-if` no vale). WCAG 2.2 §4.1.3 Mensajes de estado (AA).

**Arreglo.**

1. Tras emitir `update:page`, en el `nextTick`: si el botón activado quedó deshabilitado, mover el
   foco al **otro** botón, que sigue habilitado. Con una sola página, al contenedor `<nav>` con
   `tabindex="-1"`. Nunca dejar que el navegador decida.
2. Región viva persistente dentro del `<nav>`, con el texto del rango, copiando literalmente la
   forma de `AppListSearch.vue:160`. El texto visible de `:45` no cambia; lo que se añade es el
   nodo que lo anuncia.

**Verificación.** `tests/unit/pagination.spec.ts` existe pero prueba **el composable**
`useServerPaged`, no el componente: sus 12 casos son de rango y bordes numéricos. Nueva
`tests/unit/app-pagination-focus.spec.ts`: al pasar a la última página, `document.activeElement` no
es `document.body`.

---

### H09 · [grave] `required` es solo un asterisco de color: el control nunca lo declara

`AppInput.vue:113-114` y `:117-134`; `AppSelect.vue:239-241` y `:243-257`;
`AppTextarea.vue:87-89` y `:91-103`. Los tres pintan
`<span v-if="required" class="required">*</span>` dentro del `<label>` y **ninguno propaga
`required` al control**: no hay `:required` ni `aria-required` en el `<input>`, el `<textarea>` ni
el `<button role="combobox">`.

**Criterio.** WCAG 2.2 §3.3.2 Etiquetas o instrucciones (A) — la instrucción tiene que llegar al
usuario, y el color del asterisco no la lleva a quien no ve la pantalla. §4.1.2 (A) en cuanto al
valor de estado del control. Y §1.4.1 Uso del color (A): el asterisco se distingue por
`color: var(--danger-500)` (`AppInput.vue:167-169`) sin ninguna leyenda que explique qué significa
en ninguna de las tres primitivas.

**Impacto y alcance.** Un lector de pantalla anuncia «Nombre, estrella, cuadro de edición» y no
«obligatorio». El usuario descubre la obligatoriedad **al fallar el envío**, que es exactamente el
orden que las diez guías de errores de formulario de NN/g piden invertir. Alcance por llamadas:
**63 consumidores de `AppInput`, 32 de `AppSelect`, 19 de `AppTextarea`** — 114 puntos de uso, la
totalidad de los formularios de la consola.

**Arreglo, aditivo y de una línea por componente.**

```vue
<!-- AppInput.vue:117 / AppTextarea.vue:91 -->
:required="required || undefined"
<!-- AppSelect.vue:243 — el disparador no es un control nativo -->
:aria-required="required || undefined"
```

Y el asterisco pasa a `aria-hidden="true"`: la información ya viaja por el atributo, y así deja de
leerse «estrella» a mitad de la etiqueta. **No** se añade `novalidate`/validación nativa: la
convención de validación del repo (validador puro → `computed errors` → mapa `touched` → error tras
`@blur` → `defineExpose({ validate })` → `ErrorSummary` del padre) se conserva intacta; `required`
aquí solo informa al árbol de accesibilidad.

**Cuidado con un efecto colateral real.** `:required` nativo activa la validación del navegador y
su burbuja al enviar un `<form>`. Los formularios de esta consola envían por `@submit.prevent` con
`validate()` propio, así que la burbuja no aparece — pero hay que comprobarlo en los que sí montan
`<form>` (p. ej. `SucceedContractModal.vue:390`). Si estorbara, se usa `aria-required` en los tres
y no el atributo nativo. **No comprobado en este turno.**

**Verificación.** Ampliar `e2e/accessibility.spec.ts`, que ya tiene el caso hermano
(`it('un campo con error lleva aria-invalid y un aria-describedby que resuelve')`, `:79`): un campo
marcado obligatorio expone `required`/`aria-required` en el control, no solo en la etiqueta.

---

### H10 · [menor] El botón «Nueva empresa» de la cabecera es un `.ds-btn` escrito a mano

`src/components/layout/AppHeader.vue:61-64` y `:123-138`.

```vue
<button v-if="!onCompaniesList" class="primary-btn ds-flex-row" @click="goToCompanies">
```

```css
.primary-btn { padding: var(--space-8) var(--space-14); border-radius: var(--radius-md);
  border: none; background: var(--warm-900); … }
.primary-btn:hover { background: var(--warm-800); }
```

**Criterio.** Regla del repo: la trampa de especificidad de `AGENTS.md:103-122` —el color va en una
clase de tono desde el marcado, la base del `scoped` se queda con geometría—, y el espíritu de
`stylelint-plugins/no-duplicate-primitive.mjs` (FE-08), que no lo cazó porque el cuerpo no coincide
byte a byte con ninguna primitiva tras interpolar tokens. Es el mismo mecanismo por el que `.tabla`
sobrevivió hasta DS-02 (`AppTable.vue:33-37`).

**Qué se pierde por no ser `.ds-btn`.** Tres estados que la primitiva regala y este botón no tiene:
`:focus-visible { box-shadow: var(--ring) }` (`primitives.css:153-156`) —hoy depende del anillo por
defecto del navegador, no del anillo tokenizado que R03 exige medido ≥3:1 contra la superficie
real—, `:disabled` (`:158-161`), y `type="button"`, que falta también en `:57` y `:61`.

**Alcance.** La cabecera está en las 86 pantallas; el botón, en 85 (se oculta en el listado de
empresas, `:18`).

**Arreglo.**

```vue
<button v-if="!onCompaniesList" type="button" class="ds-btn ds-btn--solid ds-btn--snug ds-flex-row"
        @click="goToCompanies">
```

El tono oscuro de la cabecera no se pierde ni se escribe en el `scoped`: se declara la variable de
escape que la propia primitiva documenta (`primitives.css:89-95`),
`.topbar { --ds-btn-solid-bg: var(--warm-900); }`, que es una de las dos salidas autorizadas.
Se retiran las reglas `.primary-btn` y `.primary-btn:hover`, con lo que el `scoped` de este SFC
**encoge** — el trinquete de `css:budget` solo admite bajar, y esto baja.

---

### H11 · [menor] `AppCheckbox` no sabe llevar error, y hay un formulario que ya lo necesita

`src/components/ui/AppCheckbox.vue:12-16` declara `{ modelValue, label, disabled }` y nada más: sin
`id`, sin `error`, sin `required`, sin `aria-describedby`, sin `aria-invalid`. Es la única primitiva
de campo de la consola que se quedó fuera de la corrección de §3.3.1 que sí recibieron `AppInput`,
`AppSelect` y `AppTextarea`.

**El caso real ya está en el árbol.** `src/features/commercial-catalog/components/PublishPriceListModal.vue:141-142`:

```vue
<AppCheckbox v-model="acknowledged" :label="acknowledgeLabel" />
<p v-if="acknowledgeError" class="error" role="alert">{{ acknowledgeError }}</p>
```

El mensaje se pinta debajo y **no está asociado al control**. Es literalmente el defecto que
`AppInput.vue:69-83` documenta haber cerrado —«el mensaje de error vivía en un `<p>` sin `id` que
nada ataba al control»— reaparecido en el componente que no se tocó, y en el peor sitio: la casilla
que confirma la **publicación de una lista de precios**.

**Criterio.** WCAG 2.2 §3.3.1 Identificación de errores (A). §4.1.2 (A) para `aria-invalid`.

**Alcance.** 7 consumidores; **1 con error hoy**, y los otros seis son casillas de formulario que
mañana pueden necesitarlo (`BaseRoleForm.vue:83`, `CatalogItemForm.vue:256`,
`SubmoduleForm.vue:167,168`, `SucceedContractModal.vue:387`, `IssueCreditNoteModal.vue:133`,
`OverLimitAccountsView.vue:93`).

**Arreglo.** Copiar el patrón de `AppInput` sin inventarlo: `id?` + `useId()`, props `error?` y
`required?`, `errorId` computado, `:aria-invalid="!!error || undefined"`,
`:aria-describedby="error ? errorId : undefined"` sobre el `<input type="checkbox">`, y el mismo
`<p v-if="error" :id="errorId" class="error">` con `ICONS.WARNING` que ya usan las otras tres. El
consumidor de `PublishPriceListModal.vue` pasa a `:error="acknowledgeError"` y borra su `<p>` local
—y con él, la regla `.error` de su `scoped`, otra bajada para `css:budget`.

**Verificación.** El caso de `e2e/accessibility.spec.ts:79` extendido a la casilla.

---

### H12 · [nota] Dos issues de la contabilidad hay que moverlos, y la puerta que falta sigue siendo la misma

Tres ajustes al registro de `docs/ux/reglas-de-interfaz.md`, para que el backlog diga la verdad:

1. **admin-web #74 está cerrado en el árbol y nadie lo ha cerrado.** El issue dice «la guarda de
   movimiento de la consola no alcanza a las primitivas TR-02: cubre `.app-*`, no el temblor de
   `.ds-field-*`». En este HEAD la guarda es `src/assets/styles/base.css:108-119`, universal
   (`*, *::before, *::after`) y con `!important`: cubre todo, `.ds-field-*` incluido. Y el fichero
   que el issue y R06 mandan parchear —`src/assets/styles/main.css`— **ya no existe en la consola**.
   Cerrar el issue, y con él arreglar las tres fichas de §0.1.
2. **El punto (b) del issue 4 de «Issues por abrir» sigue sin abrirse**, y ahora tiene la cifra de
   la consola: 58 tablas vía `AppTable` + 7 usos directos (H03).
3. **public-web #133 necesita hermano en admin-web**: R08 documentó las 37 rutas de la consola sin
   título y el issue se abrió solo en el otro repo (H06).

Y la puerta que sostiene todo lo anterior sigue siendo **admin-web #44**, con el orden de coste que
ya fija «Puertas que faltan»: `eslint-plugin-vuejs-accessibility` en `warn` (puerta 6, nace en verde
y solo bloquea código nuevo) → ARIA snapshots de Playwright sobre la galería `visual/` que ya existe
(puerta 9, fija los nombres accesibles de H02 sin comparar píxeles) → axe sobre el armazón, que es
el criterio §8.10 del armazón y **hoy no se puede ejecutar**. No se redacta issue nuevo: existe.

---

## 2. Qué implementar, en qué orden, y quién

El reparto es el de `docs/ux/lumbre-rebrand.md` §12, contrastado contra
`scripts/tr02-parity.config.json`, que es lo que `npm run quality` lee de verdad.

### 2.1 Nada de esto toca un gemelo TR-02

Se comprobó fichero a fichero contra el manifiesto. Los gemelos son `tokens.css`, `primitives.css`,
`base.css`, `ErrorSummary.vue`, `PageLoader.vue`, `PawLoader.vue`, `ToastStack.vue`,
`ModalShell.vue`, `useModalFocus.ts`, `useModalHistory.ts`, `useModalLayer.ts`, `useServerPaged.ts`,
`useToast.ts` y el tooling. **Ninguno de los doce hallazgos exige tocarlos.** En particular:

- H03 quiere focalizar `.ds-table-scroll`, pero el `tabindex`/`role`/`aria-label` van en el
  **marcado de `AppTable.vue`** (propio de la consola), no en la primitiva.
- H10 usa `--ds-btn-solid-bg`, la variable de escape que `primitives.css:89-95` ya expone, en vez de
  añadir una variante.
- H01 y H07 tocan `SidebarUserCard.vue` y `AppHeader.vue`, que no son gemelos (el armazón de los dos
  repos diverge desde antes, y así lo dice `VetSoftwarePublicFront/src/components/layout/AppLayout.vue:20-21`).

Si algo cambiara y hubiera que tocar un gemelo, **para y pásalo a `front-parity`**: un gemelo
arreglado en un solo lado es una divergencia que ningún gate comprueba.

### 2.2 Para `front-feature` (admin-web), por orden

| # | Hallazgo | Ficheros | Coste | Por qué en este orden |
|---|---|---|---|---|
| 1 | H01 · identidad inventada | `SidebarUserCard.vue`, `tests/unit/sidebar-sin-cifras-inventadas.spec.ts` | XS | Quitar líneas. Cierra una regla propia con el arreglo ya escrito al lado, y toca las 86 pantallas |
| 2 | H07 · campana muerta | `AppHeader.vue` | XS | Mismo motivo, mismo fichero de guarda, mismo día |
| 3 | H09 · `required` no llega al control | `AppInput.vue`, `AppSelect.vue`, `AppTextarea.vue` | XS | Una línea por primitiva, 114 puntos de uso, cero riesgo visual |
| 4 | H04 · combobox sin `aria-controls` | `AppSelect.vue`, nueva `tests/unit/app-select-combobox.spec.ts` | S | Dos atributos, 32 consumidores, regla *critical* de axe |
| 5 | H11 · casilla sin error | `AppCheckbox.vue`, `PublishPriceListModal.vue` | S | Patrón ya resuelto en las otras tres; hay un consumidor sufriéndolo |
| 6 | H08 · foco al paginar + rango anunciado | `AppPagination.vue`, nueva `tests/unit/app-pagination-focus.spec.ts` | S | 25 listados; el patrón de región viva se copia de `AppListSearch` |
| 7 | H10 · botón a mano en la cabecera | `AppHeader.vue` | S | Va después de H07 para no tocar el mismo fichero dos veces en paralelo |
| 8 | H03 · tablas focalizables y con nombre | `AppTable.vue` + **58 consumidores** (prop nueva), `tests/unit/app-table-scroll.spec.ts` | **L** | La prop es obligatoria: toca 58 ficheros. Va aquí porque es mecánico pero ancho |
| 9 | H02 · sujeto en la etiqueta de fila | **15 vistas de listado**, 30 atributos, 2 pruebas nuevas | **L** | Igual: mecánico y ancho, y el mayor riesgo clínico de la lista |
| 10 | H05 · un `<h1>` por pantalla | 2 armazones de expediente + 14 listados (cambio de etiqueta) + 15 vistas restantes + prueba de rejilla | **L** | Depende de decidir el texto de título de cada expediente |
| 11 | H06 · `document.title` por ruta | `src/router/index.ts` + `meta.title` en `routes/*.routes.ts` | M | Un `afterEach` y 37 literales; sin dependencias con lo anterior, se puede paralelizar |

**Reglas de convivencia.** H07 y H10 tocan `AppHeader.vue`: **no se paralelizan**. H03 y H09 tocan
primitivas distintas y sí. H02, H05 y H06 tocan features y no se pisan entre sí.

**Presupuesto.** Ninguno de los once sube una línea de `<style>`: H10 y H11 **retiran** reglas de
`scoped`, y el resto solo añade atributos y script. `maxStyleMinusScript: 0`, `maxSfcLines: 500`,
`maxOversizedSfc: 0` y `maxDuplicateGroups: 0` no se tocan. Es un trinquete y aquí solo baja.

### 2.3 Para `front-parity`

**Ningún cambio de código.** Ninguno de los doce hallazgos toca un gemelo. Lo que sí es suyo, y hay
que hacerlo **en los dos repos y en el mismo PR** porque el fichero es gemelo byte a byte:

1. **Corregir las tres fichas caducadas de `reglas-de-interfaz.md`** (§0.1 de este documento):
   `:172-173` (R02 afirma que no hay focus trap y lo hay), `:517` y `:525-528` (R06 cita un
   `main.css` que la consola ya no tiene), `:1411` («Puertas que faltan» punto 2, que manda copiar
   un bloque a ese fichero inexistente). Con las líneas de reemplazo apuntando a
   `useModalFocus.ts:47-64`, `ModalShell.vue:188` y `base.css:108-119`.
2. **La cuarta ficha caducada, del mismo documento y sobre el mismo manifiesto.**
   `reglas-de-interfaz.md:170-171` (R02) llama a `ModalShell` «gemelo de facto … y **no declarado**
   en el manifiesto TR-02», y «Puertas que faltan» punto 10 (`:1444-1446`) dice que «hoy el
   manifiesto cubre **29** ficheros de `src/` y tooling, y **ni siquiera declara `ModalShell`**».
   Las dos afirmaciones son falsas hoy: `scripts/tr02-parity.config.json` tiene **41** entradas y
   `src/components/ui/ModalShell.vue` es una de ellas
   (`jq -r '.files | length' scripts/tr02-parity.config.json` → 41).
3. **Lo que del punto 10 sigue siendo cierto, y es lo que causó §0.1.** El manifiesto **no declara
   ninguna ruta bajo `docs/`** (`jq -r '.files[] | select(test("^docs/"))'` → vacío), y sin embargo
   `docs/ux/reglas-de-interfaz.md` y `docs/ux/README.md` son gemelos byte a byte por decisión
   escrita en su propia cabecera. Por eso las cuatro fichas caducadas pudieron desfasarse sin que
   ningún gate dijera nada. Darlos de alta es la línea que cierra el bucle.
4. Lo demás del registro que sigue vigente: igualar `tokens-contrast.spec.ts` entre los dos repos
   («Puertas que faltan», punto 1) — 112 líneas en el tenant contra 364 en la consola, sobre un
   fichero medido que es gemelo.

### 2.4 Para el humano, no para un agente

Abrir dos issues y cerrar uno (H12). Los tres cuerpos están redactados: dos en
`reglas-de-interfaz.md` («Issues por abrir», issues 1 y 4b) y el tercero es el hermano en admin-web
de public-web #133. **Esta auditoría no abre ninguno.**

---

## 3. Qué se verificó y qué no

**Método, y por qué importa aquí.** El índice de CodeGraph (`MainVetSoftware/.codegraph/`) **no
cubre este worktree**: cubre `MainVetSoftware/VetSoftwareFront`, que es otro árbol y tenía 11
ficheros sin commitear, entre ellos `base.css`, `primitives.css` y `tokens.css` — tres de los que
este informe cita por línea. Se usó CodeGraph **solo** para orientarse y para el radio de impacto
(quién renderiza `AppLayout`, quién consume `AppHeader`), y **ni una sola cita `fichero:línea` de
este documento procede de él**: todas se releyeron con `cat -n` / `grep -n` sobre
`MainVetSoftware-uxaudit/admin-web`, y los conteos con `grep`/`jq` sobre ese mismo árbol. Las citas
de `AppLayout.vue:14` y `:88`, que habían llegado primero por CodeGraph, se reverificaron contra el
fichero real antes de escribirlas.

**Verificado leyendo el árbol** (worktree limpio en `f9ec359`, 2026-09-04): el marcado y el
`<style scoped>` de `App.vue`, `AppLayout.vue`, `AppHeader.vue`, `AppSidebar.vue`,
`SidebarBrand.vue`, `SidebarUserCard.vue`, `useNavDrawer.ts`, `useModalFocus.ts`, `PageLoader.vue`,
`ErrorSummary.vue`, `AppInput.vue`, `AppTextarea.vue`, `AppSelect.vue`, `AppCheckbox.vue`,
`AppBadge.vue`, `AppModal.vue`, `AppPagination.vue`, `AppTable.vue`, `AppListSearch.vue`,
`ModalShell.vue` (script y template), y las familias `.ds-btn`, `.ds-field`, `.ds-focus-ring`,
`.ds-icon-btn`, `.ds-table-scroll` de `primitives.css`, más `base.css` entero. Todos los censos
llevan su `grep` al lado.

**Consultado contra la norma viva el 2026-09-04:** APG, patrón *Combobox*
(https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) — de donde sale la cita literal de
`aria-controls` de H04; y las descripciones de reglas de axe-core
(https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) — de donde salen los
identificadores, impactos y mapeos de `scrollable-region-focusable` (serious, 2.1.1/2.1.3),
`aria-required-attr` (critical, 4.1.2), `aria-command-name` (serious, 4.1.2), `page-has-heading-one`
y `heading-order` (moderate, buenas prácticas). Ninguna URL falló.

**No consultado en este turno**, y por tanto citado de la ficha interna que ya lo verificó
(`reglas-de-interfaz.md`, `armazon-tablet-especificacion.md`): los *Understanding* de §2.5.8,
§2.4.11, §1.4.11, §1.4.3 y §1.4.10.

**No ejecutado, y no se da por pasado nada de esto:** `npm run quality`, `css:budget`, `ds:audit`,
`vue-tsc`, `vitest`, Playwright (ni `e2e/` ni `visual/`), y el servidor de desarrollo. Había dos
tandas de Playwright en curso en estos worktrees y competirían por el puerto y el navegador.

**No medido:** ningún contraste se calculó en este turno. Los ratios que aparecen citados
(`--warm-450` a 3,54:1, la barra activa a 7,61:1, los títulos de grupo a 5,36:1) vienen de los
comentarios ya verificados de `primitives.css` y de `armazon-tablet-especificacion.md` §8.9/§8.12,
no de una medición propia. El contraste y la paleta Lumbre son el objeto de la auditoría hermana
(`docs/ux/uxa-marca-lumbre-y-contraste.md`), y este documento no se pronuncia sobre ellos.

**No comprobado, y anotado en su ficha:** si activar `:required` nativo hace aparecer la burbuja de
validación del navegador en los formularios de la consola que sí montan un `<form>` (H09).
