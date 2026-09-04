# Reglas de interfaz — auditoría de UX (informe 08)

Quince reglas, una por patrón de defecto. Cada una nació de un arreglo concreto; lo que se documenta
aquí **no es el arreglo, es la regla que impide que el defecto vuelva**.

Cómo leerlas:

- **Regla** — la frase que se aplica en revisión, sin interpretación.
- **Criterio** — la norma que la exige. Si no hay criterio citable, se dice.
- **Así no / Así sí** — el código real, con `fichero:línea` del repositorio.
- **Verificación hoy** — la prueba o el gate que la sujeta, con su nombre exacto y **en qué repo
  vive**, que no siempre es en los dos.
- **Sin verificar** — lo que nadie comprueba. Es la parte más honesta de cada ficha y la que dice
  dónde va a volver el defecto.

## Ámbito, y por qué este documento sigue siendo gemelo

Las reglas son del sistema de diseño, y el sistema de diseño es un gemelo TR-02 byte a byte
(`tokens.css` y `primitives.css` son idénticos en los dos repositorios). Una regla que solo viviera
en un repo dejaría la puerta abierta en el otro: eso no es una hipótesis, es exactamente lo que son
hoy **admin-web #74** (la guarda de movimiento de la consola no alcanza a las primitivas gemelas) y
**admin-web #81** (el gate de `!important` excepciona un fichero que en la consola no existe). Por
eso **este documento se mantiene gemelo** y no se parte en dos.

Lo que sí se corrige —era **admin-web #82**— es la ambigüedad de las rutas: la 1.ª versión citaba
once `tests/unit/…` sin decir de quién, y de esos once la consola solo tiene tres. A partir de aquí:

- **Toda ruta lleva delante su repositorio.** `VetSoftwarePublicFront/` = app del tenant,
  `VetSoftwareFront/` = consola de plataforma. Sin prefijo no hay ruta.
- Cuando una guarda existe en un solo repo, la ficha lo dice en «Verificación hoy» **y** la tabla de
  cobertura lo marca en su columna. La asimetría deja de ser una errata y pasa a ser el backlog de
  paridad.
- Los ficheros que sí son gemelos (`tokens.css`, `primitives.css`, `stylelint.config.mjs`,
  `PawLoader.vue`, `ToastStack.vue`) se citan **sin** prefijo y se dice que son gemelos.

Las líneas se verificaron leyendo el árbol de trabajo de los dos repos el **2026-08-20**, sobre
`develop`, con la 2.ª tanda de arreglos y sus guardas aún sin commitear. Si algún `fichero:línea` no
cuadra, manda el código: este documento describe el árbol, no al revés.

---

## R01 · Activar con `@click`, nunca con `@mousedown`

**Regla.** Un elemento que ejecuta una acción se enlaza a `@click`. `@mousedown` (y sobre todo
`@mousedown.prevent`) queda reservado a _descartar_ capas flotantes desde fuera, nunca a activar.

**Criterio.**

- WCAG 2.2 §2.1.1 Teclado (A) — «All functionality of the content is operable through a keyboard
  interface». `mousedown` no lo emite ningún teclado: Enter y Espacio sobre un `<button>` despachan
  `click` y solo `click`. Un manejador exclusivo de `mousedown` deja la acción fuera del alcance del
  teclado, aunque el elemento sea enfocable y parezca operable.
- WCAG 2.2 §2.5.2 Cancelación del puntero (A) — la función no debe completarse en el _down-event_.
  Con `@mousedown` el usuario que aprieta sobre la opción equivocada no puede arrastrar fuera para
  cancelar: ya está elegida.

**Por qué aparece.** Siempre por el mismo motivo: el panel se cierra en el `blur` o en un `mousedown`
de documento, el `click` de la opción nunca llega, y alguien lo «arregla» adelantando la activación
al `mousedown` con `.prevent`. El arreglo correcto es que **el cierre por fuera excluya el panel**,
no que la activación se adelante.

**Así no** — como estaba `SearchableSelect`:

```vue
<button type="button" class="item" @mousedown.prevent="pick(o)">
```

**Así sí** — `VetSoftwarePublicFront/src/components/ui/SearchableSelect.vue:204`, sostenido por el
cierre por fuera que hoy vive en `VetSoftwarePublicFront/src/composables/useAnchoredPanel.ts:83-89`
(el panel salió del SFC a un composable en la 2.ª tanda) y que excluye del _click-outside_ tanto la
raíz como el panel teletransportado:

```vue
<button type="button" class="item ds-stack" @click="pick(o)">
```

```ts
function onDocMouseDown(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as Node
  if (refs.root.value?.contains(target) || refs.panel.value?.contains(target)) return
  onClickOutside()
}
```

**Verificación hoy.** Para este componente, sí, y **solo en el tenant**:
`VetSoftwarePublicFront/tests/unit/searchable-select.spec.ts`, `describe('SearchableSelect —
activación por click')`. Cuatro casos, y el que sujeta la regla es
`it('un mousedown sobre la opción NO emite nada por sí solo')`: si alguien vuelve a mover la
activación al `mousedown`, ese aserto se pone verde por el lado equivocado y el de `click` se cae.

El caso hermano —un control que el teclado no puede alcanzar— lo cubre
`VetSoftwarePublicFront/tests/unit/date-input.spec.ts`, `describe('DateInput — el campo se puede
teclear')`, que comprueba que el input **no** es `readonly`, ni siquiera con el campo marcado como
inválido, y que `disabled` sí bloquea, porque no es lo mismo.

**La consola no tiene ninguna de las dos**, y tampoco tiene `SearchableSelect` ni `DateInput`: su
equivalente es `AppSelect`, sin guarda de activación.

**Sin verificar.** Que no reaparezca `@mousedown` como activador en **otro** de los 405 SFC. Las
guardas de arriba son por componente; falta el barrido de rejilla sobre todos los templates, que es
lo más barato de este documento — ver «Puertas que faltan» al final.

---

## R02 · Quien cierra una capa flotante devuelve el foco al disparador

**Regla.** Si al cerrar una capa (panel, popover, modal, menú) desaparece del DOM el elemento
enfocado, el cierre **debe** dejar el foco en el disparador que la abrió. Vale para el camino de
éxito (elegir una opción) y para el de abandono (Escape, clic fuera, cancelar).

**Criterio.**

- APG, _Developing a Keyboard Interface_ → «Persistence of focus»: «If such events are not managed to
  set focus on the button that triggered the dialog or on the list item following the deleted item,
  browsers move focus to the body element, effectively causing a loss of focus within the user
  interface».
- APG, patrón _Combobox_: «Escape: Closes the popup and returns focus to the combobox».
- WCAG 2.2 §2.4.3 Orden del foco (A) — el foco en `<body>` no preserva ni significado ni
  operabilidad: el siguiente Tab reinicia el recorrido desde el principio del documento.

**Impacto clínico.** El auxiliar que rellena una receta con una mano elige el medicamento y el foco
se cae al `<body>`. El siguiente Tab no lo lleva al campo de dosis: lo lleva al primer enlace del
layout. Con doce campos por delante, eso es la diferencia entre teclear la receta y tener que soltar
al animal para coger el ratón.

**Así no:**

```ts
function pick(opt: Option) {
  emit('update:modelValue', opt.value)
  close() // el panel se desmonta y el foco cae a <body>
}
```

**Así sí** — `VetSoftwarePublicFront/src/components/ui/SearchableSelect.vue:102-115`. Nótese que hay
**dos** caminos de cierre y los dos devuelven el foco; el de Escape existe como función propia
(`closeToTrigger`) precisamente para que no se olvide al añadir un tercero:

```ts
function pick(opt: Option) {
  emit('update:modelValue', opt.value)
  close()
  // El disparador es el elemento que representa el valor recién elegido.
  focusTrigger()
  emit('blur')
}

/** Escape: cierra y devuelve el foco al disparador (no solo cierra). */
function closeToTrigger() {
  close()
  focusTrigger()
  emit('blur')
}
```

El `nextTick` que hay dentro de `focusTrigger`
(`VetSoftwarePublicFront/src/composables/useAnchoredPanel.ts:66-68`) no es decorativo: el `focus()`
tiene que ocurrir **después** de que Vue retire el panel del DOM, o el navegador lo deshace. Que hoy
viva en el composable es una mejora sobre la 1.ª versión de esta ficha: cualquier panel anclado nuevo
lo hereda en vez de tener que acordarse.

**Verificación hoy.** Para `SearchableSelect`, sí, y **solo en el tenant**:
`VetSoftwarePublicFront/tests/unit/searchable-select.spec.ts`, `describe('SearchableSelect — el foco
vuelve al disparador')`, con los dos caminos separados —
`it('tras elegir una opción, el foco está en el disparador y no en <body>')` e
`it('Escape también devuelve el foco al disparador, no solo cierra')`. Que sean dos asertos y no uno
es deliberado: el camino de abandono es el que se olvida.

**Sin verificar.** El retorno de foco de `ModalShell` y el de cualquier panel nuevo. `ModalShell`
(gemelo de facto entre los dos repos, y **declarado** en el manifiesto TR-02) pone el foco inicial y
cierra con Escape, pero nada comprueba dónde queda el foco al cerrar. La trampa de foco mientras el
diálogo está abierto **sí existe** — `useModalFocus.ts:47-64` (`onTrapTab`), consumida por
`ModalShell.vue:188` y, en la consola, también por el cajón de navegación vía `useNavDrawer.ts:40-45`
—, así que lo que falta no es implementarla: es la prueba que compruebe el retorno de foco al cerrar.
**No escribas una segunda trampa**: `armazon-tablet-especificacion.md` §6.2 lo prohíbe por escrito
(«la trampa de foco ya existe — no escribas otra»), precisamente porque una segunda implementación
compite por el mismo `keydown.capture` con la que ya hay. Eso es §2.4.3 (A) y no lo cubre ninguno de
los diecinueve arreglos de las dos tandas.

---

## R03 · Anillo de foco medido: ≥ 3:1 contra la superficie real

**Regla.** `outline: none` sin un sustituto que alcance **3:1 medido** contra la superficie donde cae
es un defecto de nivel AA. Cualquier token de anillo de foco se mide antes de entrar, convirtiendo
OKLCH → sRGB y aplicando la fórmula de luminancia relativa de WCAG 2.x contra las superficies reales
(`--warm-50` y blanco), no de memoria y no «a ojo».

El criterio completo, con el porqué y el patrón de dos capas, está en **`AGENTS.md` (gemelo TR-02),
sección «Indicador de foco: 3:1 contra la superficie, siempre (A11Y-01)»**. No se repite aquí.

**Criterio.**

- **§1.4.11 Contraste no textual (AA)** — «Visual information required to identify user interface
  components and states […] have a contrast ratio of at least 3:1 against adjacent color(s)». **Este
  es el criterio AA que exige el 3:1 del anillo.**
- **§2.4.7 Foco visible (AA)** — que exista indicador; no cuantifica.
- **§2.4.13 Apariencia del foco (AAA)** — el que pide 3:1 entre los píxeles del estado enfocado y el
  no enfocado, y un área equivalente a un perímetro de 2 px CSS. El anillo de dos capas (2 px + 2 px)
  cumple también esa geometría, pero AAA no es el nivel al que se compromete el producto.
- **§2.4.11 Foco no oscurecido (mínimo), AA**, es **otro** criterio —que el foco no quede tapado por
  contenido pegajoso— y no dice nada de contraste.

> **Nota de numeración: ya corregida, no la vuelvas a aplicar.** La 1.ª versión de esta ficha
> proponía cambiar «§2.4.11» por «§1.4.11» en `AGENTS.md`, en `tokens.css` y en el docblock de
> `tests/unit/tokens-contrast.spec.ts`. **Ese cambio está hecho y mergeado**: hoy `AGENTS.md:127-137`
> (los dos repos) y `tokens.css:194-196` (gemelo) citan §2.4.7 + §1.4.11 como fundamento y nombran
> §2.4.11 solo para decir que **no** es este criterio. Volver a «corregirlo» hoy destruiría esa
> distinción, que es el punto entero del comentario. Cerrado en **public-web #132**.

**Así no:**

```css
--ring: 0 0 0 3px var(--amatista-50); /* 1,06:1 sobre --warm-50: invisible */
```

**Así sí** — `tokens.css:204-205` (gemelo TR-02, idéntico en los dos repos):

```css
--ring: 0 0 0 2px var(--warm-50), 0 0 0 4px var(--amatista-500);
--ring-danger: 0 0 0 2px var(--warm-50), 0 0 0 4px var(--danger-500);
```

4,50:1 y 5,16:1 sobre `--warm-50`. La primera capa repite la superficie para despegar el color del
borde del propio control; la segunda es la que aporta el contraste.

**Verificación hoy.** Sí, y sigue siendo la familia de reglas con una puerta que **mide** en vez de
comparar cadenas — pero las dos copias **no son gemelas**, y esa es la noticia:

- `VetSoftwarePublicFront/tests/unit/tokens-contrast.spec.ts` (112 líneas), apoyada en
  `VetSoftwarePublicFront/tests/helpers/wcag-contrast.ts`: mide **solo los dos anillos**.
- `VetSoftwareFront/tests/unit/tokens-contrast.spec.ts` (364 líneas, conversión inline, sin helper):
  mide los dos anillos **y además** el texto secundario (R10) y el foco del campo inválido (R11).
- Las dos parsean el `:root` de `tokens.css`, resuelven los `var()` en cadena, convierten OKLCH →
  sRGB lineal con las matrices de CSS Color 4 y calculan el contraste; fallan si el token baja de
  3:1 contra `--warm-50` **o** contra blanco.
- La copia de la consola añade tres guardas que conviene replicar en cualquier prueba de este tipo:
  que el anillo **no vuelva** a `--amatista-50` / `--danger-200`; que declare **dos capas** y que la
  primera sea `--warm-50`; y que la propia fórmula se valide reproduciendo los pares de referencia de
  WCAG (negro sobre blanco = 21:1) y reprobando los valores viejos. Sin esa última, un conversor roto
  que devolviera siempre contraste alto dejaría pasar cualquier cosa.
- Corre en CI: `.github/workflows/ci.yml`, paso «Run unit tests with coverage» (`npm run
  test:coverage`), en los dos repos. Ojo: **no** está dentro de `npm run quality`.

**La deriva es el hallazgo.** El fichero medido (`tokens.css`) es gemelo byte a byte; la prueba que
lo mide, no. Hoy la consola vigila tres cosas que el tenant no vigila, sobre **el mismo archivo**.
Cerrarlo es copiar dos `describe`, y es la primera fila de «Puertas que faltan».

**Sin verificar.**

- Los anillos de foco escritos **fuera del token, dentro de un SFC**. Tres SFC del tenant declaran su
  propio `box-shadow` de foco con un `color-mix` al 16-18 % (1,14-1,29:1) y anulan el `outline`; el
  caso testigo es
  `VetSoftwarePublicFront/src/features/acciones/components/ListBody.vue:225`. La guarda mira tokens y
  primitivas, no `<style scoped>`. Abierto en **public-web #134**.
- El contraste de **todo lo demás**. `.ds-field-invalid-focus` ya no está en esta lista (R11) y
  `--text-subtle` tampoco (R10), pero el borde de los campos sigue dando **1,23:1** sobre la
  superficie cuando §1.4.11 (AA) pide 3:1 para el límite de un control: **public-web #115**. El resto
  de la rampa OKLCH sigue sin medirse, y no hay tema oscuro que obligaría a hacerlo.

---

## R04 · El nombre accesible lleva el sujeto de la fila

**Regla.** Un control sin texto visible necesita `aria-label`. Y si el mismo control se repite por
fila, la etiqueta **debe incluir el sujeto de esa fila**: «Quitar Amoxicilina del ticket», no
«Quitar». El campo de cantidad del stepper también es un control y también lo necesita.

**Criterio.**

- WCAG 2.2 §4.1.2 Nombre, función, valor (A) — el control tiene que tener nombre. Un `<button>` con
  solo un `<svg>` dentro no tiene ninguno: el lector de pantalla anuncia «botón».
- WCAG 2.2 §2.4.6 Encabezados y etiquetas (AA) — «Headings and labels describe topic or purpose».
  Once botones llamados «Quitar» en la misma pantalla no describen ningún propósito distinguible: ese
  es el defecto real, no la ausencia de etiqueta.

**Impacto clínico.** El ticket del POS con seis líneas presenta doce botones idénticos. Con lector de
pantalla, o navegando por lista de botones, la única forma de saber a qué línea pertenece cada uno es
contar. Una unidad descontada de la línea equivocada en caja es dinero mal cobrado con el cliente
delante.

**Así no:**

```vue
<button type="button" class="line-x" aria-label="Quitar" @click="emit('remove', l)" />
```

**Así sí** — el stepper y **el botón de eliminar la línea**, que es lo que cerró la 2.ª tanda:
`VetSoftwarePublicFront/src/features/tienda/components/PosTicket.vue:71,79,91`:

```vue
<button type="button" :aria-label="`Quitar una unidad de ${l.name}`" @click="emit('dec', l)">
<button type="button" :aria-label="`Añadir una unidad de ${l.name}`" @click="emit('inc', l)">
<button type="button" :aria-label="`Quitar ${l.name} del ticket`" @click="emit('remove', l)">
```

Redacción: **verbo + objeto + sujeto**, en el idioma de la pantalla y sin la palabra «botón» (el rol
ya lo anuncia el lector). El sujeto no se queda en el nombre del producto: dice **de dónde** se
quita, porque en una pantalla con dos listas («cargos a registrar» y «cargos nuevos») el nombre solo
sigue siendo ambiguo. Ese matiz está escrito en el propio marcado —
`VetSoftwarePublicFront/src/features/cuentas/components/AccountCartPanel.vue:65` («Quitar {nombre} de los cargos
a registrar») y `BillingChargeColumns.vue:164` («…de los cargos nuevos»). Para navegación sin sujeto
de fila basta el objeto: «Página anterior», «Semana siguiente».

Y el `title` no cuenta: los dos casos que solo llevaban `title` (`AccountCartPanel.vue:60`,
`BillingChargeColumns.vue:159`) se pasaron a `aria-label`, con el comentario del porqué al lado. Un
`title` no lo anuncia todo lector, no se ve con teclado y no es un nombre accesible fiable.

**Verificación hoy.** Sí, **solo en el tenant**, y con la forma correcta:

- `VetSoftwarePublicFront/tests/unit/stepper-aria-labels.spec.ts` no comprueba que exista el atributo
  —eso lo pasaría también «Quitar»— sino que **la etiqueta identifica la fila correcta**:
  `it('«Quitar una unidad de Meloxicam» toca la otra línea, no la primera')`. Cubre los tres steppers
  (`AccountCartPanel`, `BillingChargeColumns`, `PosTicket`) y el campo de cantidad.
- `VetSoftwarePublicFront/tests/unit/tienda-controls.spec.ts` hace lo mismo con la paginación: la
  flecha etiquetada «Página anterior» es la que retrocede, y su etiqueta acompaña al estado
  deshabilitado.
- **Nueva en la 2.ª tanda:** `VetSoftwarePublicFront/tests/unit/lab-results-adjuntos.spec.ts` localiza
  el botón por `aria-label === 'Quitar el adjunto ' + nombre` y comprueba que borra **ese** adjunto.
  Es la forma más limpia de esta guarda: la prueba no puede escribirse sin que la etiqueta lleve
  sujeto.

**Sin verificar.**

- La navegación de semana de `VetSoftwarePublicFront/src/features/hospitalizacion/components/TreatmentScreen.vue:154,159`
  («Semana anterior» / «Semana siguiente»): etiquetada, sin guarda.
- Que un control de icono **nuevo** nazca con nombre. No hay barrido de rejilla ni regla de ESLint;
  cada componente que se añada vuelve a depender de la revisión humana.
- **La consola entera.** Ninguna de las tres guardas existe en `VetSoftwareFront/tests/`.

**La mitad que sigue abierta.** Censo de hoy sobre `VetSoftwarePublicFront/src`, controles que se
repiten por fila con etiqueta **estática** (reproducible con
`grep -rn 'aria-label="Quitar\|aria-label="Eliminar' src/`):

| Fichero:línea                                                                | Etiqueta actual      | Está dentro de                   |
| ---------------------------------------------------------------------------- | -------------------- | -------------------------------- |
| `src/features/acciones/modals/LabFormModal.vue:339`                          | `Quitar`             | `v-for="(row, i) in draft.rows"` |
| `src/features/dashboard/views/consulta/nueva/modals/RecetaModal.vue:277`     | `Quitar medicamento` | `v-for` de medicamentos          |
| `src/features/dashboard/views/consulta/nueva/modals/LabTestModal.vue:278`    | `Quitar examen`      | `v-for` de exámenes              |
| `src/features/dashboard/views/consulta/nueva/modals/VaccinationModal.vue:246` | `Quitar vacuna`      | `v-for` de vacunas               |
| `src/features/dashboard/views/consulta/nueva/components/ExistingItemsSection.vue:82,92` | `Editar {noun}` / `Eliminar {noun}` | `v-for` de items ya guardados |

`LabFormModal.vue:339` incumple §4.1.2 en la práctica («Quitar» ¿qué?) y las cinco incumplen §2.4.6
en cuanto hay más de una fila. Las cuatro primeras están en **public-web #118**. La quinta es nueva y
merece nota aparte: `ExistingItemsSection` **sí** parametriza la etiqueta, pero por el **tipo** de
item, no por el item — las tres vacunas de la consulta se anuncian «Eliminar vacuna», «Eliminar
vacuna», «Eliminar vacuna». Es el defecto de R04 con la forma de su arreglo, que es la manera más
fácil de que vuelva. Hay que abrirle issue (ver abajo).

Contraste con un caso que **sí** está bien y no hay que «arreglar»:
`VetSoftwarePublicFront/src/features/laboratorio/components/LabHistory.vue:75` dice «Quitar paciente»
y es correcto, porque ese control no se repite — es la ✕ de un único chip de filtro. La regla es
«sujeto cuando hay ambigüedad entre hermanos», no «sujeto siempre».

---

## R05 · El error de red no se aplasta a un literal, viaja con su traza, y se pinta antes que el vacío

**Regla.** Tres partes. La tercera se añadió en la 2.ª tanda y es la que cierra el defecto de verdad:

1. Un fallo de petición se presenta con **el mensaje que redactó el backend** en el `ProblemDetail`,
   vía `getProblemDetailMessage(e, fallbackDeLaPantalla)`, más el identificador de traza vía
   `getTraceId(e)`. El literal de la pantalla es el suelo, no el mensaje. En avisos flotantes eso ya
   lo hace `useToast().errorFrom(titulo, error)`: **nunca** se escribe
   `error(titulo, getProblemDetailMessage(e))` a mano, porque eso pierde la traza siempre.
2. **Prohibido asignar `[]` (o `0`, o `null`) dentro de un `catch` sin fijar simultáneamente un estado
   de error.** Vaciar la colección sin marcar el fallo convierte un 500 en un «no hay resultados».
3. **En la plantilla, la rama de error va ANTES que la rama de vacío.** Tener el estado de error
   disponible no sirve de nada si `v-else-if="total === 0"` se evalúa primero: `total` también vale 0
   cuando la petición reventó. El orden de las ramas es parte de la regla, no un detalle de estilo.

**Criterio.**

- Nielsen, heurística 9 (_Help users recognize, diagnose, and recover from errors_) y heurística 1
  (_Visibility of system status_): un estado vacío tras un error no es reconocible como error y no
  ofrece recuperación.
- NN/g, _Error Message Guidelines_: el mensaje debe ser específico y explicar qué ocurrió. «No se pudo
  cargar el listado» ante un 403 esconde que el problema es de permisos.
- WCAG 2.2 §4.1.3 Mensajes de estado (AA) — el aviso que aparece sin cambiar el foco debe llegar al
  lector de pantalla. Por eso el bloque de error se marca `role="alert"`.
- **No** aplica §3.3.1 Identificación de errores (A): ese cubre errores **de entrada**, no fallos de
  servidor. Se dice para no citarlo mal.

**Así no:**

```vue
<div v-if="busy" class="state">Cargando…</div>
<div v-else-if="total === 0" class="state empty">{{ emptyText }}</div>
```

**Así sí** — `VetSoftwarePublicFront/src/features/acciones/components/ListBody.vue:140-160`, con la
rama de error primero y la de vacío después:

```vue
<div v-if="busy" class="state">Cargando…</div>
<!-- EST-01: la rama de error va ANTES que la de vacío. Si se invierten, un 500
     vuelve a disfrazarse de «no hay registros». -->
<div v-else-if="listError" class="state-error ds-banner ds-banner--error" role="alert">
  …mensaje del ProblemDetail + chip de traza copiable + «Reintentar»…
</div>
<div v-else-if="total === 0" class="state empty">{{ emptyText }}</div>
```

Y el «Reintentar» vuelve a pedir **la página que falló**, no la primera:
`ListBody.vue:43-44,70,95` mantiene `lastRequestedPage` porque `server.page` solo avanza en el camino
de éxito y tras un fallo al saltar a la 3 seguiría diciendo 2. Perder el sitio al reintentar es el
mismo defecto por el otro lado.

La fuente del dato es `VetSoftwarePublicFront/src/composables/useServerPaged.ts:82-83`, y `error` /
`errorTraceId` se limpian **a la vez** al empezar cada petición (`:60-61`) y en `reset()`
(`:106-107`). Un `error` que sobrevive a la recarga siguiente es otra forma del mismo defecto.

**Verificación hoy.** Sí, **solo en el tenant**, y ahora por los dos lados:

- `VetSoftwarePublicFront/tests/unit/use-server-paged.spec.ts` sujeta las partes 1 y 2:
  `it('expone el detalle que redactó el backend, no el literal genérico')`,
  `it('expone el identificador de traza de la cabecera X-Trace-Id')` con su caída al `traceId` del
  propio `ProblemDetail`, y `it('el literal genérico sigue siendo el suelo cuando no hay cuerpo (un
  timeout)')`. Un segundo `describe` cubre la higiene del estado.
- **Nueva en la 2.ª tanda:** `VetSoftwarePublicFront/tests/unit/list-body-error.spec.ts` sujeta la
  parte 3, que es la que faltaba —
  `it('pinta un role="alert" con el mensaje del ProblemDetail y no el texto de vacío')`,
  `it('ofrece el identificador de la traza para poder reportar el fallo')`,
  `it('«Reintentar» vuelve a pedir LA PÁGINA QUE FALLÓ, no la última servida')` y
  `it('un reintento con éxito borra la alerta y muestra la página pedida')`. El primero es el que
  importa: asserta **las dos cosas a la vez**, que aparece la alerta y que **no** aparece el texto de
  vacío. Comprobar solo lo primero dejaría pasar una plantilla que pintase los dos.
- `getTraceId` tiene además prueba propia: `tests/unit/trace-id.spec.ts`, y esta sí **en los dos
  repos**.

**Alcance del arreglo, con el número real.** `ListBody` lo consumen **8 vistas**, no 16 —siete
clínicas en `src/features/acciones/views/` (`Deworm`, `Hosp`, `Imaging`, `Lab`, `Spa`, `Surgery`,
`Vaccine`) más `src/features/tienda/views/PromocionesView.vue`. Reproducible con
`grep -rl ListBody src/ --include=*.vue`.

**Sin verificar.**

- Los otros 112 errores en línea del tenant, que muestran el mensaje del backend pero se tragan el
  identificador de traza. Abierto en **public-web #64**.
- Que nadie escriba un `catch` mudo **nuevo**, ni invierta el orden de las ramas en **otro**
  componente de listado. Las dos guardas son de `useServerPaged` y de `ListBody`, no de la regla:
  falta el barrido de rejilla — ver «Puertas que faltan».
- **La consola no tiene nada de esto**: ni `useServerPaged`, ni `ListBody`, ni un patrón equivalente
  con guarda.

---

## R06 · `PawLoader` es el único loader, y el movimiento reducido se apaga desde arriba

**Regla.** Cualquier espera se representa con `PawLoader`. Están prohibidos los spinners genéricos,
los iconos de Lucide girando (`RefreshCw`, `Loader2`) y las rotaciones CSS sueltas. Y la guarda de
`prefers-reduced-motion` **es global, de una vez, en `base.css`** — no por componente, porque por
componente no se cierra nunca.

**Criterio.**

- WCAG 2.2 §2.2.2 Pausar, detener, ocultar (A) — el movimiento automático que dura más de cinco
  segundos necesita un mecanismo para detenerlo. Un spinner `infinite` durante una espera de red
  larga entra de lleno.
- WCAG 2.2 §2.3.3 Animación por interacciones (AAA) — la animación disparada por interacción debe
  poder desactivarse.
- Regla del repositorio: un solo loader, con su retardo de 200 ms y su visible mínimo de 300 ms, para
  que la espera corta no parpadee y la larga no parezca colgada (umbrales de NN/g: por debajo de 1 s
  no hace falta indicador; entre 2 y 10 s sí).

**Así no** — lo que había en el POS: un `RefreshCw` con `animation: cash-spin 0.9s linear infinite` y
sin guarda. Dos defectos en cinco líneas.

**Así sí, el loader** — `VetSoftwarePublicFront/src/features/tienda/components/PosCashGate.vue:35`:

```vue
<PawLoader :size="26" :glow="false" :speed="900" label="Validando caja" />
```

`PawLoader` (gemelo TR-02) trae la guarda dentro (`src/components/feedback/PawLoader.vue:120-124`) y
además el nombre accesible: `role="status"`, `aria-label` y un `.ds-sr-only` con el mismo texto. Un
spinner propio no trae nada de eso.

**Así sí, la guarda** — `base.css:108-119` (gemelo TR-02, idéntico en los dos repos desde el split
DS-06), que es lo que entró en la 2.ª tanda y cubre los 328 SFC del tenant de golpe:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Por qué `0.01ms` y no `none`, que es la parte que hay que no olvidar.** `animation: none` cancela
la animación, y con ella **`animationend` y `transitionend` no se disparan nunca**. Cualquier
componente que espere ese evento para limpiar estado —quitar una clase, desmontar un nodo, liberar un
`await`— se queda colgado, y se queda colgado **solo** para el usuario que pidió reducir movimiento,
que es el peor sitio posible para un fallo: nadie lo reproduce. Con `0.01ms` la animación se ejecuta
y termina en el mismo frame, el evento llega, y visualmente no hay movimiento. `animation-iteration-
count: 1` es lo que corta los giros `infinite`, que con solo acortar la duración girarían más rápido.

**Verificación hoy.** Sí, **solo en el tenant**, y sigue siendo la única **prueba** de rejilla del
documento (la otra guarda de rejilla es la de R07, pero esa es Stylelint sobre CSS):
`VetSoftwarePublicFront/tests/unit/loader-guard.spec.ts` barre todos los `.vue` y `.css` de `src/` y
falla si encuentra `animation: … infinite`, `animation-iteration-count: infinite` o `rotate(360deg)`.
No vigila el nombre del componente sino **la firma en CSS de «algo gira para siempre»**.
`PawLoader.vue` es la única excepción por construcción; el resto es una lista de deuda enumerada
fichero a fichero (`loader-guard.spec.ts:36-40`), y la guarda **también falla si aparece un fichero
que no está en la lista** y si una excepción se queda obsoleta. Es un trinquete.

El arreglo concreto lo fija además `VetSoftwarePublicFront/tests/unit/pos-cash-gate.spec.ts`: que el
estado «comprobando» monta `PawLoader`, que **no** queda ningún `.spin`, que el loader va etiquetado
con lo que se está esperando, y que los otros tres estados no montan loader ninguno.

**Aviso que costó una tanda: verificar antes de copiar.** La 1.ª versión de esta ficha decía que en
la consola «la guarda existe pero no alcanza». La lectura del árbol en su momento decía algo peor: el
`main.css` de la consola **no era global** — apagaba la transición y el temblor de exactamente tres
selectores (`.app-inputbox`, `.app-textarea`, `.app-select__trigger`). Copiarlo al tenant no habría
cubierto nada de los 328 SFC. Por eso el bloque nuevo se escribió desde cero con selector universal.
La lección se generaliza: **un fichero gemelo por nombre no es un fichero gemelo por contenido**;
antes de copiar, se lee. `main.css` ya no existe en ninguno de los dos repos: el split DS-06 lo
disolvió en `tokens.css`, `base.css`, `primitives.css` y `app.css`, y el bloque universal que resultó
de esa lectura vive hoy en `base.css:108-119`, gemelo TR-02 idéntico en los dos repos.

**Sin verificar, con un agujero cerrado y dos abiertos:**

- **Ya resuelto — no lo repitas.** Las primitivas gemelas `.ds-field-invalid` y `.ds-field-shake`
  (`primitives.css:797,806`) parecían quedar fuera del bloque de tres selectores del extinto
  `main.css`, pero el bloque universal que lo sustituyó en `base.css:108-119` (`*, *::before,
  *::after`) las cubre sin necesitar una lista propia: es gemelo TR-02, idéntico en los dos repos.
  Cerrado en **admin-web #74**.
- **La guarda de rejilla vive con cinco excepciones reales**, no falsos positivos: cinco giros
  infinitos que EST-11 no tocó porque viven en la capa pública y de autenticación
  (`components/public/AuthSelect.vue`, `components/public/PrimaryButton.vue`,
  `features/auth/views/RestablecerContrasenaView.vue`, `features/registration/views/VerifyEmailView.vue`
  y `assets/styles/public-auth.css`). Cada uno sale de la lista cuando migre a `PawLoader`. Abierto en
  **public-web #112**.
- Y la guarda **no cubre la otra mitad de la regla**: barre animaciones infinitas, no la ausencia de
  `prefers-reduced-motion`, ni que el bloque global siga existiendo. Hoy nadie impide que alguien
  borre `base.css:108-119` y el CI siga verde. Es la guarda más barata que falta de todo el documento.

**Nota de mantenimiento.** Dos comentarios del árbol se quedaron obsoletos con este arreglo y afirman
lo contrario de lo que ahora es cierto: `PosCashGate.vue:199` («`main.css` no declara ninguna») y el
propio texto de **public-web #111**. No son defectos de producto y no llevan issue propio; se
corrigen al pasar por ahí.

---

## R07 · La especificidad se resuelve con `:not()` o con clase de tono, nunca con `!important` sin motivo escrito

**Regla.** Cuando una regla base de un componente gana a la que debería aplicarse, se corrige
**bajando o excluyendo la regla que estorba**, no subiendo la otra a `!important`. Las dos salidas
autorizadas son las de `AGENTS.md`: excluir por `:not()`, o mover el color a una clase de tono
`ds-tone--*` aplicada desde el marcado.

El porqué de la trampa —una primitiva global pesa `(0,1,0)` y la regla base de un `scoped` pesa
`(0,2,0)` por el `[data-v-…]`, así que le gana siempre— está en **`AGENTS.md` (gemelo TR-02), sección
«CSS: consumir el design system, no reescribirlo (FE-08)»**. No se repite aquí.

**Criterio.** Regla del repositorio (FE-08 / DS-08). Un `!important` es deuda: el siguiente que
necesite ganar solo puede responder con otro `!important`, y a partir de ahí el orden de la cascada
lo decide quién grita más fuerte, no el diseño.

**Así no** — `EmployeeFormModal.vue`, donde `.confirm p` pesaba `(0,2,1)` y `.confirm-note` `(0,2,0)`:

```css
.confirm-note {
  margin-top: 10px !important;
  color: var(--warm-500) !important;
}
```

**Así sí** — `VetSoftwarePublicFront/src/features/employees/components/EmployeeFormModal.vue:437-451`.
La descendencia se queda con lo que comparten los dos párrafos y el resto viaja por clase:

```css
.confirm p {
  line-height: 1.55;
}
.confirm p:not(.confirm-note) {
  margin: 0;
  color: var(--warm-700);
}
.confirm-note {
  margin: 10px 0 0;
  color: var(--warm-500);
}
```

**Enmienda de la 2.ª tanda: hay una tercera salida autorizada, y es la mejor de las tres.** La 1.ª
versión de esta ficha decía que toda excepción se declara «en `overrides`, por fichero concreto» y
«nunca con un `/* stylelint-disable */` suelto». La segunda mitad sigue valiendo —**suelto**, es
decir sin motivo, no se admite— pero la primera está mal ordenada. El caso que lo demuestra es la
guarda global de R06: `base.css:106-119` usa

```css
/* stylelint-disable declaration-no-important -- DS-08: guardián de exclusión no
   intercambiable (FE-08); el motivo completo está en el comentario de arriba. */
```

y es **correcto**, por dos razones que se pueden comprobar:

1. `stylelint.config.mjs:17-19` (gemelo TR-02) declara `reportDescriptionlessDisables: true`,
   `reportInvalidScopeDisables: true` y `reportNeedlessDisables: true`. Un `disable` sin `-- motivo`
   **falla el gate**, y un `disable` que deje de hacer falta **también falla**. La excepción en línea
   se caduca sola.
2. Un `overrides` **no tiene ninguna de esas tres comprobaciones**, y por eso produjo un defecto real:
   `stylelint.config.mjs` es gemelo byte a byte, así que el override de `DateInput.vue` —tenant, donde
   `vue-datepicker-next` teletransporta `.mx-datepicker-main` a `<body>`— viaja también a la consola,
   **donde ese fichero no existe**. Hoy no permite nada; mañana preautoriza en silencio cualquier
   `!important` que alguien escriba en esa ruta. Abierto en **admin-web #81**.

Orden de preferencia, entonces: `:not()` o clase de tono → `stylelint-disable` **en línea, con `--`
motivo** → `overrides` por fichero, y solo si el fichero existe en los dos repos. Nunca un
`!important` a secas.

**Verificación hoy.** Sí, **en los dos repos**: `declaration-no-important: true` en
`stylelint.config.mjs:41`, dentro de `npm run stylelint:strict`, que es parte de `npm run quality` y
por tanto del gate de CI, del de release y del `lint-staged` del pre-commit. Es la única regla de este
documento que corre en el pre-commit.

**Sin verificar.**

- Que la excepción de `DateInput.vue` no crezca por dentro: el override apaga la regla para el fichero
  entero, no para la declaración concreta. Migrarla a `stylelint-disable` en línea la haría auditable
  y de paso cerraría **admin-web #81** sin tocar nada más.
- Que la primitiva de exclusión no se duplique: `vetsoftware/no-duplicate-primitive` mira `<style>` de
  SFC, no bloques de `base.css`.

---

## R08 · Idioma declarado, y título que describa la pantalla

**Regla.** El `<html>` declara el idioma real del contenido. Y el título de la página describe la
pantalla, no el producto.

**Criterio.**

- WCAG 2.2 §3.1.1 Idioma de la página (A) — «The default human language of each Web page can be
  programmatically determined». No es cosmético: el lector de pantalla elige voz y reglas de
  pronunciación por ese atributo. Con `lang="en"` en una aplicación en español, «Configuración» se lee
  con fonética inglesa y no lo entiende nadie.
- WCAG 2.2 §2.4.2 Página titulada (A) — «Web pages have titles that describe topic or purpose». En una
  SPA lo cumple el router actualizando `document.title` en cada navegación.

**Así sí** — `VetSoftwareFront/index.html:2`, que era el que estaba mal; el tenant ya lo tenía bien:

```text
<html lang="es">
```

**Verificación hoy.** Solo la mitad, y solo en la consola:
`VetSoftwareFront/tests/unit/security-headers.spec.ts:93-113` comprueba con expresión regular que el
elemento raíz declara `lang="es"` y que **no queda ningún resto** de `lang="en"` en el fichero —
importante, porque el fallo original venía de una plantilla en inglés, y esas vuelven solas.

**Sin verificar.**

- El tenant **no tiene** esa guarda. Hoy su `index.html:2` dice `lang="es"`, pero nada lo sujeta. La
  prueba es de cuatro líneas y `security-headers.spec.ts` existe en los dos repos: copiar el
  `describe` evita que el front que hoy está bien se estropee en silencio.
- **El título.** `VetSoftwarePublicFront/index.html:7` y `VetSoftwareFront/index.html:13` declaran
  ambos `<title>VetSoftware</title>`, y no hay ni una asignación de `document.title` en `src/` de
  ninguno de los dos repos (cero ocurrencias, reproducible con `grep -rn "document.title" src/`). Con
  `grep -c "name: " src/router` salen **44 rutas con nombre en el tenant y 37 en la consola** (47 y 38
  contando `path:`), todas con el mismo título: con varias pestañas abiertas —caja en una, historia
  clínica en otra, que es exactamente cómo se usa esto— son indistinguibles, y el historial del
  navegador tampoco sirve. Es §2.4.2 (A) incumplido en las dos aplicaciones enteras. **Ya no está sin
  issue: public-web #133.**
- El exportador del lienzo de diseño de la consola vuelve a generar HTML sin idioma declarado, así que
  reintroduce el defecto en cada tablero nuevo. Abierto en **admin-web #73**.

---

## R09 · Sellar el trabajo con `pagehide`, nunca con `beforeunload`

**Regla.** El borrador que hay que salvar cuando el usuario se va se persiste en `pagehide` y en
`visibilitychange`. **`beforeunload` no se registra**, ni siquiera sin `preventDefault`.

**Criterio.** Rendimiento y no pérdida de trabajo, en ese orden inverso al habitual:

- Registrar `beforeunload` **descalifica la página entera del back/forward cache** en Chrome y
  Firefox. Eso penaliza cada «atrás» de toda la aplicación, no solo el de esta pantalla.
- Y no gana nada a cambio: `pagehide` se dispara en la misma descarga y antes de que la pestaña entre
  en bfcache, y además cubre el caso que `beforeunload` no cubre — en móvil y en iOS el navegador
  puede congelar la pestaña sin dispararlo nunca. `visibilitychange` cubre el cambio de app o de
  pestaña, que es el más frecuente de los tres.

**Impacto clínico.** Es la regla que decide si la consulta a medio escribir sobrevive a que el
auxiliar se lleve el móvil al box. Y la que decide si volver atrás repinta la pantalla o la reconstruye
desde cero con el animal encima de la mesa.

**Así sí** —
`VetSoftwarePublicFront/src/features/dashboard/views/consulta/nueva/stores/nuevaConsultaDraft.store.ts:333-346`:

```ts
if (typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', persistNow)
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', /* … */)
}
```

Y el sellado en `pagehide` es **inmediato**: no espera al retardo de 400 ms del `watch`, porque en
una descarga ese retardo no llega nunca.

**Verificación hoy.** Sí, **solo en el tenant** (la consola no tiene borradores):
`VetSoftwarePublicFront/tests/unit/nueva-consulta-draft.spec.ts`, `describe('sellado al descargar la
pestaña (VUE-09)')`, con `it('NO registra ningún «beforeunload»')` como guarda literal de la
regresión, más el caso de que el `pagehide` sella sin esperar al retardo.

**Sin verificar.** La guarda mira **el store**. La propia vista del asistente registra otro
`beforeunload` por su cuenta, así que la pantalla sigue fuera del bfcache pese al arreglo: el defecto
está corregido a medias. Abierto en **public-web #116**.

---

## R10 · El color de texto se mide antes de entrar, y el remedio se aplica en un solo sitio

**Regla.** Dos partes:

1. **Todo color de texto se mide** contra las dos superficies reales del producto (`--warm-50` en el
   lienzo, blanco puro dentro de una `.ds-card`) y tiene que alcanzar **4,5:1** si es texto normal.
   «Se ve bien» no es una medida, y con una rampa OKLCH nadie mira `oklch(58% 0.012 60deg)` y deduce
   que da 4,17:1.
2. **Cuando el token falla, se corrige el token — no las clases que lo consumen, y desde luego no las
   dos cosas.** Dos remedios al mismo defecto **se suman en el resultado**: el usuario no ve «el
   arreglo», ve la suma.

**Criterio.** WCAG 2.2 §1.4.3 Contraste mínimo (AA): 4,5:1 para texto normal, 3:1 para texto grande
(≥ 18,5 px, o 14 px en negrita). El texto secundario de este sistema mide 11,5–12 px, así que no entra
por ningún lado en la excepción: le aplica el 4,5:1.

**Así no** — `--warm-500: oklch(58% 0.012 60deg)`, el valor que hubo antes de A11Y-02.

**Así sí** — `tokens.css:68-76` (gemelo TR-02):

```css
/* A11Y-02 / A11Y-09: 58% daba 4,15:1 sobre `--warm-50`, por debajo del
   4,5:1 que exige WCAG 2.2 §1.4.3 para texto normal — es el color real
   detrás de `--text-subtle`/`.ds-hint`/`.ds-meta`/`.ds-icon-muted`. 55%
   daba 4,72:1 SOLO sobre `--warm-50`; sobre `--warm-100`
   (`.ds-panel`/`.ds-card--flat`) medía 4,44:1, sobre `--warm-150`
   4,19:1 y sobre `--amatista-50` 4,43:1 — los tres por debajo del
   mínimo. 52% da 5,38:1 / 5,07:1 / 4,78:1 / 5,06:1 respectivamente:
   margen real sobre las cuatro superficies donde este color aparece. */
--warm-500: oklch(52% 0.012 var(--hue-neutral));
```

**Medido, no citado de memoria — y pasó por dos rondas.** La 1.ª corrección (55%) solo se verificó
contra `--warm-50`, la superficie que motivó el arreglo, y ahí pasaba. Pero `.ds-hint` / `.ds-meta` /
`.ds-icon-muted` también aparecen sobre `--warm-100`, `--warm-150` y `--amatista-50`, y en esas tres
el 55% quedaba por debajo del mínimo. Reproduciendo la conversión del propio repositorio (OKLCH →
sRGB con las matrices de CSS Color 4, recorte a gamut, luminancia relativa de WCAG 2.x):

| Valor                    | `--warm-50` | `--warm-100` | `--warm-150` | `--amatista-50` |
| ------------------------ | ----------- | ------------ | ------------ | ---------------- |
| `58%` (antes de A11Y-02) | 4,15:1 ❌   | —            | —            | —                 |
| `55%` (1.ª corrección)   | 4,72:1 ✅   | 4,44:1 ❌    | 4,19:1 ❌    | 4,43:1 ❌         |
| `52%` (ahora)            | 5,38:1 ✅   | 5,07:1 ✅    | 4,78:1 ✅    | 5,06:1 ✅         |
| `--warm-600` a `45%`     | 7,25:1      | —            | —            | —                 |

**El remedio descartado, y por qué importa.** La otra vía era dejar `--warm-500` como estaba y mover
`.ds-hint` / `.ds-meta` / `.ds-icon-muted` a `--warm-600`. Es igual de válida por separado. Lo que no
se puede es **aplicar las dos**: eso lleva el texto secundario de 4,15:1 a 7,25:1 de golpe —un salto
de gris medio a casi negro, que borra la jerarquía visual entre texto principal y secundario. La regla
generalizable: **un defecto de contraste, un remedio**, y se elige el que esté más arriba en la
cadena, porque cubre a todos los consumidores presentes y futuros.

**Alcance real, con los números reproducibles.** Este cambio es de un token gemelo, pero **no impacta
igual a los dos fronts**, y conviene decirlo porque invita a un error de coordinación:

| Qué se cuenta                                | Tenant | Consola |
| -------------------------------------------- | ------ | ------- |
| `.ds-hint` en `.vue`                         | 76     | **0**   |
| `.ds-meta` en `.vue`                         | 198    | **0**   |
| `.ds-icon-muted` en `.vue`                   | 32     | **0**   |
| `var(--warm-500)` directo en `.vue`          | 182    | 5       |
| `var(--warm-500)` directo en `.css` de `src` | 6      | 6       |

Reproducible con `grep -roE "\bds-meta\b" src --include=*.vue | wc -l`. Las tres clases de texto
secundario están declaradas en `primitives.css` (gemelo) y **no las usa ni un SFC de la consola**: allí
el cambio llega por los 11 usos directos del token. Es el mismo archivo, con dos alcances distintos.

**Verificación hoy. Solo en la consola, sobre el archivo gemelo.**
`VetSoftwareFront/tests/unit/tokens-contrast.spec.ts`, `describe('texto secundario (A11Y-02 / WCAG 2.2
§1.4.3, AA)')`, con tres asertos que se complementan:

- `it('--warm-500 contrasta 4,5:1 o más con la superficie y con blanco')` — el token.
- `it('--text-subtle es --warm-500, no un tono suelto')` — el alias semántico, para que no se despegue
  y deje la medida de arriba vigilando algo que ya nadie usa.
- `it.each(['.ds-hint','.ds-meta','.ds-icon-muted'])('%s contrasta 4,5:1 o más …')` — lee el `color`
  que **realmente declara** cada regla de `primitives.css`, resuelto o literal, así que sigue midiendo
  aunque mañana alguien despegue la clase del token y escriba un `oklch()` a mano.
- Y la contrapartida que hace fiable a las tres:
  `it('reprueba el --warm-500 al 58 % que había antes de A11Y-02')`, que exige `≈ 4,17:1`. Sin ella,
  una fórmula rota que devolviese siempre un número alto daría por bueno cualquier gris.

**Sin verificar.**

- **El tenant no tiene esta guarda**, y es el repo donde viven los 306 usos de las tres clases. Su
  `tokens-contrast.spec.ts` tiene 112 líneas y mide solo los anillos. El archivo vigilado es gemelo;
  la vigilancia, no.
- El resto de la rampa: `--text-muted`, `--warm-400` sobre superficies claras, los tonos de
  `--danger-*`/`--warning-*` sobre sus banners, y todo el color de estado. La guarda cubre un token de
  texto y tres clases.
- El **texto sobre color**, que es el caso que más se rompe al cambiar de tono: `.ds-badge`,
  `.ds-chip` y los banners pintan texto sobre fondos tonales y nadie mide ese par.

---

## R11 · Un estado no reescribe un token a mano: lo consume

**Regla.** Si existe un token para un efecto (anillo de foco, sombra, borde de estado), **la clase de
estado lo consume con `var()`**. Escribir el valor a mano —aunque hoy sea el mismo valor— es lo que
saca a esa clase del alcance de cualquier guarda que se ponga sobre el token.

Es la regla de fondo de toda la 2.ª tanda, y la que más lejos llega: **una guarda protege el token,
no el efecto**. Cada copia manuscrita de un valor tokenizado es un punto ciego que se descubre por el
lado del usuario, no por el del CI.

**Criterio.** WCAG 2.2 §1.4.11 Contraste no textual (AA) para el valor en cuestión, y regla del
repositorio FE-08 (consumir el design system, no reescribirlo) para la forma. El criterio de
accesibilidad dice cuánto; la regla del repo dice **dónde vive ese cuánto**, que es lo que decide si
se puede vigilar.

**Así no** — `primitives.css`, hasta la 2.ª tanda. `--ring-danger` ya estaba arreglado y medido en
5,16:1; esta clase, a dos pantallas de distancia, seguía con el color retirado:

```css
.ds-field-invalid-focus {
  border-color: oklch(55% 0.22 25deg);
  box-shadow: 0 0 0 3px var(--danger-200); /* 1,29:1 */
}
```

El detalle que lo vuelve grave: es el foco del **campo inválido**, es decir justo el momento en que el
usuario más necesita ver dónde está. Y son 5 componentes del tenant (`BaseInput`, `BaseSelect`,
`BaseTextarea`, `OwnerSearchAutocomplete`, `DateInput`).

**Así sí** — `primitives.css:837-845` (gemelo TR-02). El `border-color` también se destapó a mano en
algún punto y ya está tokenizado (`--danger-border`), así que hoy no queda ni un valor suelto en la
clase:

```css
.ds-field-invalid-focus {
  border-color: var(--danger-border);

  /* A11Y-02: `0 0 0 3px var(--danger-200)` a mano daba 1,25:1 — el mismo
     defecto que A11Y-01 corrigió en `--ring-danger` (5,16:1, sujeto por
     `tests/unit/tokens-contrast.spec.ts`) pero por la puerta de al lado.
     Hereda el token en vez de mantener su propia guarda. */
  box-shadow: var(--ring-danger);
}
```

**Verificación hoy. Solo en la consola**, `VetSoftwareFront/tests/unit/tokens-contrast.spec.ts`,
`describe('foco sobre campo inválido (A11Y-02 / WCAG 2.2 §1.4.11, AA)')`, con tres capas:

- `it('hereda el anillo de --ring-danger en vez de escribirlo a mano')` — la regla, literal.
- `it('no vuelve a --danger-200')` — el regreso probable, que no es inventar un color sino restaurar
  el suave de antes.
- `it('el anillo que consume sigue en 3:1 o más')` — **el aserto que hace de esto una regla y no una
  convención**: recorre `.ds-field-invalid-focus` → `--ring-danger` → token de color y vuelve a medir
  por esa vía. Consumir el token no basta si el token se degrada.

Y su docblock deja escrito el porqué de que la guarda viva ahí: en la consola la clase está
**huérfana** —ningún componente la aplica— pero `primitives.css` es gemelo byte a byte, así que **la
regresión se introduciría en la consola y se sufriría en el tenant**. Es el argumento de por qué las
guardas sobre ficheros gemelos deben existir en los dos repos, aunque en uno no haya consumidores.

**Sin verificar.**

- **El tenant no tiene esta guarda**, y es donde están los cinco consumidores.
- El barrido de la regla completa: **cuántos otros valores tokenizados están escritos a mano**. La
  guarda mira una clase. Los candidatos conocidos son los tres `box-shadow` de foco con `color-mix`
  dentro de `<style scoped>` (**public-web #134**) y las sombras de `.ds-card` frente a `--shadow-*`,
  que nadie ha censado. Este es el barrido de rejilla con más retorno de todo el documento: es
  gramatical, se hace leyendo el CSS y no necesita navegador.

---

## R12 · La clave de un `v-for` es identidad: ni la posición, ni el contenido

**Regla.** En una lista **mutable** —donde se insertan, borran o reordenan filas— la `:key` es un
identificador de identidad. **Nunca el índice** y **nunca un valor derivado del contenido**. Si la
fila la crea este componente, nace con su `uid`; si llega por props y no se puede escribir dentro, la
asociación vive fuera, en un `WeakMap`.

**Criterio.**

- Guía de estilo de Vue, regla de prioridad A: `v-for` con `key`. Y su matiz, que es el que aquí
  importa: la clave debe ser **estable y única**, porque decide qué nodo del DOM reutiliza Vue.
- No hay criterio WCAG. Es una regla de **no perder trabajo**, que en esta aplicación va por delante
  de casi todo.

**El fallo concreto.** Con el índice como clave, borrar la segunda de tres filas hace que la tercera
pase a ser la «2» y **herede el nodo —y el estado interno— de la que se eliminó**: el campo de
cantidad conserva el valor de la fila borrada. En listas de solo lectura da igual; en las que capturan
cantidades y precios es un error de captura difícil de reproducir y fácil de facturar.

**Así no:**

```vue
<DetailField v-for="(f, idx) in fields" :key="idx" />
<div v-for="(f, i) in files" :key="i" class="file-row">
```

**Así sí, para filas propias** — `VetSoftwarePublicFront/src/composables/rowUid.ts:21-23`, un contador
de vida corta:

```ts
let seq = 0
export function nextRowUid(): number {
  return ++seq
}
```

**Así sí, para filas que llegan por props** — `rowUid.ts:40-49`, nuevo en la 2.ª tanda. No se puede
escribir un `uid` dentro de una fila `readonly`, así que la asociación vive fuera:

```ts
const uidByRow = new WeakMap<object, number>()

export function rowUidOf(row: object): number {
  let uid = uidByRow.get(row)
  if (uid === undefined) {
    uid = nextRowUid()
    uidByRow.set(row, uid)
  }
  return uid
}
```

Al ser débil no retiene nada: cuando la fila desaparece del borrador, su entrada se recolecta sola.

**Los dos límites, que hay que leer antes de usarlo:**

- `rowUidOf` **exige identidad de objeto estable**. Sirve para `:items="props.existing"`, que se pasa
  tal cual; **no** para una lista que un `computed` reconstruye en cada render, donde cada pasada
  crearía objetos nuevos y por tanto claves nuevas — que es exactamente el defecto que se quería
  evitar, con más pasos.
- **Una clave de contenido solo vale en listas inmutables.**
  `VetSoftwarePublicFront/src/features/acciones/modals/AccionDetailModal.vue:36-37` pasó de `:key="idx"`
  a `:key="f.label"` y es correcto **porque esa lista no se edita** y las etiquetas de un detalle son
  únicas por construcción. Si mañana esa lista admite filas repetidas, vuelve el defecto.

**Verificación hoy. Solo en el tenant**, y por los dos lados:

- `VetSoftwarePublicFront/tests/unit/row-uid.spec.ts` fija **por qué la clave no puede derivarse del
  contenido**, que fue la primera opción propuesta y no se sostiene:
  `it('distingue dos filas de contenido idéntico')` —dos cargos generales del mismo concepto e importe
  son dos cargos, no uno— e `it('identifica una fila recién creada, que aún no tiene ningún dato')`.
- **Nueva en la 2.ª tanda:** `VetSoftwarePublicFront/tests/unit/lab-results-adjuntos.spec.ts` prueba el
  comportamiento, no la implementación:
  `it('borrar el segundo de tres deja el primero y el TERCERO, no el primero y el segundo')` es
  literalmente el bug, escrito como aserto. Más
  `it('dos adjuntos con el MISMO nombre siguen siendo dos filas distintas')` —el caso que hunde
  cualquier clave por nombre— y `it('reabrir el modal vacía la lista: no arrastra los adjuntos del
  examen anterior')`.

**Sin verificar.**

- **`rowUidOf` no tiene ni un aserto.** `row-uid.spec.ts` cubre `nextRowUid` y nada más; la parte del
  `WeakMap`, que es la que entró ahora y la que tiene la trampa de la identidad de objeto, no la mira
  nadie. Es el hueco más barato de esta ficha: tres asertos —mismo objeto → misma clave, objeto
  distinto con igual contenido → clave distinta, y el `computed` que reconstruye → claves nuevas, como
  documentación ejecutable del límite.
- El barrido de rejilla: **ningún `:key="idx"` ni `:key="i"` en un `v-for` sobre una lista editable**,
  en ninguno de los dos repos. Es gramatical y se comprueba leyendo el template.
- **La consola no tiene `rowUid.ts` ni guarda equivalente**, y sus tablas de catálogo también editan
  filas.

---

## R13 · Un apagado de regla se acota a la línea y lleva motivo escrito; nunca al fichero

**Regla.** Cuando de verdad hay que desactivar una regla de lint, se desactiva **la línea concreta**,
**la regla concreta** y **con el motivo escrito al lado**. Un `/* eslint-disable */` de fichero, o un
`overrides` que apaga la regla para todo un archivo, no distingue entre los tres casos que hacían
falta y **cualquier caso que se cuele después**: la regla queda muerta para todo el módulo, en
silencio, y nadie se entera hasta que el defecto sale por el otro lado.

Y antes de apagar: **casi siempre la salida no es apagar, es tipar**. Un `any` con `eslint-disable`
alrededor es una afirmación sin comprobar; una declaración de tipos es la misma afirmación, comprobada
por el compilador, y además documenta la superficie que el proyecto usa de verdad.

**Criterio.** Regla del repositorio. No hay criterio WCAG ni de Vue que citar, y se dice: esto es
higiene de puertas. Pero tiene consecuencia directa en accesibilidad, porque **las guardas de este
documento valen lo que valga su capacidad de fallar**, y una regla apagada por fichero no falla nunca.

**Así no** — `useRecaptcha.ts`, hasta la 2.ª tanda: un `eslint-disable` que cubría toda la función
exportada para autorizar tres `any`.

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
export function useRecaptcha() {
  const grecaptcha = (window as any).grecaptcha
  widgetId = grecaptcha.render(el, { sitekey: siteKey })
  // …
}
/* eslint-enable @typescript-eslint/no-explicit-any */
```

**Así sí** — `VetSoftwarePublicFront/src/types/grecaptcha.d.ts`, que declara **solo la superficie que
el proyecto usa** (`render`, `getResponse`, `reset`), no la API completa de Google, y
`VetSoftwarePublicFront/src/features/registration/composables/useRecaptcha.ts:93-97`:

```ts
const { grecaptcha } = window
// El script resolvió pero el objeto no está: el `catch` de abajo lo trata como
// el fallo de carga que es. Antes este caso reventaba con un TypeError suelto,
// porque el `any` daba por hecho que `grecaptcha` existía.
if (!grecaptcha) throw new Error('reCAPTCHA cargó sin exponer window.grecaptcha')
```

Los dos detalles que hacen que esto sea una mejora de comportamiento y no solo de tipos:

- `grecaptcha?: Grecaptcha` es **opcional a propósito**: entre que se inserta el `<script>` y termina
  de cargar, la propiedad no existe. Esa ventana es justo la que había que comprobar y la que el `any`
  escondía. Antes, caer ahí producía un `TypeError` suelto; ahora entra por el `catch` que ya existía y
  el usuario ve el fallo de carga que es.
- `const CALLBACK_NAME = '__vetRecaptchaOnLoad' as const` (`:44-50`): con el `as const`, el tipo es el
  literal, así que `window[CALLBACK_NAME]` resuelve contra la clave declarada en el `.d.ts` y el
  compilador comprueba que **los dos lados hablan del mismo identificador**. Sin él se indexa a ciegas.

**El otro lado de la misma regla, y aquí sí hay gate.** En Stylelint el apagado en línea es la forma
**preferida** porque el repo lo hizo comprobable: `stylelint.config.mjs:17-19` (gemelo TR-02) declara
`reportDescriptionlessDisables`, `reportInvalidScopeDisables` y `reportNeedlessDisables` en `true`. Un
`stylelint-disable` sin `-- motivo` falla el gate; uno que deje de hacer falta, también. Ver la
enmienda de R07.

**Verificación hoy.** Parcial, y asimétrica:

- **CSS: sí, en los dos repos.** Las tres opciones de arriba, dentro de `npm run stylelint:strict` →
  `npm run quality` → CI y pre-commit.
- **TypeScript: no.** ESLint **no** tiene activado `reportUnusedDisableDirectives`, ni `eslint-comments`
  con `require-description`, en ninguno de los dos repos. Un `eslint-disable` de fichero, sin motivo,
  pasa hoy exactamente igual que antes de este arreglo. Lo que se arregló es **este** fichero, no la
  regla.

**Sin verificar.**

- Cualquier otro `eslint-disable` de fichero que haya o que entre mañana.
- Y el agujero que degrada todo lo demás: **`tests/` está fuera de `tsconfig` y de la configuración de
  ESLint** en los dos repos (**public-web #117**, **admin-web #76**). Un spec con los tipos rotos pasa
  en verde, y una constante declarada y nunca usada dentro de una guarda no produce ni un aviso. Eso
  no es una nota al pie: es la razón por la que la tabla de cobertura de este documento vale menos de
  lo que parece.

---

## R14 · Un hueco honesto antes que un dato inventado

**Regla.** Si el dato no está, **no se pinta la línea**. Ni un valor de ejemplo, ni un contador
plausible, ni el nombre de nadie. Y **nunca se paga una petición extra para rellenar un adorno**: si
el hueco solo existe por estética, el arreglo es quitar el hueco, no ir a buscar el dato.

**Criterio.**

- Nielsen, heurística 1 (_Visibility of system status_): la interfaz debe informar del estado real. Un
  contador inventado no informa: **desinforma con la misma cara con la que informa**, que es peor que
  no mostrar nada.
- Nielsen, heurística 9: un dato falso no es un error visible, así que el usuario no puede
  reconocerlo, diagnosticarlo ni recuperarse de él. Nunca sabrá que estaba mirando una mentira.
- WCAG 2.2 §4.1.2 Nombre, función, valor (A) en el caso concreto del botón de cuenta: el texto visible
  es también su nombre accesible. Un nombre vacío es un botón sin nombre; un nombre falso es peor.

**Impacto.** En la consola de plataforma, siete contadores fijos («Empresas 128», «Empleados 1.8k»,
«Módulos 14», «Permisos base 38»…) que ninguna consulta produce. En el tenant, **cada empleado veía el
nombre de otra persona —«Mariana Rojas, Veterinaria, Clínica Norte»— justo encima de su propio botón de
cerrar sesión**. No es un detalle de maqueta: es un dato de identidad falso en el control más
sensible del layout.

**Así no** — `VetSoftwareFront/src/components/layout/AppSidebar.vue`, antes:

```ts
{ label: 'Empleados', path: '/empleados', icon: ICONS.EMPLOYEE, count: '1.8k' },
```

**Así sí, el dato real cuando existe** — `VetSoftwarePublicFront/src/components/layout/AppSidebar.vue:102-107`,
que ahora sale de la sesión y no de un mock:

```ts
const { me } = useAuth()
const nameParts = computed(() => me.value?.name.trim().split(/\s+/).filter(Boolean) ?? [])
```

**Así sí, el hueco cuando no existe** — `SidebarBrand.vue:9,18` y `SidebarUserCard.vue:13,86` hacen
opcional la prop y la línea no se pinta:

```vue
<div v-if="clinic" class="clinic">{{ clinic }}</div>
<div v-if="role" class="role">{{ role }}</div>
```

**El criterio que fijó este arreglo, y que es lo que hay que recordar.** `/auth/me` **no entrega ni el
rol ni el nombre de la empresa**. Había tres salidas y solo una es aceptable:

1. Dejar el mock. Es mentir. Descartada.
2. Pedir el dato: `GET /companies/{id}` para el nombre de la empresa. Exige el permiso `company.read`,
   que la mayoría de empleados no tiene, y añade una petición al arranque de **cada** navegación para
   pintar una línea decorativa. Un adorno no justifica una petición, y mucho menos una que falla con
   403 para el usuario típico. Descartada.
3. **Quitar la línea.** Elegida. El comentario queda en el marcado
   (`AppSidebar.vue:120-124`) para que el siguiente que pase sepa que es una decisión y no un olvido, y
   apunta a que la sede real ya la muestra el `BranchSelector` justo debajo — el hueco ni siquiera deja
   al usuario sin contexto.

Corolario, para el caso del nombre vacío mientras `/auth/me` no ha respondido: el botón cae a
`'Mi cuenta'` (`SidebarUserCard.vue:21-27`), **un rótulo genérico del control, que no finge ser el
nombre de nadie**. Un botón sin texto es un botón sin nombre accesible; la salida es nombrar el
control, no inventar el dato.

**Verificación hoy. Solo en la consola**, y con la forma correcta:
`VetSoftwareFront/tests/unit/sidebar-sin-cifras-inventadas.spec.ts`,
`describe('sidebar sin cifras inventadas (EST-12)')`. No comprueba que falten siete `count` concretos
—eso lo pasaría también un octavo recién añadido— sino que **ningún nodo de texto del `<nav>` tiene
forma de cifra**, recorriendo el DOM con un `TreeWalker`. Y trae su contrapartida:
`it('recorre de verdad los enlaces del menú')`, porque un `<nav>` vacío —montaje fallido en silencio,
marcado cambiado— haría pasar la primera prueba sin mirar nada.

**Sin verificar.**

- **La pantalla de inicio del tenant sigue siendo un mock entero.**
  `VetSoftwarePublicFront/src/features/dashboard/views/HomeView.vue:7,11` importa `mockUser`,
  `mockDayStats` y `mockRecentConsultations`: saluda «Hola, **Mariana**», anuncia 8 citas para hoy
  (1 en curso, 5 pendientes, 2 completadas) y lista consultas recientes inventadas. Es la **primera
  pantalla tras el login**. El arreglo del sidebar quitó el nombre falso del pie y lo dejó intacto en
  la cabecera, tres centímetros más arriba. Hay que abrirle issue (ver abajo).
- Que la consola no vuelva a inventar **fuera del `<nav>`**: la guarda mira ese landmark, y ahí es
  donde estaban los siete contadores, pero un dato falso en una tarjeta del dashboard pasa limpio.
- **El tenant no tiene guarda equivalente** para su propio sidebar.

---

## R15 · Una tabla ancha se desplaza, no se recorta

**Regla.** Ningún contenedor de tabla lleva `overflow: hidden`. Si la tabla puede ser más ancha que su
caja, se envuelve en `.ds-table-scroll` (primitiva gemela, `primitives.css:753-756`), que aporta el
`overflow-x: auto`. El redondeo de esquinas, que suele ser el motivo real por el que alguien escribió
el `hidden`, se resuelve con `border-radius: inherit` en el envoltorio.

**Criterio.**

- WCAG 2.2 §1.4.10 Reflow (AA) — el contenido debe presentarse sin exigir desplazamiento en **dos**
  dimensiones… salvo para el contenido que lo requiere por su naturaleza, y **las tablas de datos son
  el ejemplo explícito** del criterio. Es decir: la tabla puede desplazarse en horizontal; lo que **no**
  puede es quedar cortada. `overflow: hidden` no adapta nada — hace inalcanzables las últimas
  columnas.
- WCAG 2.2 §2.1.1 Teclado (A) para la otra mitad, la que aún falta: una región desplazable tiene que
  poder desplazarse **sin ratón**. Es la regla `scrollable-region-focusable` de axe-core.

**Impacto clínico.** Una tabla de kardex o de cargos con ocho columnas en un portátil de 13" pierde
las dos últimas —que suelen ser importe y acciones—. Sin barra, sin sombra, sin ninguna señal de que
falta algo: el usuario no sabe que no lo está viendo todo.

**Así no** — `VetSoftwareFront/src/components/ui/AppTable.vue`, antes:

```css
.tabla-caja {
  padding: 0;
  overflow: hidden; /* «para que la caja recorte las esquinas de la tabla» */
}
```

**Así sí** — `VetSoftwareFront/src/components/ui/AppTable.vue:10,29-42`. El envoltorio va **entre** la
caja y la tabla, que es el único sitio donde el `overflow-x` funciona sin romper el redondeo:

```vue
<div class="ds-card ds-card--flat tabla-caja">
  <div class="ds-table-scroll tabla-scroll">
    <table class="tabla">
```

```css
.tabla-caja {
  padding: 0;
}

/* `.ds-table-scroll` aporta el `overflow-x:auto`; eso ya establece un contexto
   de recorte, así que basta con heredar el radio de la caja. */
.tabla-scroll {
  border-radius: inherit;
}
```

**Verificación hoy. Solo en la consola**, que es donde vive `AppTable`:
`VetSoftwareFront/tests/unit/app-table-scroll.spec.ts`,
`describe('AppTable — scroll horizontal (EST-10 / WCAG 2.2 §1.4.10, AA)')`, con cuatro asertos que
cubren las tres cosas que se pueden deshacer por separado:
`it('envuelve la tabla en un contenedor .ds-table-scroll')`,
`it('el contenedor de scroll está ENTRE la caja y la tabla')` —el orden importa: por fuera de la caja
no recorta nada—, `it('.tabla-caja ya no declara overflow: hidden')` y
`it('.ds-table-scroll sigue aportando overflow-x: auto')`, que vigila la primitiva gemela desde aquí.

**Sin verificar, y es la mitad que falta de la regla.**

- **La región desplazable no es alcanzable por teclado.** `.ds-table-scroll` no lleva `tabindex="0"`,
  ni `role="region"`, ni nombre accesible. Quien navega solo con teclado no puede desplazarla: llega al
  primer control de dentro o no llega a nada. Es §2.1.1 (A) —más grave que el §1.4.10 (AA) que se acaba
  de arreglar— y afecta a **todos** los usos de la primitiva: 1 en la consola (`AppTable`, y con él
  todas sus tablas) y **11 en el tenant** (`ListBody`, `LibroComprasView`, `FeDocumentDetail`,
  `DocumentosView`, `ReportesView` ×4, `MedicamentosView` ×2, `ImpuestosView` ×2). El arreglo es una
  primitiva, no once parches. Hay que abrirle issue.
- Que ningún **otro** contenedor de tabla declare `overflow: hidden`. La guarda mira `AppTable`. En el
  tenant, `ListBody.vue:282-290` declara `.table { overflow: hidden }` sobre el propio `<table>` — que
  no es el mismo defecto (recorta el redondeo, no las columnas, porque el scroll lo pone el envoltorio
  de `:161`), pero es la misma frase a un `:deep()` de distancia.
- Que la tabla **anuncie** que se puede desplazar. No hay sombra de borde ni indicador; un usuario con
  ratón lo descubre arrastrando.

---

## Apéndice · los arreglos que no dejaron regla de interfaz

**VUE-12** borró `byStatus` de `useLabQueue`: una función exportada, con tipo y todo, que no llamaba
nadie. No es una regla de UX y no tiene criterio que citar, pero sí una consecuencia que sí lo es —
una API muerta en un composable es una invitación a construir encima de ella una pantalla que nunca
se probó. Hoy no lo verifica nada: ESLint no marca exports sin consumidores, y `tests/` está fuera de
`tsconfig` y de la configuración de ESLint, así que ni siquiera un spec con los tipos rotos falla
(**public-web #117**, **admin-web #76** — afecta a la fiabilidad de todas las guardas de este
documento).

**La cifra de `AGENTS.md`.** La regla A11Y-01 afirmaba «985 usos de `.ds-btn`», una cifra que no
reproducía ningún conteo, **en el párrafo que prohíbe calcular de memoria** (**public-web #131**,
**admin-web #83**). Se está corrigiendo en el árbol ahora mismo, desglosada por repo (152 + 833). No
es una regla nueva; es el recordatorio de que **este documento se sujeta a su propio criterio**: cada
número de aquí lleva al lado el comando que lo reproduce.

---

## Cobertura de verificación, de un vistazo

Todas las pruebas de esta tabla corren en CI, en el paso «Run unit tests with coverage»
(`npm run test:coverage` de `.github/workflows/ci.yml`). Ojo con dónde **no** están: salvo la regla de
Stylelint —que sí va dentro de `npm run quality`, y por tanto también en el pre-commit—, ninguna forma
parte de `quality`. Un `quality` verde no dice nada de las otras catorce.

La columna **Repo** es la que la 1.ª versión de este documento no tenía y por la que se abrió
**admin-web #82**. `T` = tenant (`VetSoftwarePublicFront`), `C` = consola (`VetSoftwareFront`).

| Regla | Repo   | Alcance de la puerta                                                    | Fichero                                                                                     |
| ----- | ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| R01   | T      | Por componente: `SearchableSelect` y `DateInput`                        | `tests/unit/searchable-select.spec.ts`, `tests/unit/date-input.spec.ts`                     |
| R02   | T      | Por componente: `SearchableSelect` (elegir y Escape)                    | `tests/unit/searchable-select.spec.ts`                                                      |
| R03   | T + C  | Por token: mide contraste OKLCH → sRGB de los dos anillos               | `tests/unit/tokens-contrast.spec.ts` (**copias divergentes**: 112 líneas T, 364 C)          |
| R04   | T      | Por componente: 3 steppers + paginación + adjuntos de laboratorio       | `tests/unit/stepper-aria-labels.spec.ts`, `tienda-controls.spec.ts`, `lab-results-adjuntos.spec.ts` |
| R05   | T      | Por composable + por componente: `useServerPaged` y `ListBody`          | `tests/unit/use-server-paged.spec.ts`, `tests/unit/list-body-error.spec.ts`                 |
| R06   | T      | **De rejilla**: todo `src/`, con lista de deuda y trinquete             | `tests/unit/loader-guard.spec.ts`, `tests/unit/pos-cash-gate.spec.ts`                       |
| R07   | T + C  | **De rejilla**: todo el CSS, con excepciones por fichero                | `stylelint.config.mjs:41` (gemelo)                                                          |
| R08   | C      | Por fichero: `index.html`, solo el `lang`, solo la consola              | `VetSoftwareFront/tests/unit/security-headers.spec.ts`                                      |
| R09   | T      | Por store: el borrador de consulta nueva                                | `tests/unit/nueva-consulta-draft.spec.ts`                                                   |
| R10   | **C**  | Por token **+ 3 primitivas de `primitives.css`** (archivo gemelo)       | `VetSoftwareFront/tests/unit/tokens-contrast.spec.ts`                                       |
| R11   | **C**  | Por primitiva: `.ds-field-invalid-focus`, con remedida del token        | `VetSoftwareFront/tests/unit/tokens-contrast.spec.ts`                                       |
| R12   | T      | Por composable (`nextRowUid`) + por componente (`LabResultsModal`)      | `tests/unit/row-uid.spec.ts`, `tests/unit/lab-results-adjuntos.spec.ts`                     |
| R13   | T + C  | Solo la mitad de CSS: `reportDescriptionlessDisables` y compañía        | `stylelint.config.mjs:17-19` (gemelo). **ESLint: ninguna**                                  |
| R14   | **C**  | Por componente: ningún texto con forma de cifra dentro del `<nav>`      | `VetSoftwareFront/tests/unit/sidebar-sin-cifras-inventadas.spec.ts`                          |
| R15   | **C**  | Por componente: `AppTable` + la primitiva `.ds-table-scroll`            | `VetSoftwareFront/tests/unit/app-table-scroll.spec.ts`                                       |

Quince reglas con algo que las sujeta. Tres lecturas de esta tabla, por orden de importancia:

1. **Solo dos y media son de rejilla.** R06 (todo `src/`), R07 (todo el CSS) y la mitad CSS de R13. Las
   otras doce sujetan **el componente que ya se arregló**, no la regla. Un `SearchableSelect` nuevo, un
   listado nuevo o un botón de icono nuevo entran sin que nada los mire.
2. **La cobertura está partida por repos, y no por donde debería.** Cinco reglas solo las vigila el
   tenant, cuatro solo la consola, y en dos casos —R10 y R11— **la guarda vive en el repo donde el
   defecto no se sufre**, porque el archivo vigilado es gemelo y los consumidores están al otro lado.
   Es correcto que exista ahí; es un defecto que **no** exista también aquí.
3. **Ninguna es una puerta _de accesibilidad_ en sentido estricto.** Son pruebas unitarias que asertan
   sobre el DOM que monta un componente, o expresiones regulares sobre CSS. **El pipeline sigue sin
   ejecutar una sola comprobación de accesibilidad** — sin `axe-core`, sin `@axe-core/playwright`, sin
   `eslint-plugin-vuejs-accessibility`, sin Lighthouse, en ninguno de los dos repos. Ninguna de estas
   guardas detectaría un modal sin `role`, un formulario sin `label` o un contraste malo en una
   pantalla que nadie tocó.

Tres advertencias operativas, y la primera es nueva y grave:

- **Estas puertas no bloquean nada.** Ningún check es requerido para mergear: seis PR entraron en
  `develop` con el CI en rojo (**public-web #130**). Una guarda que falla y no impide el merge no es
  una puerta, es un informe. Hasta que haya branch protection con checks requeridos, todo lo de esta
  tabla es documentación ejecutable, no defensa.
- La facturación de GitHub Actions ha cortado la ejecución de este proyecto más de una vez; un check
  en rojo de tres segundos y sin pasos es un problema de pago, no de código. Mira duración y
  anotaciones antes de depurar.
- `tests/` está fuera de `tsconfig` y de ESLint (**public-web #117**, **admin-web #76**): un spec con
  los tipos rotos pasa en verde y una constante muerta dentro de una guarda no avisa. Mientras eso
  siga así, la fiabilidad de toda esta tabla es menor de lo que parece.

---

## Lo que quedó abierto

De los diecinueve arreglos de las dos tandas, ocho dejaron una mitad sin cerrar, y las puertas nuevas
destaparon más al encenderse. **Todos los números de esta tabla se verificaron con
`gh issue list --state open` el 2026-08-20.**

Las cuatro primeras filas son especiales: **el arreglo ya está escrito en el árbol de trabajo** y el
issue sigue abierto porque nada se ha commiteado todavía. Se cierran al mergear, no hacen falta
trabajos nuevos.

| Qué falta                                                                                                                              | Regla | Issue |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- |
| `--text-subtle` a 4,17:1, por debajo del 4,5:1 de §1.4.3 — **arreglado en el árbol** (`--warm-500` a 52 %, 5,38:1)                    | R10   | [public-web #114](https://github.com/kefaroTech/vetsoftware-public-web/issues/114) · [admin-web #75](https://github.com/kefaroTech/vetsoftware-admin-web/issues/75) |
| El foco del campo inválido repite el anillo de bajo contraste fuera del token — **arreglado en el árbol** (consume `var(--ring-danger)`) | R11   | [public-web #107](https://github.com/kefaroTech/vetsoftware-public-web/issues/107) · [admin-web #72](https://github.com/kefaroTech/vetsoftware-admin-web/issues/72) |
| `ListBody` presenta el fallo del servidor como estado vacío — **arreglado en el árbol** (rama de error + traza + reintento a la página que falló) | R05   | [public-web #110](https://github.com/kefaroTech/vetsoftware-public-web/issues/110) |
| El tenant sin guarda global de movimiento reducido — **arreglado en el árbol** (`base.css:108-119`, 328 SFC)                             | R06   | [public-web #111](https://github.com/kefaroTech/vetsoftware-public-web/issues/111) |
| **Ya resuelto — no lo repitas.** La guarda de movimiento se creía limitada a `.app-*` en la consola, sin alcanzar `.ds-field-*`. Es el mismo defecto que R06 documenta como cerrado: `base.css:108-119` es gemelo TR-02 e idéntico en los dos repos, así que cubre las dos clases a la vez. | R06 | [admin-web #74](https://github.com/kefaroTech/vetsoftware-admin-web/issues/74) (cerrar al verificar) |
| **Tres SFC del tenant escriben su propio anillo de foco** con `color-mix` al 16-18 % (1,14-1,29:1) y anulan el `outline`: R11 por la puerta de al lado, dentro de `<style scoped>`. | R03, R11 | [public-web #134](https://github.com/kefaroTech/vetsoftware-public-web/issues/134) |
| **El borde de los campos da 1,23:1**, cuando §1.4.11 (AA) pide 3:1 para el límite de un control.                                       | R03   | [public-web #115](https://github.com/kefaroTech/vetsoftware-public-web/issues/115) |
| **La mitad pendiente de las etiquetas**: cuatro botones de eliminar fila con etiqueta estática, uno de ellos solo «Quitar» (censo en R04). | R04 | [public-web #118](https://github.com/kefaroTech/vetsoftware-public-web/issues/118) |
| **`SearchableSelect` sin semántica de combobox**: sin `role="listbox"`, `role="option"` ni `aria-activedescendant`. La consola ya tiene una implementación en `AppSelect`. | R01, R02 | [public-web #108](https://github.com/kefaroTech/vetsoftware-public-web/issues/108) |
| **`DateInput` acepta días inexistentes**: «32 ago 2026» se guarda como 1 de septiembre, en silencio. En una fecha de vacunación, un dato clínico falso. | R01 | [public-web #109](https://github.com/kefaroTech/vetsoftware-public-web/issues/109) |
| **Los 112 errores en línea se tragan el identificador de traza** (`errorFrom` ya lo resuelve para los avisos flotantes). | R05 | [public-web #64](https://github.com/kefaroTech/vetsoftware-public-web/issues/64) |
| **VUE-09 corregido a medias**: la vista del asistente registra su propio `beforeunload`, así que la pantalla sigue fuera del bfcache. | R09 | [public-web #116](https://github.com/kefaroTech/vetsoftware-public-web/issues/116) |
| **Cinco giros infinitos en la capa pública y de autenticación**, que la guarda de R06 admite hoy como deuda enumerada. | R06 | [public-web #112](https://github.com/kefaroTech/vetsoftware-public-web/issues/112) |
| **Las 44 / 37 rutas comparten el título «VetSoftware»**, sin ninguna asignación de `document.title`. | R08 | [public-web #133](https://github.com/kefaroTech/vetsoftware-public-web/issues/133) |
| **El exportador del lienzo de diseño genera HTML sin idioma declarado**, y reintroduce el defecto en cada tablero nuevo. | R08 | [admin-web #73](https://github.com/kefaroTech/vetsoftware-admin-web/issues/73) |
| **El gate de `!important` excepciona un fichero que no existe en la consola** y preautoriza en silencio cualquier `!important` futuro en esa ruta. | R07, R13 | [admin-web #81](https://github.com/kefaroTech/vetsoftware-admin-web/issues/81) |
| **`tests/` fuera de `tsconfig` y de ESLint**: un spec con los tipos rotos pasa en verde, y eso degrada todas las guardas de la tabla anterior. | todas | [public-web #117](https://github.com/kefaroTech/vetsoftware-public-web/issues/117) · [admin-web #76](https://github.com/kefaroTech/vetsoftware-admin-web/issues/76) |
| **Ningún check es requerido para mergear**: seis PR entraron en `develop` con el CI en rojo. Es el prerrequisito de que cualquier guarda de este documento sirva de algo. | todas | [public-web #130](https://github.com/kefaroTech/vetsoftware-public-web/issues/130) |
| **Ninguna puerta de accesibilidad en el pipeline**: es el prerrequisito de R01, R02, R04, R06 y R15. | todas | [public-web #57](https://github.com/kefaroTech/vetsoftware-public-web/issues/57) · [admin-web #44](https://github.com/kefaroTech/vetsoftware-admin-web/issues/44) |
| **La cifra de `.ds-btn` de `AGENTS.md` no la reproduce ningún conteo** — corrigiéndose en el árbol.  | apéndice | [public-web #131](https://github.com/kefaroTech/vetsoftware-public-web/issues/131) · [admin-web #83](https://github.com/kefaroTech/vetsoftware-admin-web/issues/83) |

Y dos que esta pasada **cierra**, para que no se vuelvan a abrir:

- [public-web #132](https://github.com/kefaroTech/vetsoftware-public-web/issues/132) — el pendiente de
  la errata normativa: `AGENTS.md:127-137` y `tokens.css:194-196` ya citan §1.4.11 correctamente.
  Retirado de este documento; ver la nota en R03.
- [admin-web #82](https://github.com/kefaroTech/vetsoftware-admin-web/issues/82) — las rutas sin
  repositorio. Resuelto por la decisión de la cabecera: sigue siendo gemelo, con prefijo obligatorio y
  columna **Repo** en la tabla de cobertura.

### Issues por abrir (redactados, sin abrir)

Este documento no abre issues. Estos cuatro salieron de la 2.ª tanda y hay que crearlos.

> **1 · `kefaroTech/vetsoftware-backend` — `/auth/me` no entrega ni el rol ni el nombre de la empresa,
> y el sidebar tuvo que quedarse con dos huecos**
>
> `MeResponse` trae `name` y la lista de permisos, pero no el nombre del rol ni el de la empresa.
> Consecuencia en el front del tenant: `SidebarBrand` y `SidebarUserCard` mostraban «Clínica Norte» y
> «Veterinaria» de un mock, iguales para todo el mundo (EST-12). El arreglo retiró las dos líneas —un
> hueco honesto antes que un dato inventado— porque la única alternativa era `GET /companies/{id}`,
> que exige el permiso `company.read` que la mayoría de empleados no tiene, y añadir una petición al
> arranque para pintar un adorno. Evidencia:
> `VetSoftwarePublicFront/src/components/layout/AppSidebar.vue:120-124` y `SidebarUserCard.vue:13,86`.
> Para cerrarlo: que `MeResponse` incluya el nombre del rol efectivo y el nombre comercial de la
> empresa del usuario, sin exigir permisos adicionales — son datos de la propia sesión. **No
> comprobado:** si algún otro consumidor del contrato depende hoy de la forma exacta de `MeResponse`.
> Regla en `docs/ux/reglas-de-interfaz.md` § R14.

> **2 · `kefaroTech/vetsoftware-public-web` — La primera pantalla tras el login saluda a «Mariana» y
> anuncia 8 citas inventadas**
>
> `src/features/dashboard/views/HomeView.vue:7,11` importa `mockUser`, `mockDayStats` y
> `mockRecentConsultations` de `../data/mock`: `GreetingHeader` saluda «Hola, **Mariana**» a todo el
> mundo, `StatsRow` anuncia 8 citas para hoy (1 en curso, 5 pendientes, 2 completadas) y
> `RecentConsultations` lista consultas que no existen. Es la pantalla de aterrizaje del tenant.
> EST-12 quitó el mismo `mockUser` del sidebar (`AppSidebar.vue:102-107`, ahora sale de `useAuth`) y
> dejó este intacto tres centímetros más arriba. Escenario de fallo: un veterinario abre la
> aplicación, lee «5 pendientes» y organiza su mañana con un número que ninguna consulta produjo.
> Para cerrarlo: `firstName` desde `useAuth().me`, estadísticas desde el endpoint de agenda del día, y
> **si el dato no existe, la tarjeta no se pinta**. **No comprobado:** si hay endpoint de resumen del
> día o hay que derivarlo del listado de citas. Regla en `docs/ux/reglas-de-interfaz.md` § R14.

> **3 · `kefaroTech/vetsoftware-public-web` — `ExistingItemsSection` anuncia «Eliminar vacuna» tres
> veces seguidas: la etiqueta lleva el tipo, no el item**
>
> `src/features/dashboard/views/consulta/nueva/components/ExistingItemsSection.vue:82,92` construye el
> nombre accesible con `` `Eliminar ${props.noun}` `` y `` `Editar ${props.noun}` ``, donde `noun` es
> el tipo de item («vacuna», «examen», «medicamento»), no el item. Una consulta con tres vacunas
> presenta tres botones llamados exactamente igual. Es el defecto de A11Y-11 (**#118**) con la forma
> de su propio arreglo, que es la manera más fácil de que vuelva. WCAG 2.2 §2.4.6 Encabezados y
> etiquetas (AA): las etiquetas deben describir el propósito, y tres idénticas no distinguen nada;
> §4.1.2 (A) en cuanto el usuario navega por lista de botones. Escenario: se elimina la vacuna
> equivocada de la consulta en curso. Para cerrarlo: que el componente reciba un identificador legible
> de cada fila y la etiqueta sea «Eliminar la vacuna Nobivac DHPPi», con guarda del tipo de
> `VetSoftwarePublicFront/tests/unit/lab-results-adjuntos.spec.ts` —localizar el botón por su
> etiqueta y comprobar que borra
> **esa** fila. **No comprobado:** cuántos consumidores pasan hoy `noun` y si todos tienen un campo
> descriptivo por fila. Regla en `docs/ux/reglas-de-interfaz.md` § R04.

> **4 · `kefaroTech/vetsoftware-public-web` — El chip de traza copiable está escrito dos veces, y
> `.ds-table-scroll` no se puede desplazar con teclado**
>
> Dos defectos hermanos de la misma primitiva ausente; van en issues separados si se prefiere, pero
> nacen del mismo arreglo.
>
> (a) `src/components/feedback/ToastStack.vue:162-176` (`.toast-trace` / `.toast-trace-id`) y
> `src/features/acciones/components/ListBody.vue:255-276` (`.err-trace` / `.err-trace-id`) declaran el
> mismo control: nueve declaraciones idénticas —`display:inline-flex`, `align-items`, `gap:5px`,
> `margin-top:7px`, `padding:3px 7px`, `border-radius:6px`, `font-size:11px`, `cursor:pointer`,
> `max-width:100%`— más la misma pila monoespaciada, y difieren solo en borde, fondo y color. Y el
> gesto también está duplicado en TypeScript: `copiar()` en uno, `copyTrace()` en el otro, con el mismo
> `navigator.clipboard.writeText` y el mismo temporizador de 2 s. `ToastStack.vue` es **gemelo TR-02**,
> así que la primitiva tiene que aterrizar en `primitives.css` (también gemelo) y no en un componente.
> Es el caso exacto que `vetsoftware/no-duplicate-primitive` está pensado para impedir, y no lo
> impidió porque todavía no existe la primitiva que duplicar. Para cerrarlo: `.ds-trace-chip` en
> `primitives.css` con su variante tonal, y los dos consumidores aplicándola.
>
> (b) `primitives.css:753-756` declara `.ds-table-scroll { overflow-x: auto }` sin `tabindex="0"`, sin
> `role="region"` y sin nombre accesible. Una región desplazable que no es enfocable no se puede
> desplazar sin ratón: WCAG 2.2 §2.1.1 Teclado (A), regla `scrollable-region-focusable` de axe-core.
> Afecta a los 11 usos del tenant (`ListBody`, `LibroComprasView`, `FeDocumentDetail`,
> `DocumentosView`, `ReportesView` ×4, `MedicamentosView` ×2, `ImpuestosView` ×2) y a todas las tablas
> de la consola vía `AppTable`. El arreglo es una primitiva, no once parches — y como el archivo es
> gemelo, el issue se duplica a `admin-web`. **No comprobado:** si algún consumidor ya aporta su propio
> `tabindex` desde el marcado. Regla en `docs/ux/reglas-de-interfaz.md` § R15.

### Puertas que faltan, por orden de coste

Ninguna es trabajo de este documento; se dejan especificadas para quien las implemente. Las tres
primeras son copiar algo que ya existe y funciona.

1. **Igualar `tokens-contrast.spec.ts` entre los dos repos** (R03, R10, R11). El archivo medido
   (`tokens.css`, `primitives.css`) es gemelo byte a byte; la prueba que lo mide, no: 112 líneas en el
   tenant contra 364 en la consola. El tenant no vigila ni `--text-subtle`, ni las tres clases de texto
   secundario, ni `.ds-field-invalid-focus` — y es el repo con los 306 usos y los cinco consumidores.
   Es copiar dos `describe`.
2. **Ya resuelto — no lo repitas.** Esta ficha pedía copiar `main.css:80-91` del tenant a la consola
   (R06, cerraría **admin-web #74**). Ese `main.css` ya no existe en ninguno de los dos repos — el
   split DS-06 lo disolvió en `tokens.css`, `base.css`, `primitives.css` y `app.css` — y el bloque
   universal resultante vive en `base.css:108-119`, gemelo TR-02 idéntico en los dos repos. **admin-web
   #74 está cerrado**: no queda nada que copiar.
3. **Copiar a la consola las guardas de comportamiento del tenant, y viceversa.** El tenant tiene
   R01, R02, R04, R05, R09, R12; la consola tiene R08, R10, R11, R14, R15. Cada una vale en el otro
   repo solo si el componente equivalente existe: el `describe('idioma de la página')` de
   `VetSoftwareFront/tests/unit/security-headers.spec.ts` sí se copia tal cual (cuatro líneas), y el de
   `AppTable` no, porque el tenant no tiene primitiva de tabla.
4. **Meter `tests/` en `tsconfig` y en ESLint** (#117 / #76). No añade una puerta nueva: hace fiables
   las quince que ya hay. Hoy una constante declarada y nunca usada dentro de una guarda —caso real
   durante esta tanda— no produce ni un aviso.
5. **Hacer requeridos los checks de CI** (#130). Es el prerrequisito de todo lo anterior: una guarda
   que falla sin bloquear el merge no es una puerta.
6. **`eslint-plugin-vuejs-accessibility`, en `warn`, en los dos repos** (#57 / #44). Nace en verde y
   solo bloquea código nuevo. Es el prerrequisito de todo lo que las guardas por componente no pueden
   cubrir.
7. **Subir R01, R05, R11 y R12 de «por componente» a rejilla**, con el mismo patrón de
   `loader-guard.spec.ts`: ningún `@mousedown` como único activador en un template; ningún `catch` que
   asigne `[]` sin fijar `error`, y ninguna plantilla de listado con la rama de vacío antes que la de
   error; ningún valor tokenizado escrito a mano en `primitives.css`; ningún `:key="idx"` sobre lista
   editable. Las cuatro son gramaticales, se comprueban leyendo el fichero y no necesitan navegador.
8. **Cerrar la otra mitad de R06 en la rejilla**: que el bloque global de `prefers-reduced-motion` de
   `base.css` **siga existiendo** (hoy se puede borrar y el CI sigue verde), y ningún icono de Lucide
   con nombre de spinner (`Loader`, `Loader2`, `RefreshCw`) dentro de un bloque de espera. Ojo con el
   segundo: `ListBody.vue:156` usa `RefreshCw` **estático** en el botón «Reintentar», que es legítimo —
   la firma que hay que buscar es «icono de spinner + animación», no el nombre del icono.
9. **R02, R04 y R15, con ARIA snapshots de Playwright** (`toMatchAriaSnapshot`) sobre la galería visual
   que ya existe en `visual/` de los dos repos: fijan la semántica —nombres accesibles incluidos— de
   pantallas enteras sin comparar píxeles, que es justo lo que las pruebas unitarias por componente no
   escalan a cubrir. Y para R06, un proyecto de Playwright con
   `contextOptions: { reducedMotion: 'reduce' }` comprueba lo que ninguna expresión regular puede:
   que con movimiento reducido **el `transitionend` sigue llegando** y ningún componente se queda
   colgado. Es el aserto que justifica el `0.01ms`.
10. **Alta de `ModalShell.vue` y `useModalFocus.ts` en el manifiesto de gemelos TR-02**, para que la
    divergencia entre las dos copias se detecte sola en vez de depender de que alguien se acuerde.
    **Ya resuelto**: los dos están declarados hoy, junto con este mismo documento y sus otros tres
    gemelos de `docs/ux/`.

## Fuentes

- WCAG 2.2 (Recommendation): https://www.w3.org/TR/WCAG22/
- Understanding 1.4.3 Contrast (Minimum):
  https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- Understanding 1.4.10 Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- Understanding 1.4.11 Non-text Contrast:
  https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Understanding 2.4.13 Focus Appearance:
  https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- APG, Developing a Keyboard Interface: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- APG, patrón Combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- Reglas de axe-core (`scrollable-region-focusable`, `aria-*`):
  https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
- Guía de estilo de Vue (prioridad A: `v-for` con `key`): https://vuejs.org/style-guide/
- Accesibilidad en Vue: https://vuejs.org/guide/best-practices/accessibility.html
- NN/g, 10 heurísticas de usabilidad: https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, errores de formulario: https://www.nngroup.com/articles/errors-forms-design-guidelines/
- Playwright, ARIA snapshots: https://playwright.dev/docs/aria-snapshots
- Playwright, accessibility testing: https://playwright.dev/docs/accessibility-testing
