# Catálogos clínicos y de animales de la consola — auditoría de las doce pantallas gemelas

> **Alcance.** `/catalogos-clinicos/medicamentos` (+ `/:id` y `/plataforma`), `tipos-consulta`,
> `tipos-vacuna`, `tipos-cirugia`, `tipos-laboratorio`, `tipos-imagen`, `tipos-spa` (cada uno con su
> `/:id`), y `/animales/especies`, `/animales/razas`, `/animales/colores` (cada uno con su `/:id`).
> **23 rutas, 12 familias.**
>
> **Método.** Se miraron las capturas de `_capturas/admin/<viewport>/<slug>__<estado>.png` en los
> cinco viewports, y se leyó el código del worktree `MainVetSoftware-uxaudit/admin-web`
> (`audit/ux-screens-admin`, f9ec359). **No se ejecutó nada**: ni dev server, ni Playwright, ni
> `quality`, ni `ds:audit` — había una pasada de capturas corriendo en el mismo árbol.
>
> **Autoridad.** `../public-web/docs/ux/uxa-rubrica-maquetacion.md` (escala de severidad §4 y
> umbrales §3), `docs/ux/patron-de-busqueda-en-listado.md`, `docs/ux/patron-de-mensajes.md`,
> `docs/ux/reglas-de-interfaz.md`, `docs/ux/armazon-tablet-especificacion.md` §3 (la consola solo
> promete 768 px hacia arriba → un defecto de disposición a 390 px es `nota`).
>
> **Lo sistémico no es de este informe.** El armazón y el catálogo `App*` están auditados en
> `docs/ux/uxa-armazon-y-primitivas-admin.md`; aquí solo se citan sus fichas con el alcance que
> tienen **dentro de estas doce pantallas**.

---

## 0 · El veredicto de conjunto, antes de los hallazgos

**Estas doce pantallas están mucho mejor de lo que el encargo suponía.** La ficha F3 de
`patron-de-busqueda-en-listado.md` **ya está implementada**: existe
`src/components/ui/AppListSearch.vue` (etiqueta asociada, `type="search"`, icono con `aria-hidden`,
rebote de 300 ms, Enter sin recargar, Escape que limpia, botón de limpiar de 24×24 px y región viva
`role="status"` con el recuento retardado), y **las doce lo montan**. La distinción entre *vacío de
búsqueda* y *vacío de verdad* de §4 está en las doce, con textos propios por entidad y con el botón
de crear solo en la rama correcta. El `<h1>` está en las 23 rutas (`conteos.h1 = 1` en las 161
mediciones de estas rutas).

Y las métricas ya tomadas no aportan ni un hallazgo nuevo aquí:

| Métrica | Resultado en mis 23 rutas × 7 viewports |
|---|---|
| `documento.desbordaHorizontal` | **0** en todas |
| `desalineaciones` | **0** en todas |
| `textoDesbordadoSinElipsis` / `solapamientos` / `imagenesRotas` / `imagenesDeformadas` | **0** en todas |
| `objetivosPequenos` | 1 por pantalla, siempre `input.ds-flex-fill` (307×19,5) dentro de un envoltorio de 360×41,5 → **falso positivo conocido** |
| `espaciadoFueraDeEscala` | 3 por pantalla, siempre `ul.nav-list` y `div.brand-sub` → **del armazón, no de estas vistas** |
| `scrollers` | 2 siempre: `nav#app-nav` y `main#contenido` → **del armazón** |

**El valor de este informe está donde el encargo lo puso: en qué se contradicen entre sí.** Nueve de
los doce hallazgos son divergencias entre pantallas que deberían ser la misma, y el más grave no se
ve en ninguna captura: está en el camino de error de la ficha `/:id`.

---

## 1 · Hallazgos

### H01 · [bloqueante] Si la ficha `/:id` no consigue releer el registro, se queda con el ANTERIOR y guardar lo escribe en el registro equivocado

`src/features/consultation-types/composables/useConsultationTypes.ts:36-47` ·
`src/features/consultation-types/views/ConsultationTypeDetailView.vue:81-92`
(patrón idéntico en 9 composables y 9 vistas — lista completa abajo)

```ts
// useConsultationTypes.ts:36-47
async function fetchById(id: number) {
  store.setLoading(true)
  try {
    const data = await consultationTypesApi.findById(id)
    store.setSelected(data)
  } catch (e) {
    errorFrom('Tipo de consulta no encontrado', e)   // ← solo un toast
  } finally {
    store.setLoading(false)
  }
}
```

```html
<!-- ConsultationTypeDetailView.vue:90 -->
<section v-if="selected" class="ds-card ds-detail-card"> … </section>
<!-- no hay v-else, ni rama de error, ni rama de carga -->
```

**Criterio:** NN/g H1 (visibilidad del estado del sistema) y H5 (prevención de errores) ·
`docs/ux/reglas-de-interfaz.md` R05 (el error se pinta, arrastra su traza y ofrece reintentar) ·
`docs/ux/patron-de-mensajes.md` §2 (*«¿el mensaje sigue siendo verdad treinta segundos después?»* →
banner, no toast) · prioridad de producto declarada en el brief: **que no se pierda trabajo**.

**Impacto.** `selected` vive en el store Pinia que fabrica `src/stores/createCatalogStore.ts` y
**nunca se pone a `null`**: solo se escribe en el camino feliz (`setSelected(data)`). Entonces:

1. El usuario abre la ficha del registro **A**, pulsa «Volver», y abre la ficha del registro **B**.
2. `onMounted(() => fetchById(B))` arranca. `PageLoader`
   (`src/components/feedback/PageLoader.vue`, velo fijo a pantalla completa) tapa la pantalla
   mientras la petición está en vuelo, así que el paso intermedio no se ve. Hasta aquí, bien.
3. **La petición de B falla** — 404 porque otro administrador acaba de borrarlo, 500, o red caída.
   El `catch` lanza un toast que se va en segundos y **no toca `selected`**.
4. El velo se retira. `v-if="selected"` sigue siendo verdadero **con los datos de A**. La pantalla es
   **indistinguible de una carga correcta**: mismo título «Editar tipo de consulta», mismo formulario
   relleno, mismo botón «Guardar» activo.
5. El usuario edita y guarda. `handleSave` hace `update(Number(props.id), data)` — es decir,
   **escribe los valores de A dentro del registro B**.

No hay ninguna señal de que algo fue mal más allá de un toast que ya desapareció. Es
silenciosamente destructivo sobre un catálogo maestro de plataforma que consumen todas las clínicas.

**Alcance — 9 ficheros idénticos, más el de tipos de consulta que se cita arriba:**

| Vista | Composable |
|---|---|
| `features/consultation-types/views/ConsultationTypeDetailView.vue` | `useConsultationTypes.ts:36` |
| `features/vaccination-types/views/VaccinationTypeDetailView.vue` | `useVaccinationTypes.ts` |
| `features/surgery-types/views/SurgeryTypeDetailView.vue` | `useSurgeryTypes.ts` |
| `features/laboratory-test-types/views/LaboratoryTestTypeDetailView.vue` | `useLaboratoryTestTypes.ts:43` |
| `features/diagnostic-imaging-types/views/DiagnosticImagingTypeDetailView.vue` | `useDiagnosticImagingTypes.ts:43` |
| `features/spa-types/views/SpaTypeDetailView.vue` | `useSpaTypes.ts` |
| `features/species/views/SpecieDetailView.vue` | `useSpecies.ts` |
| `features/breeds/views/BreedDetailView.vue` | `useBreeds.ts:38` |
| `features/animal-colors/views/AnimalColorDetailView.vue` | `useAnimalColors.ts:63` |

Verificado con `grep -c 'v-if="selected"'` → 1 y `grep -c 'v-else'` → 0 en las nueve.
**`MedicamentDetailView.vue` está exento** y es la prueba de que la casa sabe hacerlo: como el
backend no ofrece releer un medicamento por identificador, su `v-else` pinta un `AppEmptyState` que
lo dice con todas las letras (`MedicamentDetailView.vue:88-99`, capturado en
`escritorio/catalogos-clinicos-medicamentos-1__lleno.png`).

**Arreglo — el patrón correcto ya está escrito en este repo**, en
`src/features/limits/composables/useLimitDimensionRecord.ts:29-49`. Se copia tal cual:

1. En el composable, dentro de `fetchById`:
   - antes del `await`: `store.setError(null)` y `store.setSelected(null)`;
   - en el `catch`: `store.setSelected(null)` **primero**, luego
     `store.setError(getProblemDetailMessage(e, '<mensaje propio>'), getTraceId(e) ?? null)`, y
     después el `errorFrom` que ya está (no se retira: quitar la realimentación existente en el
     mismo PR que se añade la nueva es una pérdida neta — el propio `fetchAll` de estos composables
     ya lo razona así por EST-06);
   - exponer `clear()` y llamarlo en `onUnmounted` de la vista.
2. En cada una de las nueve vistas, tres ramas en vez de una, **en este orden** (R05: el error se
   pinta antes que el vacío):
   ```html
   <p v-if="error" class="ds-banner ds-banner--error" role="alert">
     <component :is="ICONS.ERROR" :size="14" class="ds-banner-icon" />
     <span class="ds-flex-fill">{{ error }}</span>
     <span v-if="errorTraceId" class="ds-meta">{{ errorTraceId }}</span>
     <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="fetchById(Number(id))">
       <component :is="ICONS.RETRY" :size="13" />
       Reintentar
     </button>
   </p>
   <section v-else-if="selected" class="ds-card ds-detail-card"> … </section>
   <AppEmptyState
     v-else-if="!loading"
     title="Ese registro ya no está"
     description="Puede haberse eliminado desde otra sesión. Vuelve al listado para comprobarlo."
   >
     <RouterLink :to="{ name: ROUTE_NAMES.CONSULTATION_TYPES_LIST }" class="ds-btn ds-btn--primary">
       Volver al listado
     </RouterLink>
   </AppEmptyState>
   ```
   Cero CSS nuevo: `ds-banner`, `ds-banner--error`, `ds-banner-icon`, `ds-flex-fill`, `ds-meta`,
   `ds-btn*` y `AppEmptyState` ya existen y ya se usan en `AnimalColorsListView.vue:165-172` con
   exactamente esa forma.
3. Añadir `watch(() => props.id, (v) => fetchById(Number(v)))` junto al `onMounted`: `App.vue:10`
   monta un `<RouterView />` **sin `:key`**, así que una navegación ficha→ficha con el mismo nombre
   de ruta reutiliza el componente y `onMounted` no vuelve a dispararse.

**Ejecuta:** `front-feature`. **Verifica:** `front-e2e-visual` — un spec que intercepte
`GET /consultation-types/{id}` con 404 tras haber visitado otra ficha y afirme que (a) **no** hay un
`<form>` relleno en pantalla y (b) el nombre accesible del banner de error existe.

**Evidencia visual: ninguna.** El arnés de capturas siempre sirvió el camino feliz
(`escritorio/catalogos-clinicos-tipos-vacuna-1__vacio.png` muestra la ficha correcta). **Este
hallazgo se dictamina leyendo el código, no observando la pantalla**, y se declara así.

---

### H02 · [grave] Diez de los doce listados nombran «Editar» y «Eliminar» a secas, y el arreglo ya está escrito treinta líneas más allá

`src/features/consultation-types/views/ConsultationTypesListView.vue:141,148` y sus nueve gemelas
· contra `src/features/medicaments/views/MedicamentsListView.vue:427,435`

**Instancia de H02 de `docs/ux/uxa-armazon-y-primitivas-admin.md`** (R04 nunca censado en la
consola). Lo que añade este informe es **dónde se ve y cuánto molesta**, más el hecho —nuevo— de que
la corrección ya existe en el mismo directorio y no se propagó.

```html
<!-- ConsultationTypesListView.vue:139-149 — diez pantallas -->
<RouterLink :to="…" class="ds-icon-btn" aria-label="Editar">
<button type="button" class="ds-icon-btn ds-icon-btn--danger" aria-label="Eliminar">

<!-- MedicamentsListView.vue:427,435 — una pantalla, con el sujeto de la fila -->
<RouterLink :to="…" class="ds-icon-btn" :aria-label="`Editar ${m.name}`">
<button type="button" class="ds-icon-btn ds-icon-btn--danger" :aria-label="`Pausar ${m.name}`">
```

**Criterio:** WCAG 2.2 §2.4.6 Headings and Labels (AA) y §4.1.2 Name, Role, Value (A) ·
`reglas-de-interfaz.md` R04.

**Impacto.** En `escritorio/catalogos-clinicos-tipos-consulta__lleno.png` se cuentan **25 filas × 2
botones = 50 controles**, de los cuales 25 se llaman «Editar» y 25 «Eliminar». Quien navega por
teclado o con lector de pantalla tiene una lista de cincuenta controles con dos nombres. El de
eliminar además es destructivo: el `useConfirmDialog` sí cita el nombre
(`¿Eliminar el tipo de consulta "${name}"?`), pero **la decisión de pulsar ya se tomó a ciegas**.
Alcance en este bloque: 10 pantallas × hasta 2×n filas. Con los ~137 registros que el arnés simula
en medicamentos, un catálogo real de razas o colores pasa fácil de 200 controles homónimos.

**Arreglo:** en las diez, sustituir por `:aria-label="`Editar ${x.name}`"` y
`:aria-label="`Eliminar ${x.name}`"`. Es una línea por botón y el texto ya está en el `v-for`.
Vistas: `ConsultationTypesListView.vue`, `VaccinationTypesListView.vue`, `SurgeryTypesListView.vue`,
`LaboratoryTestTypesListView.vue`, `DiagnosticImagingTypesListView.vue`, `SpaTypesListView.vue`,
`SpeciesListView.vue`, `BreedsListView.vue`, `AnimalColorsListView.vue` (y `MedicamentsPlatformView`
no tiene acciones, correcto).

**Ejecuta:** `front-feature`, en el mismo lote que H01 (tocan los mismos ficheros).

---

### H03 · [grave] La región de desplazamiento de la tabla no se puede desplazar con teclado, y a 390 px eso deja la columna de acciones inalcanzable

`src/components/ui/AppTable.vue:130` — `<div class="ds-table-scroll tabla-scroll">`, sin
`tabindex="0"`, sin `role="region"` y sin nombre accesible.

**Instancia de H03 del informe sistémico y del issue nº 4 ya redactado en
`docs/ux/reglas-de-interfaz.md:1324`.** No consume cupo de hallazgo nuevo (rúbrica §4, regla de
aplicación 2); se cita porque **en este bloque tiene una manifestación visible** y porque es el único
punto donde la exención de los 390 px **no** aplica.

**Criterio:** WCAG 2.2 §2.1.1 Keyboard (**nivel A**) · regla `scrollable-region-focusable` de
axe-core. La rúbrica §2.3 exime los defectos de *disposición* a 390 px en la consola, pero deja fuera
de la exención lo que «haga perder trabajo o incumpla un criterio A/AA». Esto es A.

**Impacto.** `movil/animales-colores__lleno.png` (390×2969): la tabla se recorta en el borde derecho
del contenedor — el encabezado se lee «ACCIO…» y de las dos acciones por fila **solo se ve el lápiz;
el botón de eliminar queda fuera**. Con ratón o dedo se arrastra y aparece; con teclado no, porque el
contenedor no es enfocable y no hay nada tabulable a su derecha que lo empuje. Lo mismo en
`movil/animales-razas__lleno.png`. En 1024, 1280 y 1440 no ocurre (verificado en
`tablet-h/catalogos-clinicos-medicamentos__lleno.png`).

**Arreglo (en la primitiva, una vez, y sirve para las 17 tablas de la consola):** en
`AppTable.vue:130`, `tabindex="0"`, `role="region"` y `:aria-label` derivado del `caption`/título de
la vista. Es exactamente lo que el issue nº 4 ya propone.

**Ejecuta:** `front-feature`. **Nota:** no es gemelo TR-02 — `AppTable` solo existe en la consola.

---

### H04 · [menor] Dos pies de listado distintos para el mismo trabajo: barra de paginación en dos pantallas, párrafo suelto en diez

`src/components/ui/AppPagination.vue` (2 consumidores en este bloque) frente a
`ConsultationTypesListView.vue:162-164` y sus nueve gemelas.

**Criterio:** NN/g H4 (consistencia y estándares) · `patron-de-busqueda-en-listado.md` §3, regla 2
(el rango se refiere a lo filtrado) — que ambas versiones cumplen; lo que no cumplen es parecerse.

**Impacto.** Compárense dos capturas del mismo viewport y del mismo grupo del menú:

- `escritorio/catalogos-clinicos-medicamentos__lleno.png` → `<nav aria-label="Paginación">` con
  fondo, borde, «Mostrando 1–20 de 137» a la izquierda y «Anterior · Página 1 de 6 · Siguiente» a la
  derecha, a la altura del ancho completo de la tabla.
- `escritorio/catalogos-clinicos-tipos-consulta__lleno.png` → «Mostrando 25 de 25» como texto de
  12 px pegado al borde izquierdo de la página, **sin contenedor, sin `nav`, sin nombre accesible**,
  y con una redacción distinta (`N de M`, no `desde–hasta de total`).

Diez pantallas del mismo grupo de menú resuelven el pie de listado de una manera y dos de otra. Un
administrador que recorre el menú de arriba abajo cambia de convención sin motivo aparente.
*(Divergencia menor de la misma familia: la primera columna se titula «Nombre» en diez pantallas y
«Medicamento» en las dos de medicamentos; y solo medicamentos lleva `ds-subtitle` bajo el `<h1>`.)*

**Arreglo.** El pie plano es **correcto en el fondo** —esos endpoints devuelven `List<T>` completa y
un paginador sería una promesa falsa, como el propio comentario de
`MedicamentsListView.vue:445-449` razona— así que **no se les añade `AppPagination`**. Lo que se
unifica es la *forma*: extraer el párrafo a una primitiva de pie de listado, o simplemente envolverlo
con la misma geometría que `.paginador` de `AppPagination.vue` reserva para su `.rango`. Decisión de
`front-parity` si acaba en `primitives.css`; si se queda como componente `AppListCount.vue` en
`src/components/ui/`, es de `front-feature`. **No se sube CSS duplicado a un `<style scoped>`**:
`no-duplicate-primitive` (FE-08) lo rechazaría y `maxDuplicateGroups: 0` también.

---

### H05 · [menor] Razas no tiene el filtro por especie que sí tiene Colores, siendo la misma pantalla

`src/features/breeds/views/BreedsListView.vue:90-98` frente a
`src/features/animal-colors/views/AnimalColorsListView.vue:156-181`

**Criterio:** NN/g H4 (consistencia y estándares) · Ley de Jakob (lawsofux.com): el usuario espera
que dos pantallas iguales se comporten igual.

**Impacto.** Las dos vistas son gemelas hasta en el detalle: mismas cabeceras
`['Nombre', 'Especie', 'Fecha creación', 'Acciones']`, mismo placeholder `Nombre o especie…`, misma
posición del botón de crear, mismo pie. **Colores tiene un `AppSelect` «Especie / Todas las
especies»** (`escritorio/animales-colores__lleno.png`, bajo el buscador); **Razas no**
(`escritorio/animales-razas__lleno.png`, la tabla arranca justo tras el buscador). Un catálogo de
razas real es el más grande de los tres —decenas por especie— y es justamente donde el filtro haría
más falta. El usuario que aprendió a acotar por especie en Colores lo busca en Razas y no está.

**Arreglo:** portar a `BreedsListView.vue` el bloque de `AnimalColorsListView.vue:156-181` completo,
incluidos el banner de error del catálogo de especies con «Reintentar» (`:165-172`) y el
`:placeholder="cargandoEspecies ? 'Cargando…' : undefined"` (`:179`) — el desplegable vacío tiene que
explicar por qué está vacío. **Alternativa igualmente válida:** retirar el filtro de Colores. Lo que
no vale es que difieran; decida producto, pero que sea una decisión.

---

### H06 · [menor] Colores apila el filtro debajo del buscador, contra la regla que el propio repo escribió

`src/features/animal-colors/views/AnimalColorsListView.vue:173-181` y su
`<style scoped> .filtro { max-width: 280px; margin-bottom: var(--space-16) }`

**Criterio:** `docs/ux/patron-de-busqueda-en-listado.md` §1, literal: *«primera fila del cuerpo de la
vista, encima de la tabla y dentro del mismo bloque, alineado a la izquierda, ancho máximo 360 px,
**con el resto de acciones de listado a su derecha**»*. Autoridad de nivel 2 de la rúbrica.

**Impacto.** En `escritorio/animales-colores__lleno.png` el buscador ocupa una fila (etiqueta
«Buscar colores» + campo de 360×41,5) y el filtro ocupa **otra fila completa debajo** (etiqueta
«Especie» + select de 280×41,5). Son ~150 px de cromo antes de la primera fila de datos, en una
pantalla en la que el resto de sus once hermanas empiezan la tabla ~82 px antes. A 768 px
(`tablet-v/animales-colores__lleno.png`, el mínimo que la consola promete) eso empuja la tabla por
debajo del pliegue y la primera fila deja de verse sin desplazar.

**Arreglo:** una fila con `display: flex; align-items: flex-end; gap: var(--space-16); flex-wrap:
wrap` que contenga `AppListSearch` y el `.filtro`, con el banner de error del catálogo de especies
**por debajo** de la fila (es un mensaje, no un control). Geometría en el `<style scoped>` de la
vista, **sin una sola declaración de color** —la trampa de especificidad de `AGENTS.md:103-122`— y
sin reescribir ninguna primitiva.

---

### H07 · [menor] «Descripción» es obligatoria en Tipos de consulta y opcional en los otros cinco tipos idénticos

`src/features/consultation-types/components/ConsultationTypeForm.vue:74-75` (con `required`) frente a
`VaccinationTypeForm.vue:74-76`, `SurgeryTypeForm.vue:74-76`, `LaboratoryTestTypeForm.vue:74-76`,
`DiagnosticImagingTypeForm.vue:74-76`, `SpaTypeForm.vue:71-73` (sin `required`).

**Criterio:** NN/g H4 · WCAG 2.2 §3.3.2 Labels or Instructions (A) **no se incumple** —el asterisco
está y `AppInput`/`AppTextarea` lo pintan—, así que la severidad es `menor`, no `grave`.

**Impacto.** Visible en dos capturas del mismo viewport:
`escritorio/catalogos-clinicos-tipos-consulta-1__lleno.png` → «Descripción \*»;
`escritorio/catalogos-clinicos-tipos-vacuna-1__vacio.png` → «Descripción» sin asterisco. Seis
catálogos con exactamente la misma forma (nombre + descripción) y **uno solo exige la descripción**.
El administrador que da de alta los seis tipos de una clínica nueva de un tirón aprende en cinco
pantallas que la descripción es opcional y falla en la sexta.

**Arreglo:** decisión de producto, y **la misma para los seis**. Si la descripción es opcional en
cinco catálogos que se muestran al veterinario en el mismo desplegable, no hay razón para exigirla en
el sexto: retirar `required` de `ConsultationTypeForm.vue:75`. Si se decide lo contrario, añadirlo a
los otros cinco. **En cualquiera de los dos casos hay que comprobarlo contra el backend antes de
tocar nada** —esta auditoría no lo hizo— porque un `required` de menos en el frente convierte una
validación de servidor en un error después de pulsar «Guardar».

---

### H08 · [menor] La nota «este catálogo es global» aparece en cuatro de los seis formularios de tipo

Presente en `VaccinationTypeForm.vue:81-83`, `SurgeryTypeForm.vue:81-83`,
`LaboratoryTestTypeForm.vue:81-83`, `DiagnosticImagingTypeForm.vue:81-83`
(`<p class="ds-banner ds-banner--info ds-banner--sm" role="note">`).
**Ausente en** `ConsultationTypeForm.vue` y `SpaTypeForm.vue`.

**Criterio:** NN/g H2 (correspondencia con el mundo real) y H4 · rúbrica §3.7 (los estados y sus
textos los fija el repo, no el auditor).

**Impacto.** La frase «Este catálogo crea tipos globales disponibles para todas las empresas»
—visible en `escritorio/catalogos-clinicos-tipos-vacuna-1__vacio.png`— es igual de cierta para los
tipos de consulta y para los tipos de spa, que también son catálogos de plataforma. Que aparezca en
cuatro y falte en dos comunica, sin quererlo, que **esos dos no son globales**. En una consola de
plataforma multiempresa, «esto lo van a ver todas las clínicas» es la advertencia que evita el
error, y falta justo en la pantalla con más tráfico del grupo (tipos de consulta).

**Arreglo:** añadir el mismo `<p class="ds-banner ds-banner--info ds-banner--sm" role="note">` con el
mismo literal a `ConsultationTypeForm.vue` y `SpaTypeForm.vue`, en la misma posición (tras el último
campo, antes de las acciones). Cero CSS nuevo.

---

### H09 · [menor] Un `<a class="ds-btn">` sale subrayado y un `<button class="ds-btn">` no: el mismo botón «Volver» se ve distinto según la pantalla

`src/assets/styles/primitives.css` — el bloque `.ds-btn` **no declara `text-decoration`**, así que un
ancla conserva el subrayado del agente de usuario. Consumidores afectados dentro de este bloque:
`MedicamentsPlatformView.vue:81,134` y `MedicamentDetailView.vue:95`.

**Criterio:** NN/g H4 · WCAG 2.2 §3.2.4 Consistent Identification (AA) **no se incumple** —el
rótulo y la función son idénticos— por lo que la severidad es `menor`.

**Impacto, en tres capturas del mismo viewport `escritorio`:**

| Captura | Control | Cómo se ve |
|---|---|---|
| `catalogos-clinicos-tipos-consulta-1__lleno.png` | «← Volver» (`<button>`) | **sin** subrayado |
| `catalogos-clinicos-medicamentos-plataforma__lleno.png` | «← Volver» (`RouterLink`) | **con** subrayado |
| `catalogos-clinicos-medicamentos-1__lleno.png` | «Ir al catálogo de medicamentos» (`RouterLink`, primario sólido) | **con** subrayado dentro de un botón sólido |
| `catalogos-clinicos-medicamentos__lleno.png` | «Ver los medicamentos de todas las empresas →» (`RouterLink`, ghost) | **con** subrayado |

El subrayado dentro de un botón primario sólido es el caso feo: no comunica «es un enlace» —ya
parece un botón— y solo se lee como error de estilo. **Alcance real fuera de este bloque: 12
consumidores de `RouterLink class="ds-btn"` en toda la consola** (`companies`, `limits`, `quotes`,
`platform-access`, `catalog-ai-hints`).

**Arreglo:** una línea en la primitiva, `text-decoration: none;` dentro del bloque `.ds-btn` de
`primitives.css`. **`primitives.css` es gemelo TR-02 byte a byte → es de `front-parity`, no de
`front-feature`**, y hay que replicarla en `VetSoftwarePublicFront` en el mismo movimiento. Es un
cambio de geometría/decoración, no de color, así que no toca la trampa de especificidad; sí puede
mover líneas base visuales, así que `front-e2e-visual` tiene que revisarlas.

---

### H10 · [menor] A 768 px —el mínimo que la consola promete— el botón primario del encabezado de medicamentos parte su rótulo en dos líneas

`src/features/medicaments/views/MedicamentsListView.vue:290-300`, dentro del `.ds-actions` del
`.ds-head`.

**Criterio:** rúbrica §3.4(a) (una sola acción primaria por región, con `.ds-head` como forma
canónica) y §3.1 (alineación) · `armazon-tablet-especificacion.md` §3 (768 px es el mínimo
**prometido**, así que aquí no aplica la rebaja a `nota` de los 390 px).

**Impacto.** En `tablet-v/catalogos-clinicos-medicamentos__lleno.png` el botón se lee
«+ Nuevo / medicamento» en dos líneas, mide ~52 px de alto contra los ~34 px de las pestañas
«Activos»/«Pausados» que tiene al lado, y el glifo `+` —centrado verticalmente sobre las dos
líneas— queda a media altura entre ellas en vez de junto a la primera palabra. En
`tablet-h/…__lleno.png` (1024) y en `escritorio` cabe en una línea, así que es un tramo de anchos
—aproximadamente 760–900 px— y **no es un artefacto de borde de media query** (la consola solo
declara cortes en 520·560·640·680·760·900·1024·1100·1279; ninguno cae aquí y la causa es el
encogimiento del flex, no una regla que dispara).

**Arreglo:** en el `<style scoped>` de la vista, envolver la fila de acciones del `.ds-head` con
`flex-wrap: wrap` y dar al botón `white-space: nowrap`. **Geometría solamente, sin una declaración
de color.** *No* se toca `.ds-btn` en `primitives.css`: su propio comentario deja escrito que fijar
`line-height`/`white-space` ahí cambia la altura de los ~120 botones que hoy heredan `normal` y que
el harness lo midió (–1,4 px). Ese comentario es una restricción vigente y manda.

---

### H11 · [nota] Ninguna de las once fichas `/:id` dice de qué registro se trata

`ConsultationTypeDetailView.vue:88` — `<h1 class="ds-title">Editar tipo de consulta</h1>`, y la misma
línea en las otras diez.

**Criterio:** NN/g H1 (visibilidad del estado) · WCAG 2.2 §2.4.6 Headings and Labels (AA) se cumple
—el encabezado sí describe el propósito— así que esto es una **mejora**, no un incumplimiento.
Relacionado con H06 del informe sistémico (`document.title` sin escribir en las 37 rutas).

**Impacto.** El encabezado es idéntico para los 25 registros del catálogo. El nombre del registro
solo aparece **dentro del primer `<input>`**, que es donde el ojo llega el último y donde un lector
de pantalla lo anuncia como valor de campo, no como identidad de la pantalla. Con el registro largo
de la siembra (`movil/catalogos-clinicos-tipos-consulta-1__lleno.png`) el nombre además **se corta
dentro del campo** —«UXA Nombre de prueba deliberadamente larg…»— así que a 390 px la pantalla no
identifica el registro por ningún medio.

**Arreglo:** `<h1 class="ds-title">Editar «{{ selected?.name }}»</h1>` con recaída al literal
genérico mientras `selected` es nulo. Como H01 introduce ya las tres ramas, entra en el mismo
cambio y en el mismo fichero. Y si se aborda H06 del informe sistémico, el mismo dato alimenta el
`document.title`.

---

### H12 · [nota] `AppPagination` deriva el rango del `pageSize` que dice el servidor, no de las filas que pinta, y no se entera cuando discrepan

`src/components/ui/AppPagination.vue` — `desde`/`hasta` se calculan de `page` × `pageSize`, que llegan
como props desde la respuesta.

**Criterio:** `patron-de-busqueda-en-listado.md` §5, *«salvaguarda visible mientras dure el modo
cliente»* — la idea explícita de que el número deje de cuadrar **de forma observable** en vez de
degradar en silencio.

**Impacto — y el aviso que va con él.** En `escritorio/catalogos-clinicos-medicamentos__lleno.png`
el pie dice **«Mostrando 1–20 de 137 · Página 1 de 6»** mientras la tabla pinta **25 filas**
(`UXA Registro de prueba 01` … `25`), y 137/20 son 7 páginas, no 6. **Esto es el fixture del arnés
de capturas, no un defecto de producción**: el stub devolvió 25 elementos con `pageSize: 20`,
`totalElements: 137` y `totalPages: 6`. **Que nadie lo persiga como bug.** Lo que sí se aprende de
él es que el componente aceptó sin rechistar un pie que contradice lo que hay encima, y que ninguna
puerta lo vio.

**Arreglo (opcional, barato):** en desarrollo, un `console.warn` o una aserción en el spec de
`front-e2e-visual` cuando `hasta - desde + 1` no coincida con el número de `<tr>` del `<tbody>`. No
cambia nada de la interfaz y convierte una mentira silenciosa en una señal.

---

## 2 · Lo que este informe NO reporta, y por qué

- **Desbordamiento horizontal del documento, imágenes rotas o deformadas, solapamientos,
  desalineaciones y texto desbordado sin elipsis:** cero en las 161 mediciones de estas rutas. No hay
  nada que reportar.
- **`objetivosPequenos`, `espaciadoFueraDeEscala` y `scrollers` del JSON de métricas:** triados como
  falsos positivos conocidos o como armazón (§0).
- **El nombre largo de la siembra:** se comporta bien. Envuelve a dos líneas y hace crecer la fila,
  sin recortar, sin empujar columnas fuera y sin romper la rejilla —
  `escritorio/catalogos-clinicos-tipos-consulta__lleno.png` (dos líneas),
  `escritorio/animales-razas__lleno.png` (cabe en una). No hay elipsis en ninguna celda, y **está
  bien que no la haya**: en un catálogo maestro, un nombre truncado con `…` es un nombre que hay que
  ir a buscar a otra pantalla.
- **Contraste de `.ds-meta` / `--warm-500`:** ya medido y remediado por A11Y-02/A11Y-09 —
  `tokens.css:68-76` documenta 5,38:1 sobre `--warm-50`. Cumple §1.4.3. No se reabre.
- **`H01`, `H04`–`H12` del informe sistémico** (`uxa-armazon-y-primitivas-admin.md`): el pie del
  sidebar, `AppSelect`, `document.title`, la campana, el foco tras paginar, `required` como
  asterisco. Todos aparecen en estas capturas porque son armazón. **Son suyos, no míos.**
- **`patron-de-busqueda-en-listado.md` fichas F3 y F4:** F3 está **implementada** (`AppListSearch`);
  F4 —el falso buscador de la cabecera— **ya no está en el árbol**: `AppHeader.vue` no lo pinta en
  ninguna de las 23 capturas de este bloque. Las dos fichas se pueden cerrar.

## 3 · Pantallas y estados que no se pudieron auditar

| Qué | Por qué | Consecuencia |
|---|---|---|
| Estado **`lleno`** de `tipos-vacuna`, `tipos-cirugia`, `tipos-laboratorio`, `tipos-imagen` | El arnés no sembró filas: `<slug>__lleno.png` es **byte a byte idéntico** a `<slug>__vacio.png` en los cinco viewports (p. ej. ambos 104 263 B en `escritorio/catalogos-clinicos-tipos-vacuna`). Se pintó el estado vacío | Su tabla con datos **no se ha visto**. Se asume igual a `tipos-consulta`/`tipos-spa` **por lectura del código** (mismas cabeceras, mismo `AppTable`, mismas celdas), no por captura |
| Todos los estados **`__modal`** de las siete rutas que los tienen | Ninguna de las siete capturas `__modal` muestra un diálogo abierto: son recortes al alto del viewport del listado (`escritorio/catalogos-clinicos-tipos-consulta__modal.png`) | **El diálogo de alta (`AppModal` + `<Entidad>Form`) no se ha auditado visualmente en ninguna de las doce.** Es la pantalla donde se crea el registro: merece una segunda pasada |
| Ficha `/:id` en su camino de error | El arnés solo sirvió el camino feliz | **H01 se dictamina leyendo el código.** Nadie ha visto la pantalla rota |
| Viewport `estrecho-680` y `estrecho-760` | Existen en `uxa-metricas-admin.json` pero **no hay PNG** de ellos | Sin observación visual en el tramo 680–760, que es donde H10 empieza a doler |

---

## 4 · Reparto y orden

| Ficha | Agente | Repo | Nota |
|---|---|---|---|
| **H01** — tres ramas en las 9 fichas + `setSelected(null)` + `watch(props.id)` | `front-feature` | admin-web | **Lo primero.** Copia `useLimitDimensionRecord.ts:29-49` |
| **H02** — `aria-label` con el sujeto en 9 listados | `front-feature` | admin-web | Mismo lote que H01 |
| **H03** — `tabindex`/`role`/nombre en `AppTable.vue:130` | `front-feature` | admin-web | Cierra el issue nº 4 de `reglas-de-interfaz.md:1324` |
| **H05, H06, H07, H08, H10, H11** — divergencias entre gemelas | `front-feature` | admin-web | Un lote, no doce PR |
| **H04** — unificar el pie de listado | `front-parity` si acaba en `primitives.css`; `front-feature` si es `AppListCount.vue` | admin-web | Decidir antes de escribir |
| **H09** — `text-decoration: none` en `.ds-btn` | **`front-parity`** | los dos fronts | Gemelo TR-02 byte a byte: se replica o rompe `tr02:parity` |
| Cobertura de H01, H02, H03 y H12 | `front-e2e-visual` | admin-web | El spec de H01 es el que más vale |

**Ninguna recomendación de este informe sube un umbral de `css-budget.config.json`, ni añade una
excepción a `no-duplicate-primitive`, ni introduce color en un `<style scoped>`, ni toca un `.puml`.**

## 5 · Issue propuesto (redactado, NO abierto)

> **Repo:** `kefaroTech/vetsoftware-admin-web`
> **Título:** Si la ficha de un catálogo no consigue releer su registro, se queda con el anterior y
> «Guardar» lo escribe en el registro equivocado
>
> **Dónde.** `src/features/*/composables/use*.ts` → `fetchById`, y `src/features/*/views/*DetailView.vue`
> → `<section v-if="selected">`. Nueve pares idénticos: tipos de consulta, vacuna, cirugía,
> laboratorio, imagen diagnóstica y spa; especies, razas y colores.
>
> **Qué pasa.** `selected` vive en el store de `createCatalogStore` y nunca se pone a `null`. El
> `catch` de `fetchById` solo lanza un toast. Si el usuario abre la ficha de A, vuelve, abre la de B
> y la petición de B falla (404 porque otro administrador borró el registro, 500 o red), la pantalla
> queda con el formulario de **A** relleno, con el título y el botón «Guardar» normales, y sin
> ninguna señal de que algo falló una vez que el toast se va. `handleSave` hace
> `update(Number(props.id), data)` → los valores de A acaban dentro del registro B.
>
> **Por qué importa.** Son catálogos maestros de plataforma: lo que se corrompe aquí lo consumen
> todas las clínicas. Y no hay forma de que el usuario lo note.
>
> **Cómo se arregla.** El patrón correcto ya está en el repo:
> `src/features/limits/composables/useLimitDimensionRecord.ts:29-49`. (1) `setError(null)` +
> `setSelected(null)` antes del `await`; (2) `setSelected(null)` + `setError(mensaje, traceId)` en el
> `catch`, conservando el `errorFrom` actual; (3) `clear()` al desmontar; (4) tres ramas en la vista
> —error con «Reintentar» primero, ficha después, `AppEmptyState` al final—; (5)
> `watch(() => props.id)`, porque `App.vue:10` monta el `<RouterView />` sin `:key`.
>
> **Prueba que lo sujeta.** Un spec que intercepte `GET /<catálogo>/{id}` con 404 tras haber visitado
> otra ficha y afirme que no queda un formulario relleno en pantalla y que el banner de error tiene
> nombre accesible.
>
> **Detectado en:** auditoría visual/UX de las doce pantallas de catálogo,
> `docs/ux/uxa-pantallas-catalogos-admin.md` H01. Leído en el código; **no reproducido en navegador**.
> No hay issue duplicado (búsqueda sobre los 100 issues abiertos y cerrados del repo, 2026-09-04).

## 6 · Qué se midió y qué no

**Ejecutado (solo lectura):** las 23 capturas de `escritorio` más muestras de `tablet-v` (768),
`tablet-h` (1024) y `movil` (390); comparación de tamaño de fichero de las 52 capturas de
`escritorio` para detectar los `lleno` sin sembrar; filtrado con `jq` de `uxa-metricas-admin.json`
sobre las 161 filas de estas rutas; lectura de las 11 vistas de listado, las 11 fichas, los 10
formularios, `AppListSearch.vue`, `AppTable.vue`, `AppPagination.vue`, `PageLoader.vue`,
`createCatalogStore.ts`, `useConsultationTypes.ts`, `useLimitDimensionRecord.ts`, y los bloques
`.ds-btn`, `.ds-meta`, `.ds-subtitle` y la rampa `--warm-*` de `primitives.css`/`tokens.css`; censo
de `RouterLink class="ds-btn"` en todo `src/`; y búsqueda de duplicados sobre los issues abiertos y
cerrados de `kefaroTech/vetsoftware-admin-web`.

**No ejecutado, y declarado como tal:** no se levantó el servidor de desarrollo, ni Playwright, ni
`npm run quality`, ni `ds:audit`, ni `vue-tsc` — había una pasada de capturas viva en este worktree y
competiríamos por puerto y navegador. **No se calculó ningún contraste**: los de este bloque ya están
medidos y documentados en `tokens.css`. **No se abrió el árbol de accesibilidad de ninguna pantalla**
(no hay `axe-core` en el repo — issue admin-web #44). **No se comprobó contra el backend** si la
descripción de un tipo de consulta es obligatoria de verdad (H07). Y **H01 no se ha observado en un
navegador**: es concluyente sobre el código, no sobre la pantalla.

## Fuentes

- WCAG 2.2 — https://www.w3.org/TR/WCAG22/ · §2.1.1 Keyboard (A) · §4.1.2 Name, Role, Value (A) ·
  §2.4.6 Headings and Labels (AA) · §3.2.4 Consistent Identification (AA) · §3.3.2 Labels or
  Instructions (A) · §1.4.3 Contrast (Minimum) (AA)
- WCAG 2.2, Understanding 1.4.10 Reflow (excepción explícita de las tablas de datos) —
  https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- axe-core, `scrollable-region-focusable` —
  https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
- NN/g, *10 Usability Heuristics* — https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, *Empty State Interface Design* — https://www.nngroup.com/articles/empty-state-interface-design/
- Laws of UX, Jakob's Law y Hick's Law — https://lawsofux.com/
- Del propio repo: `docs/ux/uxa-rubrica-maquetacion.md` (en `public-web`),
  `docs/ux/uxa-armazon-y-primitivas-admin.md`, `docs/ux/patron-de-busqueda-en-listado.md`,
  `docs/ux/patron-de-mensajes.md`, `docs/ux/reglas-de-interfaz.md`,
  `docs/ux/armazon-tablet-especificacion.md`
