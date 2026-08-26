# Armazón de la consola en tablet — especificación

**Ámbito:** `VetSoftwareFront` (consola de plataforma, «Panel administrativo»). Solo este repo.
**Piezas:** `AppLayout.vue`, `AppSidebar.vue`, `AppHeader.vue`, `SidebarBrand.vue`,
`SidebarUserCard.vue`, `sidebar-nav.ts`, `viewport.store.ts`, `useViewport.ts`.
**Origen:** tres quejas de uso en tablet — «solo se ven iconos y no se ve bien», «hay doble
scroll», «que sea más amigable».
**Estado:** especificación. Nada de esto está implementado. Sustituye al diseño de EST-10 en la
parte de armazón; **no** toca lo que EST-10 arregló en `AppTable` (R15), que sigue vigente.

> Este fichero **no es gemelo TR-02**. `docs/ux/README.md` y `docs/ux/reglas-de-interfaz.md` sí lo
> son, byte a byte con `VetSoftwarePublicFront`: **no los edites para indexar este documento** — eso
> rompería la paridad. Si se quiere entrada en el índice, se hace en los dos repos a la vez y lo
> decide quien mantenga la paridad, no el implementador de esta ficha.

---

## 1. Diagnóstico del doble scroll

### 1.1 Las dos barras, y de dónde sale cada una

La hipótesis de partida —«es el `min-height`»— **acierta en la barra que más molesta y se queda
corta en la otra**. Hay dos contenedores de scroll simultáneos y son de naturaleza distinta:

**Barra A — el documento entero (borde derecho de la ventana).**
Cadena completa, verificada:

| Nivel | Regla | Fichero |
|---|---|---|
| `html, body, #app` | `height: 100%` | `src/assets/styles/base.css:32-43` |
| `.v-application__wrap` (Vuetify, por el `<v-app>` de `App.vue:9`) | `min-height: 100vh; min-height: 100dvh` | `node_modules/vuetify/lib/components/VApp/VApp.sass` |
| `.app-shell` | **`min-height: 100vh`** | `src/components/layout/AppLayout.vue:22` |
| `.app-main` | **`min-height: 100vh`** + `overflow: hidden` | `src/components/layout/AppLayout.vue:29-30` |
| `.app-content` | `flex: 1; overflow: auto` | `src/components/layout/AppLayout.vue:33-37` |

`.app-main` es `ds-stack`, es decir `display: flex; flex-direction: column`
(`src/assets/styles/primitives.css:942-945`). Su hijo `.app-content` lleva `flex: 1`, o sea
`flex: 1 1 0%` — pero **no lleva `min-height: 0`**, y en un contenedor flex la mínima automática de
un ítem es su altura de contenido. Resultado: `.app-content` nunca baja de la altura de su
contenido, `.app-main` crece con él (su `min-height` es un mínimo, no un tope), la fila del grid
`.app-shell` crece porque es `auto`, y el desbordamiento se propaga desde `body` al viewport.

**Consecuencia directa:** `.app-content { overflow: auto }` (`AppLayout.vue:36`) **no llega a
scrollear jamás** — siempre es tan alto como su contenido. Y `.app-main { overflow: hidden }`
(`AppLayout.vue:30`) tampoco recorta nada en vertical, porque la fila ya creció para caber. Las dos
declaraciones son inertes hoy: parecen resolver el problema y no resuelven nada.

**Barra B — el propio sidebar (borde derecho del raíl de 72 px).**
`src/components/layout/AppSidebar.vue:158-165`:

```css
.sidebar {
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;   /* ← segundo contenedor de scroll, independiente */
}
```

Es un contenedor de scroll **propio**, con altura fija de 100vh. Desborda siempre que la navegación
no cabe en la pantalla, y con este menú eso ocurre en tablet a poco que se abra un acordeón: el menú
tiene 4 grupos y 15 entradas de primer nivel (`sidebar-nav.ts:42-233`), de las cuales dos son padres
con 3 y **7** hijos. En compacto cada hoja mide 38 px y cada hija 34 px (`AppSidebar.vue:307-317`),
así que «Catálogos clínicos» abierto añade 238 px de golpe. En 1024×768 (iPad apaisado) desborda
prácticamente siempre.

**Y como `.sidebar` es `sticky` y `AppHeader` no lo es**, las dos barras se comportan al revés de lo
que el usuario espera: al desplazar la lista, el menú se queda quieto y **la barra superior —con
«Nueva empresa» y las notificaciones— se va de la pantalla**. Esa es la mitad de «no se ve bien»
que no es el menú.

### 1.2 Tercer factor, exclusivo de tablet

`100vh` en iPadOS Safari y en Chrome Android se resuelve contra el viewport **grande** (barra de
herramientas retraída). Con la barra visible, un elemento de exactamente `100vh` ya sobresale del
viewport visible, y el documento ofrece scroll aunque el contenido quepa. `height: 100%` **no**
tiene ese problema (se resuelve contra el viewport pequeño), y por eso `base.css:32-43` está bien
como está. El fallo entra por `100vh` en `AppLayout.vue:22,29` y `AppSidebar.vue:162`.

**Verificado y descartado como causa:** Vuetify ya emite `min-height: 100vh` seguido de
`min-height: 100dvh` en `.v-application__wrap`. **No hay que tocar `src/assets/styles/app.css`.**

### 1.3 El arreglo

Un solo contenedor de scroll de contenido, y el raíl con el suyo solo cuando la lista de verdad no
cabe. Es exactamente el patrón que el front del tenant ya usa
(`VetSoftwarePublicFront/src/components/layout/AppLayout.vue:22-36`: `height: 100vh` +
`overflow: hidden` en el shell), así que no se inventa nada: se adopta el patrón de la casa.

`AppLayout.vue`:

```css
.app-shell {
  display: grid;
  grid-template-columns: 244px 1fr;
  height: 100vh;      /* respaldo para motores sin dvh */
  height: 100dvh;     /* ← sustituye a min-height: 100vh */
  overflow: hidden;   /* ← NUEVO: el documento no scrollea nunca */
  background: var(--surface);
  color: var(--text);
}

.app-main {
  min-width: 0;
  min-height: 0;      /* ← sustituye a min-height: 100vh */
  overflow: hidden;
}

.app-content {
  flex: 1;
  min-height: 0;      /* ← NUEVO: sin esto, flex:1 no baja del alto del contenido */
  padding: var(--space-28) var(--space-32);
  overflow: auto;
  overscroll-behavior: contain;  /* el rebote no arrastra al documento */
}
```

`AppSidebar.vue`:

```css
.sidebar {
  height: 100%;       /* ← sustituye a height: 100vh */
  min-height: 0;
  overflow: hidden;   /* ← el <aside> deja de scrollear */
  /* se RETIRA position: sticky / top: 0 — ya no hay nada que scrollee detrás */
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: var(--space-20) var(--space-16);
}

.nav-groups {
  flex: 1;
  min-height: 0;
  overflow-y: auto;              /* ← el scroll baja SOLO a la lista */
  overscroll-behavior: contain;
  margin-top: var(--space-18);
}
```

Efectos colaterales, todos deseados:

1. **`AppHeader` deja de irse de la pantalla** sin necesidad de `position: sticky`: queda fuera del
   único scroller.
2. **La marca y la tarjeta de usuario dejan de desplazarse**: «Cerrar sesión»
   (`SidebarUserCard.vue:29`) está siempre alcanzable, en vez de al fondo de una lista de 26
   enlaces.
3. `margin-top: auto` de `.sidebar-footer` (`SidebarUserCard.vue:37`) queda redundante con
   `.nav-groups { flex: 1 }`, pero es inofensivo: **no lo quites**, es lo que sostiene el pie si
   alguien cambia el reparto.
4. En tablet no habrá **ninguna** barra de raíl, porque el raíl deja de existir (§2).

---

## 2. Patrón del menú en tablet — decidido

### 2.1 La decisión

**Cajón lateral modal (off-canvas drawer) con rótulos completos, disparado por un botón hamburguesa
en `AppHeader`, para todo `width <= 1024px`.** Persistente y expandido por encima de 1024.

### 2.2 Por qué se descartan los otros dos

**Raíl persistente con tooltips — descartado explícitamente, y es el caso más claro.** Un tooltip se
dispara con `:hover`. En una tablet no hay hover: el rótulo **no aparece nunca**, y el usuario se
queda con un icono mudo. El propio código ya lo sabe y lo escribió — `AppSidebar.vue:59-60` dice
literalmente que `title` «no es fiable en todos los lectores y **no existe en táctil**» — y acto
seguido el diseño entrega justamente un raíl de iconos con `:title`. Esa contradicción **es** la
queja del usuario: el `.ds-sr-only` resuelve al lector de pantalla y deja al humano con vista sin
nada que leer. WCAG 2.2 §1.3.1 y §3.2.4 (Identificación coherente) no se cumplen con un nombre que
solo existe para la API de accesibilidad.

**Raíl de iconos que se expande al tocar — descartado.** El primer toque sobre un icono no
navegaría, expandiría. Eso convierte el destino primario en ambiguo («¿esto me lleva o me abre?»),
rompe la memoria muscular entre escritorio y tablet, y añade un modo a la navegación, que es la
única parte de la app que nunca debería tener modos. Además no arregla el problema de fondo: entre
expansión y expansión, el usuario sigue mirando iconos sin rótulo.

**Cajón — elegido.** Es el único de los tres que es nativamente táctil: sin hover, con objetivos
grandes, con el rótulo completo siempre visible cuando la navegación está en pantalla, y con un
disparador único, grande y en el mismo sitio siempre.

### 2.3 Por qué el coste del cajón es aceptable **aquí**

El cajón cobra un toque extra por navegación. Se paga a gusto por tres razones concretas de este
producto:

1. **Esta consola no es la app clínica.** Quien tiene el animal delante y una sola mano usa
   `VetSoftwarePublicFront`. Aquí el operador administra catálogos, módulos y contratos desde un
   escritorio: aterriza en un listado y se queda. La navegación no es el camino caliente.
2. **El ancho sí es crítico.** A 768 px, con un raíl de 72 px, el contenido tiene 696 px; con un
   sidebar de 244 px tendría 524 px, y las tablas más anchas de la consola
   (`BaseRolePermissionsListView`, 6 columnas) no caben. Con cajón, el contenido tiene **los 768 px
   enteros** — más que hoy. En 1024 pasa de 952 a 1024.
3. **Ya existe la red de seguridad para lo que no quepa**: `.ds-table-scroll` (guardado por
   `tests/unit/app-table-scroll.spec.ts`, R15 / WCAG §1.4.10).

**No se añade migaja de pan ni título de sección en la cabecera.** Se evaluó y se descarta: **todas
las vistas ya pintan su propio `<h1 class="ds-title">`** (p. ej.
`src/features/companies/views/CompaniesListView.vue:165`), así que un rótulo en `AppHeader` con el
nombre de la pantalla duplicaría el encabezado de nivel 1 y crearía dos sitios donde decir lo mismo.
El «¿dónde estoy?» ya está resuelto por el `<h1>` y por `aria-current` dentro del cajón.

---

## 3. Puntos de corte

**Sigue habiendo uno solo: 1024 px.** `COMPACT_MAX_WIDTH` no cambia de valor
(`src/stores/viewport.store.ts:11`), y `useViewport.ts:23` sigue construyendo el mismo
`matchMedia('(width <= 1024px)')`. Lo que cambia es **qué significa**: pasa de «los rótulos colapsan
a iconos» a **«la navegación es un cajón»**. La regla dura del comentario de `AppLayout.vue:44-46`
—el `@media` de los SFC y la constante del store tienen que coincidir— sigue vigente sin cambios.

| Banda | Ancho | Navegación | Contenido |
|---|---|---|---|
| Escritorio | `>= 1025px` | sidebar persistente, 244 px, rótulos visibles | `1fr` |
| Tablet y por debajo | `<= 1024px` | cajón modal, `min(280px, 86vw)` | ancho completo |

**No se separa «tablet» de «móvil», y es una decisión, no una omisión.** El único ajuste que un
tercer corte aportaría es el ancho del cajón en pantallas estrechas, y eso lo resuelve `min()` sin
media query. El mínimo declarado de la consola sigue siendo 768 px (`AppLayout.vue:40`); por debajo
el armazón no se rompe, simplemente no se promete.

**Renombrado obligatorio.** `isCompact` describe un diseño que deja de existir. En `viewport.store.ts`
pasa a `isDrawerViewport`, y **hay que reescribir el bloque de documentación de
`viewport.store.ts:13-28`**, porque hoy justifica punto por punto el uso de `.ds-sr-only` que esta
ficha retira. Un comentario que defiende una decisión revertida es peor que ninguno.

---

## 4. Anatomía del cajón

### 4.1 Estructura del armazón (cambia, y a mejor)

Hoy `AppHeader` va **dentro** de `<main class="app-main">` (`AppLayout.vue:9-10`). Un `<header>`
descendiente de `<main>` **no** es el landmark `banner`, así que la consola no tiene banner y el
futuro botón hamburguesa viviría en una región sin nombre. Se reordena:

```html
<div class="app-shell">
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <AppSidebar />                                  <!-- navigation / cajón -->
  <div class="app-main ds-stack">                 <!-- era <main> -->
    <AppHeader />                                 <!-- ahora sí: landmark banner -->
    <main id="contenido" class="app-content" tabindex="-1">
      <slot />
    </main>
  </div>
</div>
```

Con esto el armazón entrega los tres landmarks reales —`banner`, `navigation`, `main`— y `<main>`
pasa a ser **exactamente** el único contenedor de scroll de contenido.

`tabindex="-1"` en `<main>` no es opcional: sin él, un salto por `#id` mueve el scroll pero no
siempre el foco.

**El enlace de salto cierra un hueco WCAG de nivel A conocido y abierto** (§2.4.1 Bypass Blocks): a
partir de 1025 px hay entre 15 y 26 enlaces antes del contenido en **cada** navegación. En tablet el
cajón lo hace innecesario, pero el enlace se pone para las dos bandas: no cuesta nada y no se puede
«olvidar activar» en la banda donde hace falta.

```css
.skip-link {
  position: absolute;
  inset-inline-start: var(--space-8);
  inset-block-start: var(--space-8);
  z-index: var(--z-toast);
  padding: var(--space-8) var(--space-14);
  border-radius: var(--radius-md);
  background: var(--warm-900);
  color: var(--warm-50);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  text-decoration: none;
  transform: translateY(-200%);
}

.skip-link:focus-visible {
  transform: none;
  box-shadow: var(--ring);
}
```

Se usa `transform` y **no** `.ds-sr-only`: la primitiva
(`src/assets/styles/primitives.css:1591-1601`) usa `clip-path` y no se «desoculta» limpiamente al
enfocar. Este cuerpo no repite ninguna primitiva existente, así que no dispara
`vetsoftware/no-duplicate-primitive`.

### 4.2 El cajón

```css
/* AppSidebar.vue — banda de cajón */
@media (width <= 1024px) {
  .sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    width: min(280px, 86vw);
    z-index: var(--z-drawer);
    box-shadow: var(--shadow-modal);
    transform: translateX(-100%);
    transition: transform var(--transition-slow);
  }

  .sidebar.is-open {
    transform: none;
  }
}
```

`--z-drawer: 1400` **ya existe** en `tokens.css:350` y su propio comentario dice «cajón lateral, por
debajo del modal». El sistema de diseño anticipó esta pieza: **no hace falta ningún token nuevo.**
Y queda por debajo de `--z-modal: 1500`, así que un `ModalShell` abierto sigue tapando el cajón, que
es lo correcto.

El velo va **dentro de `AppSidebar.vue`**, como hermano anterior del `<aside>` (la raíz del SFC pasa
a ser un fragmento). Al ir antes en el DOM y compartir `z-index`, queda debajo sin necesidad de
`calc()` ni de un segundo token:

```html
<div v-if="isDrawerViewport && navOpen" class="nav-backdrop" @click="closeNav" />
<aside ref="asideEl" class="sidebar ds-stack" :class="{ 'is-open': navOpen }" …>
```

```css
.nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
  background: rgb(20 15 30 / 45%);
}
```

⚠️ **Único riesgo de stylelint de toda la ficha.** Este cuerpo se parece al `.overlay` de
`ModalShell.vue:267-276`. **No** es idéntico (aquel lleva `backdrop-filter`, `display: grid`,
`place-items`, `z-index: var(--z-modal)` y `font-family`), así que
`vetsoftware/no-duplicate-primitive` no debería saltar — pero **si salta, no se apaga con un
`stylelint-disable`**: se replantea con quien mantenga `primitives.css`. La regla mide cuerpos
normalizados, y forzarla es exactamente lo que FE-08 prohíbe.

**Sin bloqueo de scroll del cuerpo.** No hace falta y no se pone: tras §1.3 el documento ya no
scrollea. `overscroll-behavior: contain` en `.nav-groups` evita el encadenamiento del gesto.

### 4.3 El disparador, en `AppHeader.vue`

Primer hijo de `.topbar`, antes del `.spacer` (`AppHeader.vue:31`), alineado a la izquierda para el
pulgar:

```html
<button
  v-if="isDrawerViewport"
  ref="menuBtn"
  type="button"
  class="menu-btn"
  aria-label="Menú de navegación"
  aria-controls="app-nav"
  :aria-expanded="navOpen"
  @click="toggleNav"
>
  <component :is="ICONS.MENU" :size="18" />
</button>
```

**La etiqueta no cambia con el estado.** Es el patrón Disclosure del APG: el nombre describe el
control, `aria-expanded` describe el estado. Un `aria-label` que alterna «Abrir…»/«Cerrar…» duplica
la información y, en el instante del cambio, algunos lectores anuncian las dos cosas contradiciendo
al usuario.

`ICONS.MENU` **no existe todavía**: hay que añadir `Menu` al import de
`src/constants/icons.ts:1-60` y la entrada `MENU: Menu` junto a `CLOSE: X` (línea 117).
`ICONS.CLOSE` ya existe y se reutiliza para el botón de cierre del cajón.

---

## 5. Cómo se vuelve «más explicativo»

Todo con tokens que ya existen. **Cero cambios en `tokens.css` y en `primitives.css`.**

### 5.1 Rótulos: vuelven, y `.ds-sr-only` se retira de la navegación

Se eliminan los cinco `:class="{ 'ds-sr-only': isCompact }"`: `AppSidebar.vue:97` (hoja),
`AppSidebar.vue:113` (padre del acordeón), `AppSidebar.vue:141` (hija), `SidebarBrand.vue:29`
(marca) y `SidebarUserCard.vue:25` (identidad).
Con ellos se van los `useViewport()` de `SidebarBrand.vue:21` y `SidebarUserCard.vue:19`, y las tres
media queries de compacto: `SidebarBrand.vue:73-78` y `SidebarUserCard.vue:88-94`.

**Esto no es aflojar la accesibilidad, es que el problema desaparece.** `.ds-sr-only` estaba ahí
para dar nombre accesible a un enlace cuyo rótulo se ocultaba visualmente. En el cajón el rótulo es
visible, y con el cajón cerrado la navegación entera está fuera de pantalla (`transform` +
`v-if` del velo): no hay ningún enlace sin nombre en ningún estado. El patrón se retira **porque su
causa se retira**, y hay que decirlo en los comentarios, no borrarlos en silencio:
`AppSidebar.vue:53-61`, `viewport.store.ts:13-28`, `SidebarBrand.vue:13-15` y
`SidebarUserCard.vue:14-16` defienden todos esta decisión y **deben reescribirse en la misma
entrega**.

`.ds-sr-only` **sigue en `primitives.css` sin tocar**: tiene otros consumidores (`LabFormModal`,
ficha FE-14).

`:title` se **mantiene** en `.nav-item` (`AppSidebar.vue:93,109,137`), pero cambia de papel: ya no
sustituye al rótulo, es el respaldo de `.ds-truncate` (`primitives.css:758-762`) para el caso en que
un rótulo largo se corte en un cajón de 280 px estrechado por `86vw`.

### 5.2 Semántica de lista, que es la mayor ganancia por menos marcado

Hoy la navegación es un `<nav>` sin nombre (`AppSidebar.vue:69`) con `<div>`s y `<a>`s sueltos: un
lector de pantalla anuncia 26 enlaces en fila, sin decir cuántos hay ni a qué grupo pertenecen. Se
convierte en listas nombradas:

```html
<nav id="app-nav" class="nav-groups ds-stack" aria-label="Navegación principal">
  <div v-for="group in navGroups" :key="group.title" class="nav-group">
    <div :id="`navgrp-${group.title}`" class="nav-group-title">{{ group.title }}</div>
    <ul class="nav-list ds-stack" :aria-labelledby="`navgrp-${group.title}`">
      <li v-for="…">…</li>
    </ul>
  </div>
</nav>
```

Cuatro etiquetas de coste. A cambio: «lista Suscripciones, 5 elementos, elemento 3 de 5». Eso es
«explicativo» de verdad, y es lo que hoy no hay.

Los `<ul>`/`<li>` necesitan `list-style: none; margin: 0; padding: 0` en el `<style scoped>` — es
geometría, no color, así que va en el scoped sin conflicto con la trampa de especificidad de
`AGENTS.md:103-122`.

### 5.3 Títulos de grupo

Recuperan su forma normal de `AppSidebar.vue:176-182` en las dos bandas: `var(--text-caption)` (11 px),
`var(--weight-semibold)`, `var(--text-subtle)`, versalitas, `letter-spacing: .1em`.

**Se elimina el bloque `AppSidebar.vue:295-304`**, que en compacto los convertía en una raya de
32×1 px de `var(--border)`. Medido: `--border` (`--warm-200`) sobre `--surface` (`--warm-50`) da
**1,23:1**. Como esa raya era, en compacto, el **único** indicador de la frontera entre grupos —o
sea información, no decoración—, incumplía §1.4.11 Non-text Contrast (AA, 3:1) por un factor de 2,4.
Con el rótulo de vuelta el problema no se parchea: se disuelve. El rótulo mide **5,36:1**, holgado
sobre el 4,5:1 de §1.4.3 pese a sus 11 px.

### 5.4 Estado activo — hay un bug real que arreglar

Hoy el estado activo se apoya en tres señales, y **en tablet dos de las tres no llegan**:

| Señal | Escritorio | Tablet (hoy) |
|---|---|---|
| `aria-current="page"` (`AppSidebar.vue:92,136`) | ✔ | ✔ |
| Barra de 2 px `--amatista-700` (`AppSidebar.vue:213-221`) | ✔ 8,89:1 | ✘ **recortada** |
| Fondo `--amatista-100` (`AppSidebar.vue:143-147`) | ✔ | ✔ pero **1,17:1** |

**El recorte, con la geometría exacta.** `.nav-item.is-active::before` se coloca en `left: -16px`
(`AppSidebar.vue:216`), calibrado para el padding lateral de 16 px del sidebar de escritorio
(`AppSidebar.vue:161`), donde cae clavado en x=0. En compacto el padding baja a 10 px
(`AppSidebar.vue:291`) y el `align-items: center` (`AppSidebar.vue:292`) centra una lista de 44 px
en un cuadro de contenido de 51 px. El borde izquierdo del ítem queda a ~13,5 px del borde del
`<aside>`; la barra, 16 px más a la izquierda, aterriza en **x ≈ −2,5 px**. El desbordamiento hacia
el borde inicial **no** es región desplazable —solo lo es hacia el final—, así que `overflow-y: auto`
(`AppSidebar.vue:165`) la recorta por completo.

Queda entonces solo el lavado de fondo, y `--amatista-100` contra `--warm-50` mide **1,17:1**.
Un usuario en tablet **no puede ver en qué pantalla está**. Es §1.4.11 (AA) sobre un indicador de
estado, y de paso §1.4.1 Use of Color, porque a esa distancia de luminancia lo único que queda es
el matiz.

**Arreglo, que sirve para las dos bandas:** anclar la barra **dentro** del ítem, para que no dependa
nunca del padding del contenedor.

```css
.nav-item.is-active::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;      /* ← era left: -16px */
  inset-block: var(--space-4);
  width: 2px;
  border-radius: 2px;
  background: var(--amatista-700);
}
```

Y `.nav-item` sube su `padding-inline-start` de `var(--space-12)` a `var(--space-16)` para que la
barra no pise el icono. La misma regla se aplica al `.nav-item-parent` cuando `isChildActive` es
cierto (hoy solo cambia el fondo): así el padre de la rama activa también se señala.

Con eso, el activo lleva **cuatro** señales redundantes y ninguna carga sola: `aria-current`, barra a
8,89:1 sobre el fondo del propio ítem activo **7,61:1**, `--weight-semibold` (§1.4.1: la señal no es
solo color) y el fondo como refuerzo decorativo.

### 5.5 Jerarquía padre/hijo

- **El chevron vuelve.** `AppSidebar.vue:319-321` lo mataba con `display: none` en compacto, dejando
  el acordeón sin ninguna señal visible de que era desplegable —solo `aria-expanded`, invisible para
  quien ve—. En el cajón el chevron se muestra siempre y conserva su giro de 180° al abrir
  (`AppSidebar.vue:241-249`).
- **Indentación:** `margin-inline-start: var(--space-18)` + `padding-inline-start: var(--space-10)`
  en `.nav-sublist` (`AppSidebar.vue:251-256`), sin el `align-items: center` de compacto
  (`AppSidebar.vue:323-328`), que se elimina.
- **Tipografía:** padre `var(--text-body)` (13 px); hijo `var(--text-xs)` (12 px) con
  `var(--text-muted)` — medido **7,24:1**, holgado.
- **La línea vertical de `.nav-sublist` (`border-left: 1px solid var(--border)`) se conserva pero
  NO es la señal.** Mide 1,23:1: es decoración y hay que tratarla como tal. La subordinación la
  llevan la indentación de 18 px, el tamaño de letra y el icono más pequeño (13 px frente a 15).
  **No subas `--border`**: es un token gemelo TR-02 usado en todo el sistema, y cambiarlo por este
  motivo repintaría los dos fronts enteros.

### 5.6 Objetivos táctiles

§2.5.8 Target Size (Minimum) es **24×24 px CSS** en AA; 44×44 es la cifra de comodidad, no la norma.
En el cajón se adopta **44 px de altura para toda fila pulsable**, sin excepción para los hijos: la
jerarquía la llevan la indentación y el tamaño de letra, no una fila más baja. Simplifica la
implementación y elimina la única decisión de diseño que quedaría abierta.

| Elemento | Hoy | Especificado (`<= 1024px`) |
|---|---|---|
| `.nav-item` hoja | 44×38 (`AppSidebar.vue:306-312`) | ancho completo × `min-height: 44px` |
| `.nav-item-parent` | 44×38 | ancho completo × `min-height: 44px` |
| `.nav-subitem` | 44×34 (`AppSidebar.vue:314-317`) | ancho completo × `min-height: 44px` |
| Hamburguesa | — | 44×44 |
| `.bell-btn` | 34×34 (`AppHeader.vue:59-60`) | 44×44 |
| Cerrar cajón | — | 44×44 |
| `.logout-btn` | **22×22** (`SidebarUserCard.vue:72-84`) | 44×44 |

Sobre `.logout-btn`: `padding: var(--space-4)` alrededor de un icono de 14 px da **22×22 px**, por
debajo del suelo de 24×24. **Con precisión: es probable que salve el criterio por la excepción de
espaciado de §2.5.8** —no hay otro objetivo lo bastante cerca como para que los círculos de 24 px se
crucen—, así que no lo doy por incumplimiento firme. Lo que sí es firme: es el control de **cerrar
sesión**, a 22 px, en una pantalla táctil, pegado a una tarjeta. Se lleva a 44×44 en la banda de
cajón y a 32×32 en escritorio. Quien implemente puede verificarlo con `axe` o midiendo el
`getBoundingClientRect()`; **yo no lo he ejecutado.**

---

## 6. Accesibilidad y teclado

### 6.1 El cajón es modal, y por qué

Lleva velo, así que el contenido de detrás está atenuado y es inoperable. Si el foco pudiera salir
del cajón, iría a parar a controles que el usuario no puede activar y cuyo orden de recorrido ya no
corresponde a lo que ve: **§2.4.3 Focus Order (A)**, y el patrón Dialog (Modal) del APG, que exige
la retención del foco. Por tanto: velo + trampa de foco + `aria-modal`.

*Precisión deliberada:* **no** se invoca aquí §2.4.11 Focus Not Obscured (Minimum). Su texto
normativo exige que el componente enfocado no quede *entirely hidden* por contenido de autor
(verificado en el Understanding del W3C, 2026-08-26), y un velo translúcido al 45 % atenúa pero no
oculta del todo. El mismo documento añade que «a properly constructed modal dialog will always pass
this SC». Citarlo sería inflar el argumento; **§2.4.3 basta y es el criterio correcto**.

Solo en la banda de cajón. Por encima de 1024 el `<aside>` es una región persistente y **no** debe
llevar `role="dialog"` ni `aria-modal`:

```html
<aside
  ref="asideEl"
  class="sidebar ds-stack"
  :class="{ 'is-open': navOpen }"
  :role="isDrawerViewport ? 'dialog' : undefined"
  :aria-modal="isDrawerViewport ? 'true' : undefined"
  :aria-label="isDrawerViewport ? 'Navegación principal' : undefined"
  @keydown.capture="navFocus.onTrapTab"
>
```

Que el rol cambie al redimensionar es correcto: la naturaleza del widget cambia de verdad.

### 6.2 La trampa de foco **ya existe** — no escribas otra

`src/composables/useModalFocus.ts` implementa `onTrapTab`, captura del disparador y cadena de
devolución de foco. **Es gemelo TR-02** (`useModalFocus.ts:5-8`): el implementador de features
**no puede editarlo**. No hace falta: su API es genérica y se consume tal cual, con cero cambios.

```ts
const navFocus = useModalFocus({
  cardEl: asideEl,               // el <aside>
  closeBtn: drawerCloseBtn,      // la X del cajón
  getInitialFocus: () => undefined,   // cae en closeBtn
  getReturnFocusTo: () => '.menu-btn',
})
```

`onTrapTab` se engancha con `@keydown.capture` **en el `<aside>`, nunca en `window`** — es el mismo
criterio, y por el mismo motivo, que `ModalShell.vue:188` (`useModalFocus.ts:38-46`).

### 6.3 Escape, y su convivencia con `ModalShell`

`ModalShell` escucha Escape en `window` y hace `preventDefault()` (`ModalShell.vue:124-132`). El
cajón necesita su propio listener, y **debe cederle el turno a cualquier diálogo abierto**. Sin
acoplarse a `useModalLayer` (otro fichero compartido), una línea basta:

```ts
function onEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !navOpen.value) return
  if (document.querySelector('[aria-modal="true"][role="dialog"], [aria-modal="true"][role="alertdialog"]')) return
  e.preventDefault()
  closeNav()
}
```

*(el `querySelector` no se choca con el propio cajón: sus atributos `role`/`aria-modal` solo existen
en la banda de cajón, y si el cajón está abierto y hay además un modal, manda el modal.)*

### 6.4 Resto del contrato de teclado y ARIA

| Requisito | Dónde | Criterio |
|---|---|---|
| `aria-expanded` en la hamburguesa | `AppHeader.vue`, nuevo | §4.1.2 · APG Disclosure |
| `aria-controls="app-nav"` apuntando al `<nav id="app-nav">` | `AppHeader.vue` / `AppSidebar.vue:69` | APG Disclosure |
| `aria-expanded` en el padre del acordeón | ya está, `AppSidebar.vue:108` — **conservar** | §4.1.2 |
| `aria-current="page"` en hoja e hija | ya está, `AppSidebar.vue:92,136` — **conservar** | §4.1.2 |
| `aria-label="Navegación principal"` en el `<nav>` | `AppSidebar.vue:69`, hoy **sin nombre** | §1.3.1 · landmark nombrado |
| Foco inicial al abrir → botón de cierre del cajón | `useNavDrawer` | APG Dialog |
| Foco de vuelta a la hamburguesa al cerrar | `getReturnFocusTo` | §2.4.3 · APG Dialog |
| Cerrar al navegar (`router.afterEach`) + devolver foco | `useNavDrawer` | evita que el cajón tape la pantalla recién abierta |
| Cerrar al pasar a `>= 1025px` estando abierto | `useNavDrawer`, observando `isDrawerViewport` | evita un `role="dialog"` huérfano |
| Anillo de foco visible en cada fila | añadir `.ds-focus-ring` (`primitives.css:1033-1038`) a `.nav-item` | §2.4.7 (AA) |
| El cajón cerrado no es tabulable | `transform: translateX(-100%)` **no basta** | §2.4.3 |

**Ese último punto es el más fácil de fallar.** Un panel movido con `transform` sigue en el flujo y
sus enlaces **siguen recibiendo Tab**: un usuario de teclado en tablet tabularía por 26 enlaces
invisibles fuera de pantalla. Se resuelve con `inert` en el `<aside>` cuando el cajón está cerrado:

```html
:inert="isDrawerViewport && !navOpen"
```

`inert` es atributo HTML nativo, soportado desde Chrome 102 / Safari 15.5 / Firefox 112, y Vue 3.5
lo enlaza como atributo booleano sin nada extra. **Es obligatorio, no una mejora.**

### 6.5 Movimiento

`transition: transform var(--transition-slow)` (0,18 s) queda cubierto por la guarda global de
`prefers-reduced-motion` de `base.css:108-119`, que ya apaga toda transición con `!important`. **No
añadas una guarda local**: sería duplicar el guardián y `declaration-no-important` no lo dejaría
pasar sin un `stylelint-disable` que no tiene justificación.

---

## 7. Ficheros a tocar

### 7.1 Los que puede tocar el implementador de features

| # | Fichero | Qué cambia |
|---|---|---|
| 1 | `src/components/layout/AppLayout.vue` | Shell `height: 100dvh` + `overflow: hidden`; `.app-main` `min-height: 0`; `.app-content` `min-height: 0`; `<main>` baja a `.app-content` con `id="contenido" tabindex="-1"` y `.app-main` pasa a `<div>`; enlace de salto; `grid-template-columns: 1fr` en `<= 1024px` (sustituye el `72px 1fr` de la línea 49) |
| 2 | `src/components/layout/AppSidebar.vue` | Velo + `is-open` + `inert` + `role`/`aria-modal`/`aria-label` condicionales; botón de cierre; `<ul>`/`<li>` con `aria-labelledby`; retirar los tres `.ds-sr-only` (97, 113, 141); `::before` a `inset-inline-start: 0`; filas de 44 px; scroll de `.sidebar` → `.nav-groups`; sustituir el bloque `@media` (289-329) entero; **reescribir el comentario 53-61** |
| 3 | `src/components/layout/AppHeader.vue` | Botón hamburguesa como primer hijo de `.topbar`; `.bell-btn` a 44×44 en `<= 1024px` |
| 4 | `src/components/layout/SidebarBrand.vue` | Fuera `useViewport` (21), fuera `.ds-sr-only` (29), fuera el `@media` (73-78); reescribir el comentario 13-15 |
| 5 | `src/components/layout/SidebarUserCard.vue` | Fuera `useViewport` (19), fuera `.ds-sr-only` (25), fuera el `@media` (88-94); `.logout-btn` a 44×44 en cajón / 32×32 en escritorio; reescribir el comentario 14-16 |
| 6 | `src/stores/viewport.store.ts` | `isCompact` → `isDrawerViewport`; añadir `navOpen` + `openNav`/`closeNav`/`toggleNav`; **reescribir el bloque 13-28** |
| 7 | `src/composables/useViewport.ts` | Exponer lo nuevo. `COMPACT_MAX_WIDTH` **no cambia de valor** |
| 8 | `src/composables/useNavDrawer.ts` | **NUEVO.** Escape (con cesión al modal), `router.afterEach`, cierre al cruzar a escritorio, cableado de `useModalFocus`. Aquí, y no en el SFC, para no acercarse a `maxSfcLines: 500` |
| 9 | `src/constants/icons.ts` | `import { Menu }` (bloque 1-60) + `MENU: Menu` junto a `CLOSE: X` (117) |

**Estado global en Pinia, no en el composable.** `navOpen` lo comparten `AppHeader` y `AppSidebar`,
que son hermanos: un `ref()` de ámbito de módulo dentro de `useNavDrawer.ts` está **prohibido** por
la norma del repo. `useNavDrawer` orquesta; el estado vive en el store.

### 7.2 Paridad TR-02 — **el implementador de features NO toca ninguno**

| Fichero | Veredicto |
|---|---|
| `src/assets/styles/tokens.css` | **Cero cambios.** `--z-drawer: 1400` (350), `--shadow-modal` (272), `--transition-slow` (318) y toda la escala de espaciado y tipografía ya existen |
| `src/assets/styles/primitives.css` | **Cero cambios.** `.ds-sr-only` (1591) se queda para sus otros consumidores; `.ds-stack` (942), `.ds-truncate` (758), `.ds-flex-fill` (764) y `.ds-focus-ring` (1033) se **consumen**. No se crea primitiva nueva: el cajón es una pieza única, no un patrón repetido |
| `src/assets/styles/base.css` | **Cero cambios.** `html, body, #app { height: 100% }` (32-43) está bien y **no** es la causa del doble scroll. La guarda de `prefers-reduced-motion` (108-119) ya cubre el cajón |
| `src/composables/useModalFocus.ts` | **Cero cambios. Se consume, no se edita** (gemelo declarado en 5-8) |
| `src/assets/styles/app.css` | **Cero cambios.** Verificado: Vuetify ya emite `min-height: 100dvh` en `.v-application__wrap` |
| `docs/ux/README.md`, `docs/ux/reglas-de-interfaz.md` | **Cero cambios.** Gemelos byte a byte |

**Que la lista de paridad esté vacía es el resultado, no la casualidad**: se eligió el patrón que
cabe entero dentro de la capa de features.

### 7.3 Fuera del alcance de features (los hace `front-e2e-visual`)

| Fichero | Qué |
|---|---|
| `tests/unit/shell-scroll.spec.ts` | **NUEVO.** Guarda del §1.3, con la misma técnica que `tests/unit/app-table-scroll.spec.ts` (leer el `<style scoped>` y afirmar sobre las reglas). Cuatro afirmaciones: `.app-shell` **no** declara `min-height` y **sí** `overflow: hidden`; `.app-content` declara `min-height: 0`; `.sidebar` **no** declara `overflow-y`; `.nav-groups` **sí** |
| `tests/unit/sidebar-nav-a11y.spec.ts` | **NUEVO.** `<nav>` con `aria-label`; cada `<ul>` con `aria-labelledby` existente; `inert` cuando el cajón está cerrado; `aria-expanded` en la hamburguesa |
| `tests/unit/sidebar-sin-cifras-inventadas.spec.ts` | Revisar: afirma sobre el marcado del sidebar, que cambia |
| `visual/` | Capturas nuevas a 768×1024 y 1024×768, cajón cerrado y abierto |

---

## 8. Criterios de aceptación

Verificables en 768×1024 y 1024×768, `deviceScaleFactor: 1`. Marcados **[no ejecutado]** porque
esta ficha es análisis y diseño: no se levantó el servidor ni se corrió ninguna suite.

**Scroll**

1. `document.scrollingElement.scrollHeight === document.scrollingElement.clientHeight` en toda vista
   de listado, con y sin cajón abierto. Cero scroll de documento.
2. `document.documentElement.scrollWidth <= window.innerWidth` en las dos orientaciones: cero
   desbordamiento horizontal.
3. Con el cajón cerrado, exactamente **un** contenedor de scroll vertical en el árbol, y es
   `main#contenido`.
4. Con el cajón abierto, dos como mucho: `main#contenido` y `.nav-groups`, y este último solo si la
   navegación con «Catálogos clínicos» desplegado no cabe en el alto.
5. Al desplazar un listado largo, `AppHeader` **no** se mueve.
6. En Safari de iPadOS con la barra de herramientas visible, el shell no ofrece scroll de documento
   (el criterio que `100vh` incumplía).

**Rótulos y legibilidad**

7. Cajón abierto: las 15 entradas de primer nivel muestran su texto completo, sin elipsis, a 280 px.
8. Ningún elemento de la navegación lleva `.ds-sr-only` en ningún estado.
9. Los 4 títulos de grupo son legibles (11 px, `--text-subtle`, ≥ 4,5:1 medido: 5,36:1).
10. `axe-core` sin violaciones sobre el armazón, con el cajón abierto y cerrado. **Reglas mínimas:**
    `region`, `landmark-unique`, `aria-required-attr`, `aria-valid-attr-value`, `color-contrast`,
    `nested-interactive`, `list`, `listitem`.

**Estado y orientación**

11. Con la ruta `/catalogos-clinicos/tipos-vacuna`, dentro del cajón: la hija lleva
    `aria-current="page"`, su barra de 2 px es **visible y no recortada**, y el padre «Catálogos
    clínicos» aparece expandido y marcado como rama activa.
12. La barra activa mide ≥ 3:1 contra el fondo del ítem activo (calculado: 7,61:1).

**Teclado y foco**

13. Cajón cerrado: `Tab` desde la hamburguesa lleva al primer control de la cabecera, **nunca** a un
    enlace de navegación (comprobación de `inert`).
14. Al abrir, el foco cae en el botón de cierre del cajón.
15. `Tab` y `Shift+Tab` recorren en ciclo dentro del cajón; el foco no sale al contenido tapado.
16. `Escape` cierra el cajón y devuelve el foco a la hamburguesa.
17. Navegar a otra entrada cierra el cajón y deja el foco en un sitio razonable, no en `<body>`.
18. Con un `ModalShell` abierto sobre el cajón, `Escape` cierra **el modal** y deja el cajón como
    estaba.
19. El enlace de salto aparece al primer `Tab` desde la carga y mueve el foco a `main#contenido`
    (`document.activeElement.id === 'contenido'`).
20. Toda fila de navegación muestra el anillo de foco al llegar por teclado.

**Táctil**

21. Toda fila del cajón tiene `getBoundingClientRect().height >= 44`.
22. Hamburguesa, campana, cierre del cajón y cerrar sesión: ≥ 44×44 en la banda de cajón.
23. Tocar el velo cierra el cajón; tocar dentro del cajón no lo cierra.

**Puertas del repo**

24. `npm run quality` en verde — incluye `stylelint:strict` con
    `vetsoftware/no-duplicate-primitive` y `declaration-no-important`, y `css:budget`.
25. `css:budget` sin subir ni un techo de `scripts/css-budget.config.json`
    (`maxSfcLines: 500`, `maxOversizedSfc: 0`, `maxStyleMinusScript: 0`, `maxDuplicateGroups: 0`).
    Es un trinquete: los números solo bajan. **`AppSidebar.vue` está hoy en 330 líneas y es el
    riesgo real**; si el cajón lo acerca a 500, la salida es sacar más lógica a
    `useNavDrawer.ts`, **jamás** subir el techo.

---

## 9. Lo que esta ficha NO resuelve

- **No hay ninguna puerta de accesibilidad automatizada en el repo** — ni `axe-core`, ni
  `eslint-plugin-vuejs-accessibility`, ni Lighthouse. El criterio 10 de arriba **no se puede
  ejecutar hoy**. Está abierto en admin-web #44 y public-web #57, y es el mayor agujero del
  proyecto en esta materia.
- **El mismo diseño de compacto vive en el front del tenant** (`VetSoftwarePublicFront`), que además
  lo tapa con `:title` — el parche que `AppSidebar.vue:59-60` critica. Esta ficha **no** lo cubre:
  es otro repo y otra tarea.
- **Contraste de fondos decorativos.** `--amatista-100` (1,17:1) y `--border` (1,23:1) se dejan
  como están porque, tras §5.4 y §5.5, dejan de portar información. Si algún día se apoya un estado
  solo en ellos, vuelve a ser incumplimiento.
- **Qué se verificó contra la norma viva y qué no.** Se consultaron el 2026-08-26 los Understanding
  del W3C de **§2.5.8 Target Size (Minimum)** —confirmados el suelo de 24×24 px CSS, el nivel AA y
  la redacción literal de la excepción de espaciado: «if a 24 CSS pixel diameter circle is centered
  on the bounding box of each, the circles do not intersect another target»— y de **§2.4.11 Focus
  Not Obscured (Minimum)**, que corrigió un borrador anterior de esta ficha (ver §6.1). El resto de
  criterios citados (§1.3.1, §1.4.1, §1.4.3, §1.4.11, §2.4.1, §2.4.3, §2.4.7, §4.1.2) **no se
  contrastaron con una consulta en este turno**.
- **Nada se midió en navegador.** Todos los ratios de esta ficha son **calculados** desde
  `tokens.css` con la fórmula de luminancia relativa de WCAG 2.x (OKLCH → sRGB), no leídos de
  DevTools. Las geometrías (22×22 px del cerrar sesión, x ≈ −2,5 px de la barra recortada) son
  **derivadas del CSS**, no medidas con `getBoundingClientRect()`.
