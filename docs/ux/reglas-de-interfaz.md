# Reglas de interfaz — 2.ª pasada de la auditoría de UX (informe 08)

Nueve reglas, una por patrón de defecto. Cada una nació de un arreglo concreto de la 2.ª pasada; lo
que se documenta aquí **no es el arreglo, es la regla que impide que el defecto vuelva**.

Cómo leerlas:

- **Regla** — la frase que se aplica en revisión, sin interpretación.
- **Criterio** — la norma que la exige. Si no hay criterio citable, se dice.
- **Así no / Así sí** — el código real, con `fichero:línea` del repositorio.
- **Verificación hoy** — la prueba o el gate que la sujeta, con su nombre exacto.
- **Sin verificar** — lo que nadie comprueba. Es la parte más honesta de cada ficha y la que dice
  dónde va a volver el defecto.

Ámbito: los dos fronts. Cada ruta lleva delante el repositorio (`VetSoftwarePublicFront/` = app del
tenant, `VetSoftwareFront/` = consola de plataforma). Las líneas se verificaron leyendo el árbol de
trabajo de ambos el **2026-08-21**, sobre `develop`, con los cambios de la 2.ª pasada y sus guardas
aún sin commitear. Si algún `fichero:línea` no cuadra, manda el código: este documento describe el
árbol, no al revés.

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

**Así sí** — `VetSoftwarePublicFront/src/components/ui/SearchableSelect.vue:240`, sostenido por el
listener de cierre de `SearchableSelect.vue:183-190`, que excluye del _click-outside_ tanto la raíz
como el panel teletransportado:

```vue
<button type="button" class="item ds-stack" @click="pick(o)">
```

```ts
function onDocClick(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as Node
  // El panel está teletransportado a <body>: hay que excluirlo del click-outside.
  if (root.value?.contains(target) || panel.value?.contains(target)) return
  close()
  emit('blur')
}
```

**Verificación hoy.** Para este componente, sí:
`VetSoftwarePublicFront/tests/unit/searchable-select.spec.ts`, `describe('SearchableSelect —
activación por click')`. Cuatro casos, y el que sujeta la regla es
`it('un mousedown sobre la opción NO emite nada por sí solo')`: si alguien vuelve a mover la
activación al `mousedown`, ese aserto se pone verde por el lado equivocado y el de `click` se cae.

El caso hermano de esta regla —un control que el teclado no puede alcanzar— lo cubre
`tests/unit/date-input.spec.ts`, `describe('DateInput — el campo se puede teclear')`, que comprueba
que el input **no** es `readonly`, ni siquiera con el campo marcado como inválido, y que
`disabled` sí bloquea, porque no es lo mismo.

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

**Así sí** — `VetSoftwarePublicFront/src/components/ui/SearchableSelect.vue:120-134`. Nótese que hay
**dos** caminos de cierre y los dos devuelven el foco; el de Escape existe como función propia
(`closeToTrigger`) precisamente para que no se olvide al añadir un tercer camino:

```ts
function pick(opt: Option) {
  emit('update:modelValue', opt.value)
  close()
  // El panel se desmonta al cerrar: sin esto el foco cae a <body> y quien
  // navega con teclado pierde el sitio.
  nextTick(() => trigger.value?.focus())
  emit('blur')
}

/** Escape: cierra y devuelve el foco al disparador (no solo cierra). */
function closeToTrigger() {
  close()
  nextTick(() => trigger.value?.focus())
  emit('blur')
}
```

El `nextTick` no es decorativo: el `focus()` tiene que ocurrir **después** de que Vue retire el panel
del DOM, o el navegador lo deshace.

**Verificación hoy.** Para `SearchableSelect`, sí:
`VetSoftwarePublicFront/tests/unit/searchable-select.spec.ts`, `describe('SearchableSelect — el foco
vuelve al disparador')`, con los dos caminos separados —
`it('tras elegir una opción, el foco está en el disparador y no en <body>')` e
`it('Escape también devuelve el foco al disparador, no solo cierra')`. Que sean dos asertos y no uno
es deliberado: el camino de abandono es el que se olvida.

**Sin verificar.** El retorno de foco de `ModalShell` y el de cualquier panel nuevo. `ModalShell`
(gemelo de facto entre los dos repos) pone el foco inicial y cierra con Escape, pero nada comprueba
dónde queda el foco al cerrar. Y **sigue sin retener el foco** mientras está abierto (no hay focus
trap en ninguno de los dos repos): Tab desde el último control del diálogo sale a la página de
detrás. Eso es §2.4.3 (A) y no lo cubre ninguno de los diez arreglos de esta pasada.

---

## R03 · Anillo de foco medido: ≥ 3:1 contra la superficie real

**Regla.** `outline: none` sin un sustituto que alcance **3:1 medido** contra la superficie donde cae
es un defecto de nivel AA. Cualquier token de anillo de foco se mide antes de entrar, convirtiendo
OKLCH → sRGB y aplicando la fórmula de luminancia relativa de WCAG 2.x contra las superficies reales
(`--warm-50` y blanco), no de memoria y no «a ojo».

El criterio completo, con el porqué y el patrón de dos capas, está en **`AGENTS.md`, sección
«Indicador de foco: 3:1 contra la superficie, siempre (A11Y-01)»**. No se repite aquí.

**Criterio.** Con la numeración correcta de WCAG 2.2, que conviene fijar porque el repositorio la
cita mal (ver la nota de abajo):

- **§1.4.11 Contraste no textual (AA)** — «Visual information required to identify user interface
  components and states […] have a contrast ratio of at least 3:1 against adjacent color(s)». El
  _Understanding_ es explícito: «In combination with 2.4.7 Focus Visible, the visual focus indicator
  for a component must have sufficient contrast against the adjacent background». **Este es el
  criterio AA que exige el 3:1 del anillo.**
- **§2.4.7 Foco visible (AA)** — que exista indicador; no cuantifica.
- **§2.4.13 Apariencia del foco (AAA)** — el que pide 3:1 entre los píxeles del estado enfocado y el
  no enfocado, y un área equivalente a un perímetro de 2 px CSS. El anillo de dos capas (2 px + 2 px)
  cumple también esa geometría.

> **Nota de numeración.** `AGENTS.md`, el comentario de `tokens.css:186-193` y el docblock de
> `tests/unit/tokens-contrast.spec.ts` citan «WCAG 2.2 §2.4.11» como origen del 3:1. En WCAG 2.2
> §2.4.11 es **Foco no oscurecido (mínimo), nivel AA**, un criterio distinto (que el foco no quede
> tapado por contenido pegajoso). El 3:1 sale de §1.4.11 + §2.4.7 en AA, y de §2.4.13 en AAA. El
> arreglo es correcto y el umbral también; solo la referencia está equivocada. Corregirla en
> `AGENTS.md` y en los comentarios del código queda propuesto al final — no se toca desde
> `docs/ux/`.

**Así no:**

```css
--ring: 0 0 0 3px var(--amatista-50); /* 1,06:1 sobre --warm-50: invisible */
```

**Así sí** — `tokens.css:194-195` (gemelo TR-02, idéntico en los dos repos):

```css
--ring: 0 0 0 2px var(--warm-50), 0 0 0 4px var(--amatista-500);
--ring-danger: 0 0 0 2px var(--warm-50), 0 0 0 4px var(--danger-500);
```

4,50:1 y 5,16:1 sobre `--warm-50`. La primera capa repite la superficie para despegar el color del
borde del propio control; la segunda es la que aporta el contraste.

**Verificación hoy.** Sí, y es la única regla de este documento con una puerta que **mide** en vez de
comparar cadenas:

- `VetSoftwareFront/tests/unit/tokens-contrast.spec.ts` y
  `VetSoftwarePublicFront/tests/unit/tokens-contrast.spec.ts` (esta última apoyada en
  `VetSoftwarePublicFront/tests/helpers/wcag-contrast.ts`): parsean el `:root` de `tokens.css`,
  resuelven los `var()` en cadena, convierten OKLCH → sRGB lineal con las matrices de CSS Color 4 y
  calculan el contraste. Fallan si el token baja de 3:1 contra `--warm-50` **o** contra blanco.
- La copia de la consola añade tres guardas que conviene replicar en cualquier prueba de este tipo:
  que el anillo **no vuelva** a `--amatista-50` / `--danger-200`; que declare **dos capas** y que la
  primera sea `--warm-50`; y que la propia fórmula se valide reproduciendo los pares de referencia de
  WCAG (negro sobre blanco = 21:1) y reprobando los valores viejos. Sin esa última, un conversor roto
  que devolviera siempre contraste alto dejaría pasar cualquier cosa.
- Corre en CI: `.github/workflows/ci.yml`, paso «Run unit tests with coverage» (`npm run
test:coverage`), en los dos repos. Ojo: **no** está dentro de `npm run quality`.

**Sin verificar.**

- Los anillos de foco escritos **fuera del token**. `primitives.css:768-771` declara
  `.ds-field-invalid-focus { box-shadow: 0 0 0 3px var(--danger-200) }` — exactamente el color de
  1,29:1 que se acaba de retirar de `--ring-danger`, en el foco del campo inválido, que es justo
  cuando el usuario más necesita ver dónde está. La guarda mira tokens, no primitivas. Abierto en
  **public-web #107** y **admin-web #72**.
- El `box-shadow` de foco local de componentes sueltos (por ejemplo
  `VetSoftwarePublicFront/src/features/acciones/components/ListBody.vue:150-153`, con un `color-mix`
  al 16 %).
- El contraste de **todo lo demás**, y ahí ya hay dos incumplimientos medidos con esta misma
  fórmula: el borde de los campos da **1,23:1** sobre la superficie, cuando §1.4.11 (AA) pide 3:1
  para el límite de un control (**public-web #115**); y `--text-subtle` da **4,17:1**, por debajo del
  4,5:1 de §1.4.3 (AA) para texto normal, tiñendo etiquetas de formulario y cabeceras de tabla en los
  dos fronts (**public-web #114**, **admin-web #75**). La guarda mide dos tokens de anillo; el resto
  de la rampa OKLCH sigue sin medirse, y no hay tema oscuro que obligaría a hacerlo.

---

## R04 · El nombre accesible lleva el sujeto de la fila

**Regla.** Un control sin texto visible necesita `aria-label`. Y si el mismo control se repite por
fila, la etiqueta **debe incluir el sujeto de esa fila**: «Quitar una unidad de Amoxicilina», no
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
<button type="button" @click="emit('dec', l)"><Minus :size="13" /></button>
<input type="text" inputmode="numeric" :value="line.qty" />
<button type="button" class="line-x" aria-label="Quitar" @click="emit('remove', l)" />
```

**Así sí** — `VetSoftwarePublicFront/src/features/tienda/components/PosTicket.vue:69-83`, y el mismo
patrón en `AccountCartPanel.vue:35,45,51`, `BillingChargeColumns.vue:88,136,146,152`,
`PagerBar.vue:34,43` y `TreatmentScreen.vue:154,159`:

```vue
<button type="button" :aria-label="`Quitar una unidad de ${l.name}`" @click="emit('dec', l)">
  <Minus :size="13" :stroke-width="2" />
</button>
<span>{{ l.qty }}</span>
<button type="button" :aria-label="`Añadir una unidad de ${l.name}`" @click="emit('inc', l)">
  <Plus :size="13" :stroke-width="2" />
</button>
```

Redacción: **verbo + objeto + sujeto**, en el idioma de la pantalla y sin la palabra «botón» (el rol
ya lo anuncia el lector). Para navegación sin sujeto de fila basta el objeto: «Página anterior»,
«Semana siguiente».

**Verificación hoy.** Sí, y con la forma correcta:
`VetSoftwarePublicFront/tests/unit/stepper-aria-labels.spec.ts` no comprueba que exista el atributo
—eso lo pasaría también «Quitar»— sino que **la etiqueta identifica la fila correcta**:
`it('«Quitar una unidad de Meloxicam» toca la otra línea, no la primera')`. Es la diferencia entre
verificar la regla y verificar su apariencia. Cubre los tres steppers (`AccountCartPanel`,
`BillingChargeColumns`, `PosTicket`) y el campo de cantidad. La paginación la cubre
`tests/unit/tienda-controls.spec.ts`, con el mismo criterio: la flecha etiquetada «Página anterior»
es la que retrocede, y su etiqueta acompaña al estado deshabilitado.

**Sin verificar.**

- La navegación de semana de `TreatmentScreen.vue:154,159` («Semana anterior» / «Semana siguiente»):
  etiquetada en el arreglo, sin guarda.
- Que un control de icono **nuevo** nazca con nombre. No hay barrido de rejilla ni regla de ESLint;
  cada componente que se añada vuelve a depender de la revisión humana.

**La mitad que sigue abierta.** Los botones de eliminar línea comparten etiqueta entre filas — están
literalmente al lado de los steppers que sí dicen el producto. Censo de hoy sobre
`VetSoftwarePublicFront/src`, controles que se repiten por fila con etiqueta **estática**:

| Fichero:línea                                                                | Etiqueta actual      | Está dentro de           |
| ---------------------------------------------------------------------------- | -------------------- | ------------------------ |
| `src/features/tienda/components/PosTicket.vue:86`                            | `Quitar`             | `v-for` de líneas        |
| `src/features/acciones/modals/LabFormModal.vue:339`                          | `Quitar`             | `v-for="(row, i) in draft.rows"` |
| `src/features/laboratorio/modals/LabResultsModal.vue:98`                     | `Quitar`             | `v-for="(f, i) in files"` |
| `src/features/dashboard/views/consulta/nueva/modals/RecetaModal.vue:277`     | `Quitar medicamento` | `v-for` de medicamentos  |
| `src/features/dashboard/views/consulta/nueva/modals/LabTestModal.vue:278`    | `Quitar examen`      | `v-for` de exámenes      |
| `src/features/dashboard/views/consulta/nueva/modals/VaccinationModal.vue:246` | `Quitar vacuna`      | `v-for` de vacunas       |

Las tres primeras incumplen §4.1.2 en la práctica («Quitar» ¿qué?) y las seis incumplen §2.4.6 en
cuanto hay más de una fila. Abierto en **public-web #118**, que además añade dos casos peores que
este censo no recoge porque no llevan `aria-label` en absoluto, solo `title`:
`AccountCartPanel.vue:60` y `BillingChargeColumns.vue:159`.

Contraste con un caso que **sí** está bien y no hay que «arreglar»:
`LabHistory.vue:75` dice «Quitar paciente» y es correcto, porque ese control no se repite — es la ✕
de un único chip de filtro. La regla es «sujeto cuando hay ambigüedad entre hermanos», no «sujeto
siempre».

---

## R05 · El error de red no se aplasta a un literal, y viaja con su traza

**Regla.** Dos partes, y la segunda es la que de verdad evita el defecto:

1. Un fallo de petición se presenta con **el mensaje que redactó el backend** en el `ProblemDetail`,
   vía `getProblemDetailMessage(e, fallbackDeLaPantalla)`, más el identificador de traza vía
   `getTraceId(e)`. El literal de la pantalla es el suelo, no el mensaje. En avisos flotantes eso ya
   lo hace `useToast().errorFrom(titulo, error)`: **nunca** se escribe
   `error(titulo, getProblemDetailMessage(e))` a mano, porque eso pierde la traza siempre.
2. **Prohibido asignar `[]` (o `0`, o `null`) dentro de un `catch` sin fijar simultáneamente un estado
   de error.** Vaciar la colección sin marcar el fallo convierte un 500 en un «no hay resultados»: la
   pantalla miente, y miente con la misma cara con la que dice la verdad.

**Criterio.**

- Nielsen, heurística 9 (_Help users recognize, diagnose, and recover from errors_) y heurística 1
  (_Visibility of system status_): un estado vacío tras un error no es reconocible como error y no
  ofrece recuperación.
- NN/g, _Error Message Guidelines_: el mensaje debe ser específico y explicar qué ocurrió. «No se pudo
  cargar el listado» ante un 403 esconde que el problema es de permisos y hace imposible resolverlo
  sin llamar a soporte.
- No hay criterio WCAG que aplique: §3.3.1 Identificación de errores (A) cubre errores **de entrada**,
  no fallos de servidor. Se dice para no citarlo mal.

**Así no:**

```ts
} catch {
  items.value = []
  total.value = 0
  error.value = 'No se pudo cargar el listado'
}
```

**Así sí** — `VetSoftwarePublicFront/src/composables/useServerPaged.ts:74-83`:

```ts
} catch (e: unknown) {
  if (axios.isCancel(e) || ctrl.signal.aborted) return
  items.value = []
  total.value = 0
  pageCount.value = 1
  // El mensaje sale del `ProblemDetail` del backend (un 403 dice que no
  // tienes permiso, un 500 dice otra cosa); el literal es solo el suelo
  // cuando no hay cuerpo — un timeout, por ejemplo.
  error.value = getProblemDetailMessage(e, 'No se pudo cargar el listado')
  errorTraceId.value = getTraceId(e) ?? null
}
```

Y `error` / `errorTraceId` se limpian **a la vez** al empezar cada petición (`:60-61`) y en `reset()`
(`:106-107`). Un `error` que sobrevive a la recarga siguiente es el mismo defecto por el otro lado.

**Verificación hoy.** Sí, para este composable:
`VetSoftwarePublicFront/tests/unit/use-server-paged.spec.ts`. Los casos que sujetan la regla son
`it('expone el detalle que redactó el backend, no el literal genérico')`,
`it('expone el identificador de traza de la cabecera X-Trace-Id')` con su caída al `traceId` del
propio `ProblemDetail`, y `it('el literal genérico sigue siendo el suelo cuando no hay cuerpo (un
timeout)')`. Un segundo `describe` cubre el otro lado del defecto —la higiene del estado— :
una cancelación no deja error ni borra el que la pantalla está mostrando, y una página que carga
bien limpia el error del intento anterior. `getTraceId` tiene además prueba propia
(`tests/unit/trace-id.spec.ts`, en los dos repos).

**Sin verificar.**

- Que el error se **pinte**. `VetSoftwarePublicFront/src/features/acciones/components/ListBody.vue:87`
  decide qué mostrar con `v-else-if="total === 0"` y nunca lee `server.error`: los 16 listados que
  consumen `ListBody` presentan un 500 como «No hay registros aún». El arreglo de `useServerPaged`
  puso el dato disponible; nadie lo consume todavía. Abierto en **public-web #110**.
- Los otros 112 errores en línea del tenant, que muestran el mensaje del backend pero se tragan el
  identificador de traza. Abierto en **public-web #64**.
- Que nadie escriba un `catch` mudo **nuevo** en cualquier otro composable o store. La guarda es de
  `useServerPaged`, no de la regla: falta el barrido de rejilla — ver «Puertas que faltan».

---

## R06 · `PawLoader` es el único loader, y toda animación lleva guarda de movimiento reducido

**Regla.** Cualquier espera se representa con `PawLoader`. Están prohibidos los spinners genéricos,
los iconos de Lucide girando (`RefreshCw`, `Loader2`) y las rotaciones CSS sueltas. Y toda animación
que se introduzca —esté donde esté— nace con su bloque `@media (prefers-reduced-motion: reduce)`.

**Criterio.**

- WCAG 2.2 §2.2.2 Pausar, detener, ocultar (A) — el movimiento automático que dura más de cinco
  segundos necesita un mecanismo para detenerlo. Un spinner `infinite` durante una espera de red
  larga entra de lleno.
- WCAG 2.2 §2.3.3 Animación por interacciones (AAA) — la animación disparada por interacción debe
  poder desactivarse.
- Regla del repositorio: un solo loader, con su retardo de 200 ms y su visible mínimo de 300 ms, para
  que la espera corta no parpadee y la larga no parezca colgada (umbrales de NN/g: por debajo de 1 s
  no hace falta indicador; entre 2 y 10 s sí).

**Así no** — lo que había en el POS:

```vue
<span class="cash-lock-icon"><RefreshCw :size="26" class="spin" /></span>
```

```css
.spin {
  animation: cash-spin 0.9s linear infinite;
}
@keyframes cash-spin {
  to {
    transform: rotate(360deg);
  }
}
```

Dos defectos en cinco líneas: un loader que no es el del sistema, y una animación infinita sin
guarda.

**Así sí** — `VetSoftwarePublicFront/src/features/tienda/components/PosCashGate.vue:35`:

```vue
<PawLoader :size="26" :glow="false" :speed="900" label="Validando caja" />
```

`PawLoader` trae la guarda dentro (`src/components/feedback/PawLoader.vue:120-124`, gemelo en los dos
repos) y además el nombre accesible: `role="status"`, `aria-label` y un `.ds-sr-only` con el mismo
texto. Un spinner propio no trae nada de eso.

**Verificación hoy.** Sí, y es la única **prueba** de rejilla del documento (la otra guarda de
rejilla es la de R07, pero esa es una regla de Stylelint sobre CSS):
`VetSoftwarePublicFront/tests/unit/loader-guard.spec.ts` barre todos los `.vue` y `.css` de `src/` y
falla si encuentra `animation: … infinite`, `animation-iteration-count: infinite` o
`rotate(360deg)`. No vigila el nombre del componente sino **la firma en CSS de «algo gira para
siempre»**, que es lo que `PawLoader` sustituye. `PawLoader.vue` es la única excepción por
construcción; el resto es una lista de deuda enumerada fichero a fichero con su issue, y la guarda
**también falla si aparece un fichero que no está en la lista** y si una excepción de la lista se
queda obsoleta. Es un trinquete: el problema no puede crecer mientras se cierra.

El arreglo concreto lo fija además `tests/unit/pos-cash-gate.spec.ts`: que el estado «comprobando»
monta `PawLoader`, que **no** queda ningún `.spin`, que el loader va etiquetado con lo que se está
esperando, y que los otros tres estados de la pantalla no montan loader ninguno.

**Sin verificar, y con tres agujeros abiertos:**

- **El tenant no tiene guarda global de movimiento.**
  `VetSoftwarePublicFront/src/assets/styles/main.css` no declara ni un bloque
  `prefers-reduced-motion`; la única del repo fuera de `PawLoader` está en `public-auth.css:135`, que
  solo cubre las pantallas públicas. Son 328 SFC con transiciones y el temblor de campo inválido de
  `primitives.css:731,738` sin desactivar. Abierto en **public-web #111**.
- **En la consola la guarda existe pero no alcanza.**
  `VetSoftwareFront/src/assets/styles/main.css:222-234` solo desactiva las transiciones y el temblor
  de `.app-inputbox`, `.app-textarea` y `.app-select__trigger`; las primitivas gemelas `.ds-field-*`
  de `primitives.css:731,738` quedan fuera. Abierto en **admin-web #74**.
- **La guarda de rejilla nace con cinco excepciones reales**, no con falsos positivos: cinco giros
  infinitos que EST-11 no tocó porque viven en la capa pública y de autenticación
  (`components/public/AuthSelect.vue`, `components/public/PrimaryButton.vue`,
  `features/auth/views/RestablecerContrasenaView.vue`,
  `features/registration/views/VerifyEmailView.vue` y `assets/styles/public-auth.css`). Cada uno sale
  de la lista cuando migre a `PawLoader`. Abierto en **public-web #112**.
- Y la guarda **no cubre la otra mitad de la regla**: barre animaciones infinitas, no la ausencia de
  `prefers-reduced-motion`. Una transición nueva sin guarda pasa limpia.

---

## R07 · La especificidad se resuelve con `:not()` o con clase de tono, nunca con `!important`

**Regla.** Cuando una regla base de un componente gana a la que debería aplicarse, se corrige
**bajando o excluyendo la regla que estorba**, no subiendo la otra a `!important`. Las dos salidas
autorizadas son las de `AGENTS.md`: excluir por `:not()`, o mover el color a una clase de tono
`ds-tone--*` aplicada desde el marcado.

El porqué de la trampa —una primitiva global pesa `(0,1,0)` y la regla base de un `scoped` pesa
`(0,2,0)` por el `[data-v-…]`, así que le gana siempre— está en **`AGENTS.md`, sección «CSS: consumir
el design system, no reescribirlo (FE-08)»**. No se repite aquí.

**Criterio.** Regla del repositorio (FE-08 / DS-08). Un `!important` es deuda: el siguiente que
necesite ganar solo puede responder con otro `!important`, y a partir de ahí el orden de la cascada
lo decide quién grita más fuerte, no el diseño.

**Así no** — `EmployeeFormModal.vue`, donde `.confirm p` pesaba `(0,2,1)` y `.confirm-note`
`(0,2,0)`:

```css
.confirm-note {
  margin-top: 10px !important;
  color: var(--warm-500) !important;
  font-size: 12.5px !important;
}
```

**Así sí** —
`VetSoftwarePublicFront/src/features/employees/components/EmployeeFormModal.vue:437-451`. La
descendencia se queda con lo que comparten los dos párrafos y el resto viaja por clase:

```css
.confirm p {
  line-height: 1.55;
}

.confirm p:not(.confirm-note) {
  margin: 0;
  font-size: 13.5px;
  color: var(--warm-700);
}

.confirm-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
}
```

**Verificación hoy.** Sí: `declaration-no-important: true` en `stylelint.config.mjs:41` de los dos
repos, dentro de `npm run stylelint:strict`, que es parte de `npm run quality` y por tanto del gate
de CI, del de release y del `lint-staged` del pre-commit.

La excepción viva está declarada por fichero y con motivo escrito
(`VetSoftwarePublicFront/stylelint.config.mjs:43-56`): `DateInput.vue`, porque `vue-datepicker-next`
teletransporta `.mx-datepicker-main` a `<body>` con `append-to-body` y no hay clase propia a la que
colgarle mayor especificidad — el caso «nodo de terceros sin gancho propio» de FE-08. **Toda
excepción nueva se añade así**: en `overrides`, por fichero concreto, con el motivo escrito. Nunca
con un `/* stylelint-disable */` suelto.

**Sin verificar.**

- Que la excepción de `DateInput.vue` no crezca por dentro: el override apaga la regla para el
  fichero entero, no para la declaración concreta.
- Que las excepciones sigan teniendo sujeto. `VetSoftwareFront/stylelint.config.mjs:52` declara ese
  mismo override para `src/components/ui/DateInput.vue`, **un fichero que no existe en la consola**
  (no tiene primitiva de fecha; `vue-datepicker-next` es solo del tenant). Es una excepción heredada
  al copiar el gemelo: hoy no permite nada, pero preautoriza en silencio cualquier `!important` que
  alguien escriba mañana en esa ruta. Una excepción sin sujeto debería fallar igual que una
  declaración prohibida.

**Lo que destapó la puerta al entrar.** Un `!important` sin motivo escrito en
`src/assets/styles/public-auth.css` (**public-web #113**), resuelto quitándolo: los selectores de
la guarda de movimiento tienen la misma especificidad que los de arriba y van después en el mismo
fichero, así que la cascada ya gana sin forzar. Es el patrón esperable: cuando una puerta nueva
enciende la luz, lo primero que aparece es deuda antigua, y casi siempre se cierra bajando la
especificidad, no subiéndola.

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

**Así no:**

```text
<html lang="en">
```

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
  prueba es gemela y de cuatro líneas: copiarla evita que el front que hoy está bien se estropee en
  silencio.
- **El título.** `VetSoftwarePublicFront/index.html:7` y `VetSoftwareFront/index.html:13` declaran
  ambos `<title>VetSoftware</title>`, y no hay ni una asignación de `document.title` en `src/` de
  ninguno de los dos repos (verificado: cero ocurrencias). Las 38+ rutas de cada front comparten un
  único título: con varias pestañas abiertas —caja en una, historia clínica en otra, que es
  exactamente cómo se usa esto— son indistinguibles, y el historial del navegador tampoco sirve. Es
  §2.4.2 (A) incumplido en las dos aplicaciones enteras. No tiene issue; hay propuesta al final.
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

**Así no:**

```ts
window.addEventListener('pagehide', persistNow)
window.addEventListener('beforeunload', persistNow) // mata el bfcache de toda la app
```

**Así sí** —
`VetSoftwarePublicFront/src/features/dashboard/views/consulta/nueva/stores/nuevaConsultaDraft.store.ts:333-345`:

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

**Verificación hoy.** Sí: `VetSoftwarePublicFront/tests/unit/nueva-consulta-draft.spec.ts`,
`describe('sellado al descargar la pestaña (VUE-09)')`, con
`it('NO registra ningún «beforeunload»')` como guarda literal de la regresión, más el caso de que el
`pagehide` sella sin esperar al retardo y el borrador conserva el sello de su dueño.

**Sin verificar.** La guarda mira **el store**. La propia vista del asistente registra otro
`beforeunload` por su cuenta, así que la pantalla sigue fuera del bfcache pese al arreglo: el defecto
está corregido a medias. Abierto en **public-web #116**.

---

## Apéndice · el arreglo que no dejó regla de interfaz

**VUE-12** borró `byStatus` de `useLabQueue`: una función exportada, con tipo y todo, que no llamaba
nadie. No es una regla de UX y no tiene criterio que citar, pero sí una consecuencia que sí lo es —
una API muerta en un composable es una invitación a construir encima de ella una pantalla que nunca
se probó. Hoy no lo verifica nada: ESLint no marca exports sin consumidores, y `tests/` está fuera de
`tsconfig` y de la configuración de ESLint, así que ni siquiera un spec con los tipos rotos falla
(**public-web #117** — afecta a la fiabilidad de todas las guardas de este documento).

---

## Cobertura de verificación, de un vistazo

Todas las pruebas de esta tabla corren en CI, en el paso «Run unit tests with coverage»
(`npm run test:coverage` de `.github/workflows/ci.yml`). Ojo con dónde **no** están: salvo la regla de
Stylelint —que sí va dentro de `npm run quality`, y por tanto también en el pre-commit—, ninguna
forma parte de `quality`. Un `quality` verde no dice nada de las otras ocho.

| Regla | Alcance de la puerta                                             | Fichero                                                                       |
| ----- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R01   | Por componente: `SearchableSelect` y `DateInput`                 | `tests/unit/searchable-select.spec.ts`, `tests/unit/date-input.spec.ts`        |
| R02   | Por componente: `SearchableSelect` (elegir y Escape)             | `tests/unit/searchable-select.spec.ts`                                        |
| R03   | Por token: mide contraste OKLCH → sRGB de los dos anillos        | `tests/unit/tokens-contrast.spec.ts` (los dos repos)                          |
| R04   | Por componente: 3 steppers + paginación de tienda                | `tests/unit/stepper-aria-labels.spec.ts`, `tests/unit/tienda-controls.spec.ts` |
| R05   | Por composable: `useServerPaged`                                 | `tests/unit/use-server-paged.spec.ts`                                         |
| R06   | **De rejilla**: todo `src/`, con lista de deuda y trinquete      | `tests/unit/loader-guard.spec.ts`, `tests/unit/pos-cash-gate.spec.ts`         |
| R07   | **De rejilla**: todo el CSS, con excepciones por fichero         | `stylelint.config.mjs:41` (los dos repos)                                     |
| R08   | Por fichero: `index.html`, **solo la consola**                   | `VetSoftwareFront/tests/unit/security-headers.spec.ts`                        |
| R09   | Por store: el borrador de consulta nueva                         | `tests/unit/nueva-consulta-draft.spec.ts`                                     |

Nueve reglas con puerta, y ese es un cambio grande respecto a como estaba el proyecto hace un día.
Pero conviene leer la columna del medio: **solo dos son de rejilla**. Las otras siete sujetan el
componente que ya se arregló, no la regla. Un `SearchableSelect` nuevo, un composable nuevo o un
botón de icono nuevo entran sin que nada los mire.

Y ninguna es una puerta _de accesibilidad_ en sentido estricto: son pruebas unitarias que asertan
sobre el DOM que monta un componente. **El pipeline sigue sin ejecutar una sola comprobación de
accesibilidad** — sin `axe-core`, sin `@axe-core/playwright`, sin
`eslint-plugin-vuejs-accessibility`, sin Lighthouse, en ninguno de los dos repos. Ninguna de estas
guardas detectaría un modal sin `role`, un formulario sin `label` o un contraste malo en una pantalla
que nadie tocó.

Dos advertencias operativas:

- Estas puertas solo protegen si CI corre. La facturación de GitHub Actions ha cortado la ejecución
  de este proyecto más de una vez; un check en rojo de tres segundos y sin pasos es un problema de
  pago, no de código.
- `tests/` está fuera de `tsconfig` y de la configuración de ESLint (**public-web #117**): un spec
  con los tipos rotos pasa en verde. Mientras eso siga así, la fiabilidad de toda esta tabla es menor
  de lo que parece.

---

## Lo que quedó abierto

De los diez arreglos de esta pasada, seis dejaron una mitad sin cerrar, y las puertas nuevas
destaparon cuatro cosas más al encenderse. Todo lo de esta tabla tiene issue abierto salvo la última
fila, que se propone redactada al final.

| Qué falta                                                                                                                                                                                                                                                                                                                                       | Regla    | Issue                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`SearchableSelect` sin semántica de combobox**: activación y foco arreglados, pero el panel sigue sin `role="listbox"`, `role="option"` ni `aria-activedescendant`. Con lector de pantalla, el catálogo de la receta no se anuncia como lista. Patrón de referencia: _Combobox_ del APG; la consola ya tiene una implementación en `AppSelect`. | R01, R02 | [public-web #108](https://github.com/kefaroTech/vetsoftware-public-web/issues/108)                                                                                   |
| **`DateInput` acepta días inexistentes**: con `:editable="true"` el campo ya es alcanzable por teclado, pero la librería parsea «32 ago 2026» y lo guarda como 1 de septiembre, en silencio. En una fecha de vacunación o de alta, eso es un dato clínico falso.                                                                                  | R01      | [public-web #109](https://github.com/kefaroTech/vetsoftware-public-web/issues/109)                                                                                   |
| **`ListBody` no pinta el error del listado**: `useServerPaged` ya expone `error` y `errorTraceId`; `ListBody.vue:87` sigue decidiendo por `total === 0` y presenta el fallo del servidor como estado vacío, en los 16 listados que lo consumen.                                                                                                   | R05      | [public-web #110](https://github.com/kefaroTech/vetsoftware-public-web/issues/110)                                                                                   |
| **Falta la guarda global de movimiento reducido en el tenant**: `main.css` sin un solo bloque `prefers-reduced-motion`, con 328 SFC con transiciones detrás.                                                                                                                                                                                     | R06      | [public-web #111](https://github.com/kefaroTech/vetsoftware-public-web/issues/111)                                                                                   |
| **La guarda de movimiento de la consola no alcanza a las primitivas TR-02**: cubre `.app-*`, no el temblor de `.ds-field-*`.                                                                                                                                                                                                                     | R06      | [admin-web #74](https://github.com/kefaroTech/vetsoftware-admin-web/issues/74)                                                                                       |
| **El foco del campo inválido repite el anillo de bajo contraste**, pero fuera del token, así que la guarda de R03 no lo ve.                                                                                                                                                                                                                      | R03      | [public-web #107](https://github.com/kefaroTech/vetsoftware-public-web/issues/107) · [admin-web #72](https://github.com/kefaroTech/vetsoftware-admin-web/issues/72) |
| **Ninguna puerta de accesibilidad en el pipeline**: es el prerrequisito de R01, R02, R04 y R06.                                                                                                                                                                                                                                                  | todas    | [public-web #57](https://github.com/kefaroTech/vetsoftware-public-web/issues/57) · [admin-web #44](https://github.com/kefaroTech/vetsoftware-admin-web/issues/44)   |
| **Los 112 errores en línea se tragan el identificador de traza** (`errorFrom` ya lo resuelve para los avisos flotantes).                                                                                                                                                                                                                         | R05      | [public-web #64](https://github.com/kefaroTech/vetsoftware-public-web/issues/64)                                                                                     |
| **La mitad pendiente de las etiquetas**: seis botones de eliminar fila con etiqueta estática, tres de ellos solo «Quitar», más dos que solo llevan `title` (censo en R04).                                                                                                                                                                      | R04      | [public-web #118](https://github.com/kefaroTech/vetsoftware-public-web/issues/118)                                                                                   |
| **VUE-09 corregido a medias**: el store ya no registra `beforeunload`, pero la vista del asistente registra otro por su cuenta, así que la pantalla sigue fuera del bfcache.                                                                                                                                                                     | R09      | [public-web #116](https://github.com/kefaroTech/vetsoftware-public-web/issues/116)                                                                                   |
| **Cinco giros infinitos en la capa pública y de autenticación**, que la guarda de R06 admite hoy como deuda enumerada.                                                                                                                                                                                                                           | R06      | [public-web #112](https://github.com/kefaroTech/vetsoftware-public-web/issues/112)                                                                                   |
| **Contraste por debajo del mínimo fuera del anillo**: borde de campo a 1,23:1 (§1.4.11) y `--text-subtle` a 4,17:1 (§1.4.3).                                                                                                                                                                                                                     | R03      | [public-web #115](https://github.com/kefaroTech/vetsoftware-public-web/issues/115) · [public-web #114](https://github.com/kefaroTech/vetsoftware-public-web/issues/114) · [admin-web #75](https://github.com/kefaroTech/vetsoftware-admin-web/issues/75) |
| **`tests/` fuera de `tsconfig` y de ESLint**: un spec con los tipos rotos pasa en verde, y eso degrada todas las guardas de la tabla anterior.                                                                                                                                                                                                   | todas    | [public-web #117](https://github.com/kefaroTech/vetsoftware-public-web/issues/117)                                                                                   |
| **Título de página único para las 38+ rutas** de cada front, sin ninguna asignación de `document.title`.                                                                                                                                                                                                                                         | R08      | sin issue — propuesta abajo                                                                                                                                         |

### Issue propuesto (redactado, sin abrir)

Este documento no abre issues. El único que falta, listo para copiar:

> **Los dos repos — Todas las pantallas comparten el mismo título: `<title>VetSoftware</title>` para
> 38 rutas**
>
> `index.html` declara un título fijo y no hay ninguna asignación de `document.title` en `src/` (cero
> ocurrencias en los dos fronts). WCAG 2.2 §2.4.2 Página titulada (A) pide que el título describa el
> propósito de la página. En una clínica se trabaja con varias pestañas abiertas —caja, historia
> clínica, agenda— y hoy son indistinguibles en la barra de pestañas y en el historial. Arreglo: un
> `meta.title` por ruta y un `router.afterEach` que fije `document.title`; guarda de Vitest que
> compruebe que toda ruta con nombre declara `meta.title`. Regla en
> `docs/ux/reglas-de-interfaz.md` § R08.

### Puertas que faltan, por orden de coste

Ninguna es trabajo de este documento; se dejan especificadas para quien las implemente.

1. **R08 en el tenant**: copiar el `describe('idioma de la página')` de
   `VetSoftwareFront/tests/unit/security-headers.spec.ts` al gemelo de public-web. Cuatro líneas, y
   cierra la única regla que hoy solo vigila uno de los dos repos.
2. **Meter `tests/` en `tsconfig` y en ESLint** (#117). No añade una puerta nueva: hace fiables las
   nueve que ya hay.
3. **`eslint-plugin-vuejs-accessibility`, en `warn`, en los dos repos.** Es el prerrequisito de todo
   lo que las guardas por componente no pueden cubrir (issues #57 / #44). Nace en verde y solo
   bloquea código nuevo.
4. **Subir R01 y R05 de «por componente» a rejilla**, con el mismo patrón de `loader-guard.spec.ts`:
   ningún `@mousedown` como único activador en un template, ningún `catch` que asigne `[]` sin fijar
   `error`, ambas con lista de deuda enumerada. Las dos son gramaticales y se comprueban leyendo el
   fichero, sin navegador.
5. **Cerrar la otra mitad de R06 en la rejilla**: ningún `@keyframes` ni `transition` en un fichero
   que no declare `@media (prefers-reduced-motion: reduce)`, y ningún icono de Lucide con nombre de
   spinner (`Loader`, `Loader2`, `RefreshCw`) dentro de un bloque de espera.
6. **R02 y R04, con ARIA snapshots de Playwright** (`toMatchAriaSnapshot`) sobre la galería visual que
   ya existe: fijan la semántica —nombres accesibles incluidos— de pantallas enteras sin comparar
   píxeles, que es justo lo que las pruebas unitarias por componente no escalan a cubrir.
7. **Corrección de referencia normativa** (no es una puerta, es una errata): `AGENTS.md`,
   `tokens.css:186-193` y el docblock de `tests/unit/tokens-contrast.spec.ts` citan «WCAG 2.2
   §2.4.11» para el 3:1 del anillo. La cita correcta en AA es §1.4.11 Contraste no textual, junto con
   §2.4.7 Foco visible; §2.4.13 Apariencia del foco es AAA; y §2.4.11 en WCAG 2.2 es Foco no
   oscurecido (mínimo), que es otro criterio. El umbral y el arreglo son correctos: solo la referencia
   está mal.
8. **Alta de estos dos ficheros en el manifiesto de gemelos TR-02**, para que la divergencia entre las
   dos copias se detecte sola en vez de depender de que alguien se acuerde.

## Fuentes

- WCAG 2.2 (Recommendation): https://www.w3.org/TR/WCAG22/
- Understanding 1.4.11 Non-text Contrast:
  https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Understanding 2.4.13 Focus Appearance:
  https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- APG, Developing a Keyboard Interface: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- APG, patrón Combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- NN/g, 10 heurísticas de usabilidad: https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, errores de formulario: https://www.nngroup.com/articles/errors-forms-design-guidelines/
- Playwright, ARIA snapshots: https://playwright.dev/docs/aria-snapshots
