# Lumbre — especificación de rebrand

> **Qué es esto.** El contrato ejecutable para llevar `veterinary-brand-kit/` a los dos fronts sin
> tumbar la conformidad WCAG 2.2 AA que `tokens.css` ya tiene medida. Cada valor viene con su ratio
> **recalculado hoy**, no citado de memoria. El reparto por agente está en el §12; nada fuera de esas
> dos listas se toca.
>
> **Este documento no toca `src/`.** Lo implementan `front-parity` y dos `front-feature`.
>
> **Fecha del análisis:** 2026-09-03 · **Estado:** propuesta, pendiente de aprobación humana.
> **Motor de cálculo:** `scratchpad/uxlumbre-color.mjs` (OKLCH → sRGB → luminancia relativa WCAG 2.x),
> validado contra los ratios que el propio `tokens.css` documenta (§5.1).

---

## 0 · Resumen ejecutivo

| Decisión | Valor | Evidencia |
|---|---|---|
| **Hue primario** | `--hue: 300 → 281` | 281,0° es el hue OKLCH medido del píxel cromático dominante del isotipo (`#5315ED`, 139.406 muestras, `brand.json`). Es también el único candidato entre 277 y 292 que deja `--amatista-50` **dentro de sRGB** sin recortar croma. |
| **Hue neutro** | nuevo `--hue-neutral: 256` (hoy `60deg` literal ×13) | Los tres neutros que el kit declara miden 265,8° / 257,3° / 255,5° (navy, `text_secondary`, `border`). A 256° la rampa **reproduce el `border: #E2E8F0` del kit** (`#dfe5ed`, ΔY 2,3 %) y el `text_secondary: #475569` (`#51565c`, ΔY 0,3 %). |
| **Rampa neutra: ¿renombrar o girar?** | **Girar ahora, renombrar después** | Girar = 13 líneas en `tokens.css`, coste cero de presupuesto. Renombrar = **1.752 ediciones en 245 ficheros**. Ver §3.3. |
| **Segundo eje de acento** | **NO existe. Veto a teal y a coral.** | Coral `#F43F5E` mide **16,4°** OKLCH, a **8,6°** de `--danger-*` (25°): sería el color de error. Teal `#14B8A6` mide **2,48:1** sobre blanco — incumple hasta el umbral no-textual de 3:1, y oscurecerlo hasta que cumpla lo saca de gamut. Ver §3.4. |
| **Superficie de marca ≠ superficie de app** | `#F5F3FF` es lienzo de marketing/auth/correo, **no** el fondo de la aplicación | `#F5F3FF` y el `--warm-100` propuesto tienen **ratio 1,00 entre sí**: no se distinguen. Usarlo de fondo de app destruiría la jerarquía panel/tarjeta. Ver §3.5. |
| **Tipografía** | `--font-sans`: Geist → **Inter** · nuevo `--font-display`: **Poppins** · `--font-serif` **se retira** (43 consumidores migran) · `--font-mono` **sin cambio** | Inter **ya se descarga** en los dos `index.html` y `public-auth.css:66` ya la usa: el cambio unifica, no añade red. Ver §8. |
| **Contraste** | **0 incumplimientos** en 34 pares recalculados | §5.3. El par más ajustado baja de 4,51 a 4,44 (anillo de foco) y sigue a 1,48× de su umbral de 3:1. |
| **Gamut sRGB** | Rampa de marca y neutra: **0 escalones fuera** | Requiere bajar el croma de 3 escalones claros (§4.1). Hoy hay 2 fuera a hue 300. |
| **Invariante de rampa** | **OK en las dos**, incluidos los `-450` | §6, con las luminancias tabuladas. |
| **PawLoader** | **Se queda la huella.** Solo se parametrizan sus 3 hues `300` literales | §7.6. |
| **Presupuesto de CSS** | **No está a cero.** Margen real: **−19.163** (consola) y **−4.681** (tenant) | §11. La premisa de que «cualquier línea rompe el gate» es falsa; el gate que sí está a cero es otro. |

**Cinco defectos encontrados de paso, que el rebrand no introduce pero sí destapa:**

1. `tokens.css:149` — `--info-border: oklch(62% 0.15 300deg)` lleva el hue **literal**, no `var(--hue)`.
   Al mover `--hue` el banner informativo se quedaría violeta sobre un sistema índigo. **Gemelo TR-02:
   el defecto está en los dos repos.**
2. `VetSoftwarePublicFront/public/` **no contiene `favicon.svg`** y `index.html:5` lo enlaza. El tenant
   sirve un 404 en cada carga. La consola sí lo tiene (`public/favicon.svg`, 9.522 B).
3. `VetSoftwareFront/src/plugins/vuetify.ts:20` declara `primary: '#7C3AED'` mientras `tokens.css:88`
   declara `--v-primary: #4f46e5`. **Dos primarios distintos** para las mismas pantallas públicas.
4. Los ocho tokens `--v-*` de `tokens.css:86-93` tienen **cero consumidores** en `src/` de los dos
   repos (verificado con `grep -o 'var(--v-primary)'` etc. = 0). Son 8 líneas muertas que además
   duplican la fuente de verdad del tema de Vuetify.
5. `VetSoftwarePublicFront/src/components/layout/AppSidebar.vue` está en **497 líneas** con
   `maxOversizedSfc: 0` y techo 500. **Tres líneas de margen.** Es la restricción más dura de todo
   este rebrand y condiciona el §7.

---

## 1 · Reconciliación con `brand-refresh-2026.md`

En `VetSoftwareFront/docs/ux/brand-refresh-2026.md` ya existe una especificación de rebrand (68 KB,
2026-09-03 16:00). **Analiza un kit distinto del que hay hoy en el árbol** y por eso sus conclusiones
no son directamente aplicables:

| Aspecto | `brand-refresh-2026.md` | Kit actual en `veterinary-brand-kit/` |
|---|---|---|
| Estructura | `design-tokens/`, `assets/`, `examples/` | `01_MASTERS` … `09_BRAND_GUIDE` |
| Violet | `#9333EA` (302,3°) | **`#6D28D9`** (292,6°) |
| Token «Slate» | `#64748B` + `#94A3B8` | **no existe**; hay `text_secondary #475569` y `border #E2E8F0` |
| Ficheros de token | `colors.css`, `tokens.json`, `palette-extracted.json`, `palette.csv` | `lumbre.css`, `brand.json`, `colors.csv`, `lumbre.tokens.ts`, `tailwind.lumbre.js`, `lumbre.scss` |

**Divergencia de fondo que hay que resolver, y no es cosmética:** aquel documento fija el **hue neutro
en 294°** anclándolo en el fondo `#F5F3FF` (293,8°). Este documento lo fija en **256°** anclándolo en
los neutros que el kit declara como tales. La comparación, calculada:

| Escalón | a **294°** | a **256°** | Lo que el kit declara |
|---|---|---|---|
| `--warm-200` | `#e5e3ec` | **`#dfe5ed`** | `border: #E2E8F0` |
| `--warm-300` | `#d1cfda` | **`#cbd2db`** | — |
| `--warm-600` | `#55545b` | **`#51565c`** | `text_secondary: #475569` |

A 294° la rampa «neutra» es un **gris violáceo**; a 256° es el **gris azulado** que el kit envía en sus
propios tokens (`#E2E8F0` y `#475569` son, literalmente, slate-200 y slate-600). `#F5F3FF` no es un
neutro: es el **primario lavado** — croma 0,0161 sobre hue 293,8 — y su sitio natural es la familia
`--amatista-50`, no la rampa de grises. Ver §3.5.

**Recomendación:** marcar `brand-refresh-2026.md` como *superseded by* este documento, o fusionarlos.
No deben coexistir dos hues neutros distintos en el mismo directorio.

---

## 2 · El kit — inventario verificado y sus defectos

### 2.1 Tres piezas, tres proporciones (medidas, no supuestas)

| Pieza | Master | Proporción | Contenido |
|---|---|---|---|
| **Isotipo** (`02_LOGO_ONLY`) | 1254×1254 y 2508×2508 | **1:1** | Árbol de hojas multicolor, silueta de perro y gato, corazón, calendario |
| **Lockup** (`03_LOCKUP`) | 1254×1254 y 2508×2508 | **1:1** | Isotipo + wordmark «Lumbre» + tagline |
| **Wordmark** (`04_WORDMARK`) | 1198×444 | **2,698:1** | Recorte del lockup |

Tamaños disponibles: isotipo 32/48/64/96/128/180/192/256/384/512/768/1024/2048 (PNG) y
128…2048 (WebP, **sin 32/48/64/96**); lockup 256/320/480/640/768/1024/1280/1536/2048 (PNG) y
480…2048 (WebP, **sin 256/320**); wordmark 256w/480w/768w/1024w/1536w (PNG) y 480w…1536w (WebP).

### 2.2 Defectos del kit — hay que devolverlos a quien lo produjo

**[bloqueante para su uso] El «wordmark» es un recorte defectuoso.**
`04_WORDMARK/png/lumbre-wordmark-transparent-256w.png` y todas sus variantes incluyen, cortados por
el borde superior, **el fondo del calendario y el arco del suelo del isotipo**. No es un wordmark: es
un recorte mal encuadrado del lockup. Inspeccionado visualmente a 256w y a 1024w.
→ **No usar ninguna variante de `04_WORDMARK` en producto.** Donde haga falta el nombre, va como
**texto vivo en Poppins** (§7.2), que además es lo correcto por WCAG 2.2 §1.4.5 Images of Text.

**[grave] El isotipo no sobrevive por debajo de ~48 px.**
Inspeccionado a 64 px y a 32 px: a 64 el perro, el gato y el calendario ya son manchas; a 32
(`05_ICONS_FAVICON/favicon-32x32.png`) queda un borrón violeta-turquesa sin figura reconocible. Es una
ilustración con cuatro niveles de detalle y no está simplificada para tamaños de interfaz. Ver §7.1.

**[grave] Los SVG no son vectores.**
`01_MASTERS/*.svg` son *wrappers* con el PNG en base64: 984 KB, 785 KB y 258 KB. El propio README del
kit lo admite. **No se versiona ninguno.** No escalan, no recolorean y pesan más que el PNG.

**[nota] El `site.webmanifest` apunta a `/brand/05_ICONS_FAVICON/…`,** una ruta de ejemplo. Hay que
reescribirlo con las rutas reales de `public/` de cada repo (§7.4).

**[nota] `09_BRAND_GUIDE/README.md` está escrito con `\n` literales**, no con saltos de línea: se
renderiza como un párrafo único ilegible. Cosmético, pero es el documento de entrada al kit.

**[nota] `08_FRONTEND/fonts.css` usa `@import url('https://fonts.googleapis.com/…')`.** Un `@import`
dentro de una hoja encadena dos viajes en serie y bloquea el render. No se adopta ese fichero: las
fuentes se piden con `<link>` desde `index.html`, que es lo que los dos repos ya hacen.

**[ok] `maskable-icon-512x512.png` es correcto.** El contenido queda dentro del círculo seguro del 80 %
(radio 205 px desde el centro) y el fondo es opaco `#F5F3FF`, como exige la especificación de iconos
enmascarables.

---

## 3 · Decisión de hue

### 3.1 El primario: 281°

Conversión sRGB → OKLCH de todo lo que la marca aporta (calculada, `uxlumbre-color.mjs`):

| Origen | HEX | L | C | **H** |
|---|---|---:|---:|---:|
| `indigo` (token oficial) | `#4F46E5` | 51,1 % | 0,2301 | **277,0** |
| `violet` (token oficial) | `#6D28D9` | 49,1 % | 0,2412 | **292,6** |
| Píxel dominante del isotipo | `#5315ED` | 47,4 % | 0,2736 | **281,0** |
| Píxel dominante del lockup | `#3419AF` | 38,1 % | 0,2129 | **277,4** |
| `background` | `#F5F3FF` | 96,9 % | 0,0161 | 293,8 |

El eje cromático de la marca se agrupa en **277–281°**. La decisión entre 277 y 281 la resuelve el
gamut, no el gusto — croma máximo en sRGB por escalón, calculado por bisección:

| Escalón | C declarado | C máx a **277°** | C máx a **281°** | C máx a 292° | C máx a 300° (hoy) |
|---|---:|---:|---:|---:|---:|
| `--amatista-50` | 0,015 | **0,0149** ✗ | **0,0152** ✓ | 0,0162 ✓ | 0,0174 ✓ |
| `--amatista-100` | 0,035 | 0,0295 ✗ | 0,0299 ✗ | 0,0320 ✗ | 0,0345 ✗ |
| `--amatista-200` | 0,070 | 0,0597 ✗ | 0,0606 ✗ | 0,0647 ✗ | 0,0698 ✗ |
| `--amatista-300` | 0,120 | 0,1134 ✗ | 0,1150 ✗ | 0,1230 ✓ | 0,1328 ✓ |
| 400 … 900 | — | ✓ | ✓ | ✓ | ✓ |

**281° es el hue más cercano al índigo declarado que mantiene `--amatista-50` dentro de sRGB.**
`--amatista-50` es el tinte más repetido del sistema (fondo del banner informativo, fondo de fila
seleccionada), y es el que más se nota si el navegador lo recorta. El propio `tokens.css:130-134` ya
rechazó un valor por caer fuera de gamut («*el navegador lo recorta de forma impredecible*»); aquí se
aplica el mismo criterio a la rampa base.

CSS Color 4 no obliga a un método de mapeo único —admite reducción de croma, recorte por canal y
varios algoritmos— así que **un color fuera de gamut se pinta distinto según el navegador**. Por eso
la propuesta lo evita en vez de tolerarlo.

> **277° también es viable** si se prefiere alinearse con `brand-refresh-2026.md`: exige bajar además
> `--amatista-50` a `0.014`. La diferencia perceptual entre 277 y 281 es de ~1 JND. La decisión de
> este documento es **281**, por la razón medible de arriba.

**Comprobado que no colisiona:** 281° está a **104°** del semántico más cercano (25°, 80°, 150°). No
hay ambigüedad posible entre «primario» y cualquier estado.

### 3.2 El neutro: 256°

La rampa `--warm-*` está a 60° (crema) y la marca es fría. Los neutros que el kit declara:

| Token del kit | HEX | H OKLCH |
|---|---|---:|
| `navy` | `#0F172A` | 265,8 |
| `text_secondary` | `#475569` | 257,3 |
| `border` | `#E2E8F0` | 255,5 |

**256°** es el centro de ese grupo y la coincidencia es casi literal: `--warm-200` a 256° renderiza
`#dfe5ed` frente al `#E2E8F0` del kit, y `--warm-600` renderiza `#51565c` frente a `#475569`.

### 3.3 ¿Se renombra `--warm-*` o solo se gira el ángulo?

**Dictamen: se gira ahora; el renombrado va en una entrega posterior, separada y mecánica.**

| Opción | Coste medido | Riesgo |
|---|---|---|
| **Girar el ángulo** | 13 líneas de `tokens.css` por repo (los 12 `--warm-*` + `--text-placeholder`, cada uno con su `60deg` literal). **Coste de presupuesto: cero** — `css-budget.mjs` solo recorre `src/**/*.vue`. | Ninguno más allá del recoloreo, que hay que revisar de todos modos. |
| **Renombrar a `--neutral-*`** | **1.752 ocurrencias en 245 ficheros** (146 en 17 ficheros de la consola, 1.606 en 228 del tenant). Mecánico, pero toca 245 SFC, muchos de ellos gemelos TR-02. | **Alto, y no por el renombrado: por la revisión.** Mezclar 1.752 renombrados con el cambio de color hace **imposible atribuir** cuál de las 52 líneas base visuales cambió por el color y cuál por otra cosa. El renombrado se traga la revisión del recoloreo. |

El nombre `--warm-*` pasa a mentir, y eso es una deuda real que hay que pagar. Pero se paga **después**,
en un PR que no cambie ni un valor: `sed` + `git diff --stat` de una línea. La secuencia correcta es
recolorear → regenerar líneas base → verificar → renombrar sobre un árbol ya estabilizado.

**Además, el giro deja de ser un literal repetido.** Hoy `60deg` aparece 13 veces; la propuesta
introduce `--hue-neutral: 256` y las 13 pasan a `var(--hue-neutral)`. Eso convierte el siguiente ajuste
de temperatura en **una línea**, que es exactamente lo que hoy no es.

> Comentario a incluir en `tokens.css` sobre `--hue-neutral` (POR QUÉ, no QUÉ):
> ```
> /* Los neutros son fríos porque los tres que la marca declara —navy 265,8°,
>    text_secondary 257,3°, border 255,5°— lo son. A 256° `--warm-200` reproduce
>    el `#E2E8F0` del kit. El nombre `--warm-*` es anterior y se conserva hasta
>    que el renombrado se haga en su propia entrega: mezclarlo con un recoloreo
>    hace imposible atribuir qué línea base visual cambió por qué. */
> ```

### 3.4 Segundo eje de acento: **no**

| Color de marca | H OKLCH | Contra qué choca | Veredicto |
|---|---:|---|---|
| `coral #F43F5E` | **16,4** | `--danger-*` está en **25°**. Separación: **8,6°**. | **Veto.** Un acento a 8,6° del rojo de error hace que «destacado» y «algo ha fallado» sean el mismo color. En una app clínica donde se anulan facturas y se registran dosis, eso no es un matiz. |
| `teal #14B8A6` | 182,5 | Nada (a 32,5° de success) | **Veto por contraste.** Mide **2,48:1** sobre blanco: incumple §1.4.11 (3:1) incluso como objeto gráfico. Para llegar a 4,5:1 hay que bajarlo a L 52 %, y ahí `oklch(52% 0.12 182.5)` **cae fuera de sRGB**. |

**Conclusión: un solo eje cromático (281°) más los tres semánticos que ya existen.** Teal y coral viven
**exclusivamente dentro de la ilustración del logotipo**, donde WCAG 2.2 los exime: §1.4.3 y §1.4.11
excluyen los logotipos, y el criterio no aplica a colores que no comunican estado ni delimitan un
control.

### 3.5 Superficie de marca vs superficie de aplicación

`#F5F3FF` **no puede ser el fondo de la aplicación.** Calculado: `#F5F3FF` contra el `--warm-100`
propuesto (`#f2f5fb`) da **ratio 1,00** — son indistinguibles. La app usa cuatro superficies apiladas
(`--surface` / `--surface-muted` / `--surface-sunken` / `--amatista-50`) y meter `#F5F3FF` entre ellas
colapsaría dos niveles de la jerarquía.

**Regla de superficie, que es la que resuelve la pregunta de branding:**

| Superficie | Fondo | Dónde |
|---|---|---|
| **De marca** | `#F5F3FF` (`--brand-canvas`, hex literal del kit) | Landing, pantallas de auth públicas, plancha del logotipo, cabecera de los correos, OG |
| **De aplicación** | `--surface` = `--warm-50` (`#fafcff`) | Todo lo autenticado en los dos fronts |
| **De acento en app** | `--amatista-50` (`#f3f4ff`) | Banner informativo, fila seleccionada |

`--amatista-50` a 281° (`#f3f4ff`) y `#F5F3FF` tienen **ratio 1,00** entre sí: la app se lee como
continuación del lienzo de marca sin que ninguno de los dos deje de tener su papel.

**Contrato de contraste del lienzo de marca**, calculado sobre `#F5F3FF`:

| Encima va | Ratio | §1.4.3 |
|---|---:|---|
| `navy #0F172A` | 16,28 | PASA |
| `text_secondary #475569` | 6,91 | PASA |
| `violet #6D28D9` | 6,48 | PASA |
| `indigo #4F46E5` | 5,73 | PASA |
| `--amatista-600` | 5,87 | PASA |
| **`--amatista-500`** | **4,16** | **FALLA** → sobre `#F5F3FF`, el texto primario usa **`--amatista-600`**, nunca el 500 |

**Y una advertencia dura sobre `border: #E2E8F0`:** mide **1,23:1 sobre blanco** y **1,12:1 sobre
`#F5F3FF`**. **No puede usarse como borde de control** (§1.4.11 exige 3:1). Sirve solo de separador
decorativo. El borde de control sigue siendo **`--warm-450`** (`#80878f`, 3,63:1 sobre blanco), que es
justo el escalón que A11Y-09 creó para eso. **Si alguien mapea `border` del kit a `--border`, rompe la
conformidad que A11Y-09 pagó.**

---

## 4 · Tabla token → valor, literal

Todo lo de abajo es `src/assets/styles/tokens.css`, **gemelo TR-02: byte a byte idéntico en los dos
repos**. Sintaxis OKLCH respetada tal como está en el fichero (`%` en L, `deg` en H literal).

### 4.1 Rampa de marca

| Token | Valor actual | **Valor nuevo** | Motivo | hex resultante |
|---|---|---|---|---|
| `--hue` | `300` | **`281`** | §3.1 | — |
| `--amatista-50` | `oklch(97% 0.015 var(--hue))` | *sin cambio* | En gamut a 281° | `#f3f4ff` |
| `--amatista-100` | `oklch(94% 0.035 var(--hue))` | **`oklch(94% 0.029 var(--hue))`** | 0,035 cae fuera de sRGB (máx 0,0299). Ya caía a 300°. | `#e7e9ff` |
| `--amatista-200` | `oklch(88% 0.07 var(--hue))` | **`oklch(88% 0.059 var(--hue))`** | Máx 0,0606. Ya caía a 300°. | `#d0d4fe` |
| `--amatista-300` | `oklch(78% 0.12 var(--hue))` | **`oklch(78% 0.113 var(--hue))`** | Máx 0,1150 a 281°. | `#aaaffe` |
| `--amatista-400` | `oklch(68% 0.16 var(--hue))` | *sin cambio* | En gamut | `#8989f8` |
| `--amatista-450` | `oklch(62% 0.16 var(--hue))` | *sin cambio* | En gamut; 3,47:1 / 3,69:1 (§5.3) | `#7777e3` |
| `--amatista-500` | `oklch(58% 0.18 var(--hue))` | *sin cambio* | En gamut | `#6b66e0` |
| `--amatista-600` | `oklch(50% 0.18 var(--hue))` | *sin cambio* | En gamut | `#564dc5` |
| `--amatista-700` | `oklch(42% 0.16 var(--hue))` | *sin cambio* | En gamut | `#4339a0` |
| `--amatista-800` | `oklch(32% 0.12 var(--hue))` | *sin cambio* | En gamut | `#2b256d` |
| `--amatista-900` | `oklch(22% 0.08 var(--hue))` | *sin cambio* | En gamut | `#16133e` |

> Actualizar el comentario A11Y-09 de `--amatista-450`: hoy dice «*a 180deg cae a 2,92:1*». El
> guard-rail sigue siendo cierto, pero el valor medido a **281°** es **3,47:1** sobre `--amatista-50` y
> **3,69:1** sobre `--warm-50` (antes 3,55 / 3,77). Hay que reescribir esos dos números o el comentario
> pasa a mentir.

### 4.2 Rampa neutra

| Token | Valor actual | **Valor nuevo** | hex resultante |
|---|---|---|---|
| *(nuevo)* | — | **`--hue-neutral: 256;`** | — |
| `--warm-50` | `oklch(99% 0.005 60deg)` | **`oklch(99% 0.005 var(--hue-neutral))`** | `#fafcff` |
| `--warm-100` | `oklch(97% 0.008 60deg)` | **`… var(--hue-neutral))`** | `#f2f5fb` |
| `--warm-150` | `oklch(95% 0.01 60deg)` | **`… var(--hue-neutral))`** | `#eaeff5` |
| `--warm-200` | `oklch(92% 0.012 60deg)` | **`… var(--hue-neutral))`** | `#dfe5ed` |
| `--warm-300` | `oklch(86% 0.015 60deg)` | **`… var(--hue-neutral))`** | `#cbd2db` |
| `--warm-400` | `oklch(72% 0.015 60deg)` | **`… var(--hue-neutral))`** | `#9fa5ae` |
| `--warm-450` | `oklch(62% 0.015 60deg)` | **`… var(--hue-neutral))`** | `#80878f` |
| `--warm-500` | `oklch(52% 0.012 60deg)` | **`… var(--hue-neutral))`** | `#646970` |
| `--warm-600` | `oklch(45% 0.012 60deg)` | **`… var(--hue-neutral))`** | `#51565c` |
| `--warm-700` | `oklch(35% 0.012 60deg)` | **`… var(--hue-neutral))`** | `#363b41` |
| `--warm-800` | `oklch(25% 0.012 60deg)` | **`… var(--hue-neutral))`** | `#1e2227` |
| `--warm-900` | `oklch(16% 0.012 60deg)` | **`… var(--hue-neutral))`** | `#0a0e12` |
| `--text-placeholder` | `oklch(54% 0.012 60deg)` | **`oklch(54% 0.012 var(--hue-neutral))`** | `#6a6f76` |

**Ningún escalón neutro cae fuera de sRGB a 256°** (margen más ajustado: 0,0005 en `--warm-50`).

### 4.3 Corrección de defecto y token nuevo de marca

| Token | Valor actual | **Valor nuevo** | Motivo |
|---|---|---|---|
| `--info-border` | `oklch(62% 0.15 300deg)` | **`oklch(62% 0.15 var(--hue))`** | **Defecto n.º 1 del §0.** Hue literal en un token que debe seguir al primario. Resultado: `#7878dd`, 3,47:1 sobre `--amatista-50` — sigue cumpliendo. |
| *(nuevo)* | — | **`--brand-canvas: #f5f3ff;`** | El lienzo de marca (§3.5). Hex literal y no OKLCH **a propósito**: es el valor exacto que el kit aprueba para la plancha del logotipo, y una conversión a OKLCH lo movería. |

> Comentario para `--brand-canvas` (POR QUÉ):
> ```
> /* Hex literal y no OKLCH: es el fondo que el kit aprueba para la plancha del
>    logotipo, y los PNG `-on-F5F3FF-` ya lo llevan quemado. Cualquier deriva de
>    conversión dejaría un borde visible alrededor del isotipo. NO es el fondo de
>    la aplicación: contra `--warm-100` mide 1,00:1 y colapsaría la jerarquía de
>    superficies. */
> ```

**Sin cambio y verificado:** `--gradient-primary`, `--shadow-primary`, `--shadow-primary-soft`, `--ring`
y `--ring-danger` ya son paramétricos sobre `var(--hue)` y siguen cumpliendo (§5.3). Las escalas
`--danger-*`, `--warning-*`, `--success-*`, `--amount-*` y `--compras-ok-*` **no se tocan**: son
semánticas, no de marca, y su hue es independiente.

### 4.4 Tokens que se retiran

| Token | Consumidores en `src/` | Acción |
|---|---:|---|
| `--v-bg` `--v-surface` `--v-primary` `--v-secondary` `--v-success` `--v-error` `--v-warning` `--v-info` | **0** (verificado en los dos repos) | **Retirar las 8 líneas.** Duplican la fuente de verdad del tema de Vuetify, que vive en `vuetify.ts`, y son el origen del defecto n.º 3. |
| `--font-serif` | 43 | Retirar **después** de migrar los 43 a `--font-display` (§8). |

### 4.5 Tipografía

| Token | Valor actual | **Valor nuevo** |
|---|---|---|
| `--font-sans` | `'Geist', -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, sans-serif` | **`'Inter', -apple-system, blinkmacsystemfont, 'Segoe UI', roboto, sans-serif`** |
| *(nuevo)* `--font-display` | — | **`'Poppins', 'Inter', system-ui, sans-serif`** |
| `--font-serif` | `'Instrument Serif', georgia, serif` | **retirado** tras migrar sus 43 consumidores |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace` | **sin cambio** — el kit no se pronuncia sobre monoespaciada y los recibos térmicos y los identificadores de traza la necesitan |

### 4.6 Tema de Vuetify

`src/plugins/vuetify.ts` (**es gemelo TR-02**: lo declara `scripts/tr02-parity.config.json:15`, que es
lo que comprueba `npm run quality`, y la tabla de gemelos del `CLAUDE.md` de los dos fronts. Los ocho
valores de abajo son, por tanto, idénticos en los dos repos y los aplica `front-parity`).
**Regla nueva: el tema de Vuetify es un espejo en sRGB de los tokens del DS, no una paleta paralela.**
Eso es lo que cierra el defecto n.º 3 de forma permanente.

| Clave | Valor actual | **Valor nuevo** | Token que espeja | Blanco encima |
|---|---|---|---|---|
| `background` | `#F9FAFB` | **`#FAFCFF`** | `--warm-50` | — |
| `surface` | `#FFFFFF` | *sin cambio* | — | — |
| `primary` | `#7C3AED` | **`#564DC5`** | `--amatista-600` | **6,43:1** PASA |
| `secondary` | `#6B7280` | **`#646970`** | `--warm-500` | **5,53:1** PASA |
| `success` | `#10B981` | **`#278733`** | `--success-dot` | 4,57:1 PASA |
| `error` | `#EF4444` | **`#C53637`** | `--danger-500` | **5,31:1** PASA |
| `warning` | `#F59E0B` | **`#683D00`** | `--warning-900` / `--warning-fg` | **9,31:1** PASA |
| `info` | `#3B82F6` | **`#564DC5`** | `--amatista-600` | 6,43:1 PASA |

> **Por qué `warning` espeja `--warning-900` y no `--warning-border`.** Mi primera elección fue
> `--warning-border` (`#A57710`) por simetría con `error`. **Recalculado: mide 4,00:1 con blanco encima
> e incumple §1.4.3.** Vuetify usa `warning` como relleno de `VBtn variant="elevated"`, que es el
> `default` de este repo (`vuetify.ts:43`), así que ahí sí va texto encima. `--warning-900` es además el
> token que la app ya usa para texto de aviso (`--warning-fg`). **Ningún amarillo entre L 48 % y 60 % con
> croma 0,12 pasa 4,5:1 estando dentro de sRGB**: en el eje 80° no hay término medio, y por eso el
> semántico de aviso se resuelve oscuro. Que en `vuetify.ts` sea un hex literal lo deja inmune al
> recorte de gamut que sí afecta a la declaración OKLCH de `tokens.css`.

> Comentario a sustituir en `vuetify.ts:15-16` (hoy dice «Amatista (hue 300) … ≈ #7C3AED»):
> ```
> // Espejo en sRGB de los tokens de `tokens.css`, no una paleta aparte: cuando
> // estos ocho valores se eligieron por su cuenta, `primary` acabó a #7C3AED
> // mientras el token del sistema decía otra cosa, y las pantallas públicas se
> // pintaron con dos primarios distintos sin que ningún gate lo viera.
> ```

**Aviso de fuente:** `vuetifyjs.com/en/features/theme/` es una SPA y `WebFetch` devuelve solo el título.
La forma de `createVuetify({ theme: { defaultTheme, themes } })` que se propone es **la que el repo ya
usa y compila hoy** (`vuetify.ts:36-40`), no una reconstruida de memoria. **No verificado contra la
documentación oficial de Vuetify 3.**

---

## 5 · Verificación de contraste WCAG 2.2 AA — calculada

### 5.1 Validación del motor

Antes de proponer nada, se reprodujeron los ratios que `tokens.css` documenta hoy (hue 300, neutro 60):

| Par documentado en `tokens.css` | Dice el fichero | **Calculado aquí** | Δ |
|---|---:|---:|---:|
| `--amatista-450` / `--amatista-50` | 3,55 | **3,53** | −0,02 |
| `--amatista-450` / `--warm-50` | 3,77 | **3,76** | −0,01 |
| `--amatista-300` / `--warm-50` | 2,02 | **2,02** | 0,00 |
| `--amatista-300` / `--amatista-50` | 1,90 | **1,90** | 0,00 |
| `--warm-450` / `--warm-50` | 3,55 | **3,56** | +0,01 |
| `--warm-200` / `--warm-50` | 1,23 | **1,23** | 0,00 |
| `--warm-500` / `--warm-50` | 5,36 | **5,39** | +0,03 |
| `--warm-500` / `--warm-150` | 4,77 | **4,80** | +0,03 |
| `--text-placeholder` / `--warm-50` | 4,93 | **4,93** | 0,00 |
| `--text-placeholder` / `--warm-150` | 4,38 | **4,39** | +0,01 |
| Anillo `--amatista-500` / `--warm-50` | 4,50 | **4,51** | +0,01 |
| Anillo `--danger-500` / `--warm-50` | 5,16 | **5,15** | −0,01 |
| `--danger-border` / `--warm-50` | 4,14 | **4,15** | +0,01 |
| `--warning-border` / `--warning-50` | 3,41 | **3,41** | 0,00 |
| `--success-border` / `--success-50` | 3,47 | **3,46** | −0,01 |
| `--info-border` / `--amatista-50` | 3,53 | **3,52** | −0,01 |

Desviación máxima **0,03**, atribuible al redondeo a 8 bits antes de calcular la luminancia (que es lo
que el navegador pinta de verdad). **El motor está validado contra el propio fichero.**

### 5.2 Descubrimiento colateral del baseline

A hue 300 / neutro 60, **ya hoy** caen fuera de sRGB: `--amatista-100`, `--amatista-200`, `--danger-50`,
`--danger-100`, `--danger-400`, `--warning-50`. Los dos primeros los arregla esta propuesta; los cuatro
de las escalas semánticas **no dependen de `--hue`** y quedan fuera de este rebrand. Van al §13 como
issue propuesto.

### 5.3 Resultado con la propuesta — hue 281 / neutro 256

**34 pares. Cero incumplimientos.**

| Ratio | Mín | Crit. | Par | fg / bg |
|---:|---:|---|---|---|
| **3,47** | 3 | 1.4.11 | `--amatista-450` / `--amatista-50` (borde de selección) | `#7777e3` / `#f3f4ff` |
| **3,69** | 3 | 1.4.11 | `--amatista-450` / `--warm-50` | `#7777e3` / `#fafcff` |
| **3,80** | 3 | 1.4.11 | `--amatista-450` / blanco | `#7777e3` / `#ffffff` |
| **3,54** | 3 | 1.4.11 | `--warm-450` / `--warm-50` (borde de control) | `#80878f` / `#fafcff` |
| **3,63** | 3 | 1.4.11 | `--warm-450` / blanco | `#80878f` / `#ffffff` |
| **5,38** | 4,5 | 1.4.3 | `--warm-500` / `--warm-50` | `#646970` / `#fafcff` |
| **5,07** | 4,5 | 1.4.3 | `--warm-500` / `--warm-100` | `#646970` / `#f2f5fb` |
| **4,78** | 4,5 | 1.4.3 | `--warm-500` / `--warm-150` | `#646970` / `#eaeff5` |
| **5,06** | 4,5 | 1.4.3 | `--warm-500` / `--amatista-50` | `#646970` / `#f3f4ff` |
| **5,53** | 4,5 | 1.4.3 | `--warm-500` / blanco | `#646970` / `#ffffff` |
| **4,93** | 4,5 | 1.4.3 | `--text-placeholder` / `--warm-50` | `#6a6f76` / `#fafcff` |
| **5,06** | 4,5 | 1.4.3 | `--text-placeholder` / blanco | `#6a6f76` / `#ffffff` |
| **4,44** | 3 | 1.4.11 | anillo `--amatista-500` / `--warm-50` | `#6b66e0` / `#fafcff` |
| **4,56** | 3 | 1.4.11 | anillo `--amatista-500` / blanco | `#6b66e0` / `#ffffff` |
| **5,16** | 3 | 1.4.11 | anillo `--danger-500` / `--warm-50` | `#c53637` / `#fafcff` |
| **3,45** | 3 | 1.4.11 | `--danger-border` / `--danger-100` | `#ce514d` / `#ffe0da` |
| **4,16** | 3 | 1.4.11 | `--danger-border` / `--warm-50` | `#ce514d` / `#fafcff` |
| **3,41** | 3 | 1.4.11 | `--warning-border` / `--warning-50` | `#a57710` / `#ffebc2` |
| **3,89** | 3 | 1.4.11 | `--warning-border` / `--warm-50` | `#a57710` / `#fafcff` |
| **3,46** | 3 | 1.4.11 | `--success-border` / `--success-50` | `#3d8e53` / `#d0f7d6` |
| **3,94** | 3 | 1.4.11 | `--success-border` / `--warm-50` | `#3d8e53` / `#fafcff` |
| **3,47** | 3 | 1.4.11 | `--info-border` (**corregido**) / `--amatista-50` | `#7878dd` / `#f3f4ff` |
| **3,70** | 3 | 1.4.11 | `--info-border` / `--warm-50` | `#7878dd` / `#fafcff` |
| **18,84** | 4,5 | 1.4.3 | `--text` / `--warm-50` | `#0a0e12` / `#fafcff` |
| **17,70** | 4,5 | 1.4.3 | `--text` / `--amatista-50` | `#0a0e12` / `#f3f4ff` |
| **7,21** | 4,5 | 1.4.3 | `--text-muted` / `--warm-50` | `#51565c` / `#fafcff` |
| **7,41** | 4,5 | 1.4.3 | `--text-muted` / blanco | `#51565c` / `#ffffff` |
| **7,52** | 4,5 | 1.4.3 | `--success-fg` / `--success-bg` | `#1d5522` / `#dbf3db` |
| **7,96** | 4,5 | 1.4.3 | blanco / gradiente, extremo claro | `#4a3eb4` |
| **10,73** | 4,5 | 1.4.3 | blanco / gradiente, extremo oscuro | `#302a9f` |
| **6,43** | 4,5 | 1.4.3 | blanco / `--amatista-600` (botón sólido) | `#564dc5` |
| **4,56** | 4,5 | 1.4.3 | blanco / `--amatista-500` | `#6b66e0` |
| **8,76** | 3 | 1.4.11 | `--amatista-700` (PawLoader) / `--warm-50` | `#4339a0` / `#fafcff` |
| **9,01** | 3 | 1.4.11 | `--amatista-700` / blanco | `#4339a0` / `#ffffff` |

**Los tres márgenes que hay que vigilar y por qué siguen siendo suficientes:**

- **`blanco / --amatista-500` = 4,56:1** (antes 4,65). Margen sobre 4,5 de solo **0,06**. `.ds-btn`
  sólido usa `--amatista-600` (6,43), no el 500, así que este par no está en ninguna ruta de texto
  real; queda como suelo. **Si alguien pone texto blanco sobre `--amatista-500`, está a 0,06 del
  incumplimiento.** Añadir esa frase al comentario del token.
- **Anillo `--amatista-500` / `--warm-50` = 4,44:1** (antes 4,51). Su umbral es **3:1** (§1.4.11), no
  4,5: es un indicador no textual. Margen real **1,48×**. El comentario A11Y-01 cita «4,50:1» y hay que
  actualizarlo a 4,44 o pasa a mentir.
- **`--danger-border` / `--danger-100` = 3,45:1** y **`--warning-border` / `--warning-50` = 3,41:1**.
  Inalterados por el rebrand (hues semánticos), pero son los pares más ajustados del sistema.

### 5.4 Contraste que aporta la marca — y lo que NO se puede usar

Ya en el §3.5, con el veredicto duro: **`border: #E2E8F0` mide 1,23:1 sobre blanco y no vale como
borde de control.** El contorno de campo sigue siendo `--warm-450`.

---

## 6 · Invariante de rampa: el número mayor SIEMPRE oscurece

Comprobado sobre la propuesta con la luminancia relativa WCAG (Y×100), **incluidos los escalones
`-450`**:

**`--amatista-*` (281°) — monótona decreciente:**
`50` 90,98 → `100` 82,49 → `200` 67,65 → `300` 46,36 → `400` 29,99 → **`450` 22,66** → `500` 18,01 →
`600` 11,32 → `700` 6,66 → `800` 2,94 → `900` 0,98 ✅

**`--warm-*` (256°) — monótona decreciente:**
`50` 97,16 → `100` 91,15 → `150` 85,82 → `200` 77,84 → `300` 63,90 → `400` 37,34 → **`450` 23,90** →
`500` 13,98 → `600` 9,18 → `700` 4,29 → `800` 1,57 → `900` 0,42 ✅

Los dos `-450` quedan donde su valor manda: entre el 400 y el 500, exactamente como documenta el
comentario del invariante. **La bajada de croma del §4.1 no altera el orden** — verificado, no supuesto:
tocar el croma mueve la luminancia y por eso el invariante se recomprueba después del ajuste, no antes.

---

## 7 · Sistema de logotipo

### 7.1 El problema de los 30×30, resuelto

Los contenedores de marca actuales son de **30×30 px** y el isotipo, inspeccionado, **no es legible por
debajo de ~48 px**. La respuesta no es «poner el PNG».

**Regla de tres tramos:**

| Tramo | Qué se pinta | Por qué |
|---|---|---|
| **< 48 px** | **El isotipo NO se usa.** Va la palabra **«Lumbre»** en Poppins 600 como texto vivo, con el color `--text` | A ese tamaño la ilustración es una mancha y la identidad la carga el nombre, no el dibujo |
| **48–96 px** | Isotipo completo, transparente | Se lee el árbol y las siluetas |
| **≥ 96 px** | Isotipo o lockup, según superficie | Detalle completo |

**Excepción única y acotada — el raíl del sidebar.** En tablet (`≤1024px`) el tenant oculta el texto de
la marca (`SidebarBrand.vue:68-70`). Ahí, y solo ahí, el isotipo va a **32×32** como **firma de color**,
acompañado obligatoriamente de un `<span class="ds-sr-only">Lumbre</span>` para que el nombre no se
pierda cuando el texto se esconde. Es un compromiso consciente: a 32 px se reconoce la mancha
violeta-turquesa, no la escena.

**Dependencia abierta que hay que pedir a quien produjo el kit:** un **glifo vectorial simplificado**
(silueta del árbol en un solo color, sin hojas ni calendario) para el tramo `< 48 px`. Hasta que exista,
manda la regla de arriba. **Ningún archivo del kit actual sirve para ese tramo.**

### 7.2 El wordmark va como texto vivo, no como imagen

Ni una superficie usa `04_WORDMARK/`. Motivos, en orden:

1. El recorte está mal (§2.2): incluye el calendario y el suelo del isotipo.
2. WCAG 2.2 §1.4.5 Images of Text (AA) solo exime «*text that is part of a logo or brand name*». El
   nombre «Lumbre» dentro del lockup sí queda exento; una imagen suelta con el nombre puesta donde
   podría ir texto, **no**.
3. **La tagline no está exenta.** Consultado el Understanding de §1.4.5: la excepción cubre el nombre de
   marca, **no un eslogan**. Donde aparezca «GESTIONA LO QUE CUIDAS» tiene que estar disponible como
   texto (o como `alt` del lockup que lo contiene).

`--font-display` (Poppins 600) reproduce la familia del wordmark, escala sin pérdida, hereda el color y
no pesa un solo byte extra: Poppins ya entra por la tipografía (§8).

### 7.3 Tabla de superficies — qué archivo, qué caja, qué atributos

Todos los assets se sirven desde `public/brand/` **de cada repo**. Es obligatorio en la consola:
`VetSoftwareFront/public/_headers` fija `img-src 'self' data:`, así que **ninguna imagen remota carga**.
El tenant permite `https:` por el QR de la DIAN, pero se aplica la misma regla por simetría y para que
las líneas base visuales no dependan de la red.

| Superficie | Fichero del kit | Caja CSS | Fondo | Formato | Atributos obligatorios |
|---|---|---|---|---|---|
| **Sidebar consola** (`SidebarBrand.vue`) | — | — | — | — | **Texto «Lumbre» en `--font-display` 600** + subtítulo «Panel de plataforma». Sin imagen. |
| **Sidebar tenant, escritorio** (`SidebarBrand.vue`) | — | — | — | — | Texto «Lumbre». Sin imagen. |
| **Sidebar tenant, raíl ≤1024 px** | `02_LOGO_ONLY/webp/…-transparent-128.webp` | **32×32** | transparente | WebP + PNG 32/64 fallback | `width="32" height="32" alt="" decoding="async" loading="eager"` + `<span class="ds-sr-only">Lumbre</span>` |
| **Topbar de la landing** (`LandingTopbar.vue`) | `02_LOGO_ONLY/…-transparent-128.webp` | **28×28** ⚠️ | transparente | WebP + PNG | Ver nota ⚠️ abajo |
| **Layout público del tenant** (`components/public/PublicLayout.vue`) | — | — | — | — | **Texto «Lumbre» en `--font-display`. Sin imagen**, por el tramo `<48 px` del §7.1 |
| **Layout público consola** (`layout/PublicLayout.vue`) | — | — | — | — | ídem |
| **Tarjeta de auth (login, registro, invitación)** | `03_LOCKUP/webp/…-transparent-480.webp` | `clamp(104px, 18vh, 160px)` | `--brand-canvas` | WebP + PNG 480 | `alt="Lumbre — Gestiona lo que cuidas" decoding="async" loading="eager"`. La caja no es fija: en ventanas de ≤578 px de alto baja a 104 px para que la tarjeta no cruce el pliegue en portátiles. Es un **lockup**, con el nombre dentro de la imagen, así que el tramo `<48 px` del §7.1 —pensado para el isotipo solo— no lo alcanza |
| **Héroe de la landing** | `03_LOCKUP/webp/…-transparent-{480,768,1024}.webp` | `clamp(200px, 26vw, 320px)`, 1:1 | `--brand-canvas` | WebP + `srcset` `480w/768w/1024w` + `sizes` | `width="320" height="320"` (la relación 1:1 reserva la caja y evita CLS) `alt="Lumbre — Gestiona lo que cuidas" fetchpriority="high"` |
| **Favicon** | `05_ICONS_FAVICON/favicon-32x32.png` + `favicon-16x16.png` + `favicon.ico` | — | `#F5F3FF` | PNG + ICO | `<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32x32.png">` |
| **apple-touch-icon** | `05_ICONS_FAVICON/apple-touch-icon.png` (180×180) | — | `#F5F3FF` | PNG | `<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">` |
| **PWA** | `android-chrome-192x192.png`, `-512x512.png`, `maskable-icon-512x512.png` | — | `#F5F3FF` | PNG | `site.webmanifest` reescrito (§7.4) |
| **Open Graph** | `06_SOCIAL/open-graph-1200x630.png` | 1200×630 | `#F5F3FF` | PNG | `<meta property="og:image">` + `og:image:width/height` |
| **Twitter/X** | `06_SOCIAL/twitter-x-1200x600.png` | 1200×600 | `#F5F3FF` | PNG | `twitter:card=summary_large_image` + `twitter:image` |
| **Recibo impreso** (`useReceiptPrint.ts`) | **ninguno** | — | — | — | Ver §7.5 |

⚠️ **`LandingTopbar` a 28×28 incumple la regla de los 48 px.** Dos salidas, y hay que elegir una:
**(a)** subir la caja de marca de la landing a **40×40**, que es un cambio de una línea en su `<style
scoped>` y respeta el tramo intermedio; o **(b)** dejarla sin isotipo, solo «Lumbre» en Poppins.
**Recomendación: (b)**, por coherencia con los dos sidebars y porque el enlace ya tiene
`aria-label="…, inicio"` que hay que actualizar de todos modos.

**Formato:** WebP con fallback PNG vía `<picture>`. El kit **no trae WebP por debajo de 128 px** para el
isotipo ni por debajo de 480 para el lockup, así que en las cajas de 32 px se sirve el WebP de 128
(reducido por el navegador, con margen para DPR 4) o el PNG de 64. Ambos por debajo de 18 KB.

**Prevención de CLS:** `width` y `height` en enteros sin unidad en **todas** las `<img>`. MDN es
explícito: permiten al navegador calcular la relación de aspecto antes de la descarga y reservar la
caja. Sin ellos, cada `<img>` de marca es un salto de layout en el primer render — y el de la tarjeta
de auth caería justo encima del formulario que el usuario está a punto de tocar.

**`loading`:** `eager` en sidebar, auth y héroe (están sobre el pliegue; `lazy` ahí retrasa el LCP).
`lazy` solo si alguna marca acaba por debajo del pliegue. `decoding="async"` en todas.

**`alt`:** vacío (`alt=""`) cuando el nombre «Lumbre» está en texto al lado — si no, el lector de
pantalla anuncia la marca dos veces. Con texto: `alt="Lumbre — Gestiona lo que cuidas"` en el lockup,
que es lo que además rescata la tagline para §1.4.5.

### 7.4 `site.webmanifest`

Se copia a `public/` de cada repo con las rutas corregidas y **`name` distinto por front**, porque son
dos aplicaciones instalables diferentes:

```json
{
  "name": "Lumbre — Plataforma",        // tenant: "Lumbre"
  "short_name": "Lumbre",
  "theme_color": "#0F172A",
  "background_color": "#F5F3FF",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/brand/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/brand/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/brand/maskable-icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`theme_color: #0F172A` es el navy de marca y **no** el primario: es el color de la barra del sistema, y
ahí manda la superficie oscura recomendada por el kit.

### 7.5 El recibo impreso: la marca **no** es Lumbre

`useReceiptPrint.ts:183` compone la inicial desde `t.brand.name`, y `buildDocumentReceipt.ts:115` la
rellena con `issuer?.legalName || 'Vetrina'`. **La cabecera del recibo es la clínica, no el proveedor de
software.** Quien recibe ese papel es un cliente de la veterinaria.

**Dictamen:**
- La cabecera del recibo sigue siendo el nombre legal del emisor. Correcto tal cual está.
- El **fallback** `'Vetrina'` pasa a `'Lumbre'` (`buildDocumentReceipt.ts:115` y
  `ReceiptModal.vue:79`). Es un fallback: si aparece, es que falta la configuración del emisor.
- **No se imprime el isotipo.** Es una térmica monocroma de 58/80 mm: una ilustración de cuatro colores
  sale como una mancha negra y gasta rollo.
- La atribución va **en el pie**, como texto de una línea: `Emitido con Lumbre`, en `--font-mono` al
  tamaño que ya usa `.r-foot .web`.

### 7.6 `PawLoader`: se queda la huella

**Dictamen: no se toca el dibujo.** Razones, en orden de peso:

1. Es un **indicador de carga**, no un logotipo. Su trabajo es girar y decir «espera», y el isotipo de
   Lumbre no puede hacerlo: es un PNG. Animar un raster de cuatro colores da un resultado peor.
2. Es SVG de un solo color y hereda `currentColor`. **43 llamadores** en el tenant y 8 en la consola lo
   tiñen según el contexto. Un PNG no se tiñe.
3. Es **gemelo TR-02** y respeta `prefers-reduced-motion`. Sustituirlo invalida las 52 líneas base
   visuales por un cambio que ningún usuario ha pedido.
4. Una huella en una app veterinaria no contradice a un logotipo con perro y gato: conviven.

**Lo único que cambia son sus tres hues literales**, para que siga al primario:

| Línea | Actual | Nuevo |
|---|---|---|
| `PawLoader.vue:39` | `flood-color="oklch(50% 0.18 300)"` | `flood-color="oklch(50% 0.18 281)"` |
| `PawLoader.vue:42` | `flood-color="oklch(55% 0.18 300)"` | `flood-color="oklch(55% 0.18 281)"` |
| `PawLoader.vue:86` | `var(--amatista-700, oklch(42% 0.16 300deg))` | `var(--amatista-700, oklch(42% 0.16 281deg))` |

Los `flood-color` **no pueden** usar `var(--hue)`: son atributos de presentación SVG dentro de `<defs>`
y las custom properties no resuelven ahí de forma fiable en todos los motores. Quedan literales, y por
eso conviene el comentario de POR QUÉ en el propio fichero.

### 7.7 Los tres isotipos incoherentes: se unifican

| Hoy | Qué es | Después |
|---|---|---|
| Consola `SidebarBrand.vue:24` | Cuadro 30×30 con degradado + Lucide `PawPrint` 16 px | Texto «Lumbre» en `--font-display` |
| Tenant `SidebarBrand.vue:15` | Cuadro 30×30 con la letra **«V»** en serif itálica | Texto «Lumbre»; en raíl ≤1024 px, isotipo 32×32 + `ds-sr-only` |
| Tenant `public/PublicLayout.vue:44` | **`<v-icon>mdi-paw</v-icon>`** — MDI en un repo que declara Lucide | Isotipo 32×32 + texto |
| `LandingTopbar.vue:25` | Lucide `PawPrint` 17 px | Texto «Lumbre» (opción **b** del §7.3) |

El `mdi-paw` del tenant es además un **defecto previo**: el repo declara Lucide (`lucide-vue-next`) y
esa es la única pantalla que mete un glifo de Material Design Icons. Se va con este cambio.

**Nota de teclado y objetivo táctil.** `LandingTopbar.vue:23` y `public/PublicLayout.vue:43` envuelven
la marca en un `RouterLink`. Al quitar el cuadro de 30×30 y dejar solo texto, hay que comprobar que la
caja del enlace sigue midiendo **≥24×24 px CSS** (WCAG 2.2 §2.5.8 Target Size (Minimum), AA). Con
`--font-display` a 15–17 px y el `padding` actual se cumple, pero es una comprobación explícita del
implementador, no una suposición.

---

## 8 · Tipografía

**Decisión ya tomada por el usuario:** se adopta Poppins + Inter. Aquí solo el cómo.

### 8.1 Por qué el cambio cuesta menos de lo que parece

**Inter ya se descarga en los dos repos.** Los dos `index.html` piden
`family=Inter:wght@400;500;600;700` (consola línea 9, tenant línea 10), y `public-auth.css:66` ya
declara `font-family: Inter, system-ui, sans-serif` para toda la zona pública del tenant. Cambiar
`--font-sans` a Inter **no añade una sola petición**: unifica la app autenticada con la zona pública,
que hoy usan tipografías distintas.

**Poppins es la única familia nueva.** Geist e Instrument Serif salen del `<link>`. Balance de red
aproximado: −2 familias, +1.

### 8.2 El `<link>` nuevo (idéntico en los dos `index.html`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

Pesos de Poppins tomados del propio `08_FRONTEND/fonts.css` del kit (`500;600;700`).

### 8.3 ¿Google Fonts o autoalojada?

**Dictamen: Google Fonts ahora; autoalojar en una entrega posterior, y no por rendimiento.**

- **Es viable hoy:** la CSP de los dos repos ya permite `style-src … https://fonts.googleapis.com` y
  `font-src 'self' data: https://fonts.gstatic.com`. **No hay que tocar `_headers` ni `nginx.conf`**, y
  eso importa: `tests/unit/security-headers.spec.ts` verifica que los dos archivos declaren lo mismo, y
  meter un cambio de CSP dentro de un rebrand multiplica la superficie de fallo.
- **El argumento real para autoalojar no es la velocidad, es el determinismo.** La suite visual ya
  bloquea `fonts.googleapis.com` y sirve `.woff2` desde `visual/fonts/` justo por eso. Que producción
  dependa de un tercero mientras las capturas no lo hacen es una discrepancia latente.
- **Coste de autoalojar:** 4 ficheros `.woff2` nuevos en `public/fonts/` por repo + `@font-face` propios
  + retirar los `preconnect` + poder quitar `https://fonts.googleapis.com` de `style-src`. Es una tarea
  con su propio riesgo (subsetting, `unicode-range`, licencias OFL) y **no debe ir dentro del rebrand**.

### 8.4 `visual/fonts/` — obligatorio, o la suite visual falla

`visual/gallery.visual.spec.ts:87` **aborta toda petición a `fonts.googleapis.com` y `fonts.gstatic.com`**
y `:122-123` afirma `fuentes.fallidas === []` y `fuentes.sinCargar === []`. Las familias llegan por
disco desde `visual/fonts/`, que hoy contiene:

`geist-variable-latin.woff2` · `instrument-serif-400-latin.woff2` ·
`instrument-serif-400-italic-latin.woff2` · `jetbrains-mono-variable-latin.woff2`

**Sin tocar esto, la suite visual falla con «declaradas en visual/fonts.css pero sin cargar», no con un
diff de píxeles** — y el síntoma no señalará a la causa.

**Lo que hay que hacer, en los DOS repos (`visual/fonts.css` es gemelo, verificado idéntico):**

1. **Añadir** `inter-variable-latin.woff2` y `poppins-{500,600,700}-latin.woff2` a `visual/fonts/`.
   Inter es variable (un fichero, tres `@font-face` apuntando al mismo `src`, como ya se hace con
   Geist); **Poppins no es variable en Google Fonts: son tres ficheros distintos**, y declarar uno solo
   pintaría los tres pesos iguales sin avisar — que es justo el fallo que el comentario de
   `visual/fonts.css` documenta haber sufrido con Geist.
2. **Retirar** `geist-variable-latin.woff2` e `instrument-serif-*` y sus `@font-face`.
3. **Actualizar `fonts/LICENSE.md`**: Inter, Poppins y JetBrains Mono son SIL OFL 1.1, y la propia
   licencia exige que el texto acompañe a los ficheros.

### 8.5 Migración de `--font-serif`

**43 ocurrencias en 37 ficheros**, muy desigualmente repartidas: **2 en 2 ficheros** de la consola y
**41 en 35 ficheros** del tenant. Sustitución mecánica `var(--font-serif)` → `var(--font-display)` y
retirada del token. Dos avisos:

- `VetSoftwarePublicFront/src/components/layout/SidebarBrand.vue:40-41` usa `--font-serif` + `italic`
  para la «V». Esa regla **desaparece entera** con el §7.7, no se migra.
- Hay **22 líneas en 11 ficheros con `Geist` o `Instrument Serif` escritos a pelo**, fuera de token
  (incluidos `public-auth.css` y los dos `tokens.css`). Hay que barrerlas o quedarán como un tercer
  origen de verdad tipográfico.

---

## 9 · `public-auth.css` — recolorear en sitio, no reescribir

797 líneas, **solo tenant, NO gemelo TR-02**, con **34 variables `--pub-*`** declaradas bajo
`.pub-scope` (no en `:root`) — 31 en hex literal y 3 de sombra.

**Dictamen: se recolorean los valores en sitio. NO se reescriben apuntando a los tokens del DS.**

| Motivo | Detalle |
|---|---|
| **Los comentarios documentan ratios medidos contra esos hex** | `public-auth.css:18-22` fija que `--pub-ink-400` (4,05:1) es «SOLO ICONO, NUNCA TEXTO»; `:45-48` explica por qué se retiró `--pub-err-tx`; `:52-53` por qué `#16a34a` se cambió por `#15803d`. Apuntar esas variables a tokens del DS **invalida cada uno de esos ratios en silencio**, que es exactamente el modo de fallo contra el que este documento existe. |
| **El ámbito es distinto a propósito** | `.pub-scope` no es `:root`. Existe «*para no alterar el resto de la app*». Fusionarlo con los tokens borra esa frontera y hace que un ajuste del DS repinte la landing comercial. |
| **La paleta `--pub-ame-*` es Tailwind purple (~290–300°), no la rampa del DS** | No hay correspondencia 1:1 entre los 7 escalones `--pub-ame-*` y los 11 `--amatista-*`. Una fusión exigiría reasignar escalón a escalón y volver a medir 30 pares. |

**Alcance real del recoloreo — 25 de las 34, contadas una a una:**

| Grupo | Cuántas | Acción |
|---|---:|---|
| `--pub-ame-300…900` | 7 | Giran de Tailwind purple (~290–300°) a la familia índigo de 281° |
| `--pub-ink-300…900` | 6 | Giran a fría (256°) |
| `--pub-line`, `--pub-line-2`, `--pub-line-strong`, `--pub-surface` | 4 | Acompañan a los neutros |
| `--pub-tint-50/100/bd/sep/mute` | 5 | Acompañan al primario |
| `--pub-card-shadow`, `--pub-btn-shadow`, `--pub-btn-shadow-hover` | 3 | **Sí se tocan.** Llevan `rgb(91 33 182)` y `rgb(126 34 206)` dentro: son violeta quemado, no neutro |
| `--pub-err-*`, `--pub-ok-*`, `--pub-warn-*` | **9** | **NO se tocan.** Semánticas, con sus ratios medidos en los comentarios `:45-53` |

Ojo con `--pub-ink-400`: su comentario (`public-auth.css:18-22`) fija el contrato «**SOLO ICONO, NUNCA
TEXTO**» sobre un ratio de 4,05:1. Al girarlo hay que recalcular ese número **y** confirmar que sigue
por encima de 3:1 y por debajo de 4,5:1 — si al enfriarlo subiera de 4,5, el contrato deja de tener
sentido y el comentario hay que reescribirlo entero, no retocarle la cifra.

**Condición innegociable:** cada nuevo hex se acompaña de **su ratio recalculado contra el mismo fondo
que el comentario cita hoy**, y el comentario se actualiza con el número nuevo. Un comentario de
contraste con un número obsoleto es peor que no tenerlo.

**Riesgo del §11 que aplica aquí:** `public-auth.css` es la mayor concentración de hex literales del
árbol. Al recolorearla, `vetsoftware/no-duplicate-primitive` puede reordenar colisiones y volver
`needless` algún `stylelint-disable` existente — y con `reportDescriptionlessDisables: true`
(`stylelint.config.mjs:17`) eso se convierte en error.

---

## 10 · Nomenclatura: dónde va «Lumbre», dónde la tagline, y el «Vetrina» disperso

### 10.1 Regla

| Contexto | Qué se pone |
|---|---|
| **Chrome de la app** (sidebar, topbar, títulos de documento) | **«Lumbre» solo.** El eslogan en un sidebar que se ve 8 horas al día es ruido. |
| **Superficies de primera impresión** (landing, tarjeta de auth, correo, OG, PWA) | **«Lumbre» + «Gestiona lo que cuidas»** |
| **Legales, facturación, atribución** | **«Lumbre»** a secas. Un eslogan en un documento legal resta credibilidad. |
| **Recibo térmico** | El nombre de la **clínica**; «Lumbre» solo en el pie como atribución (§7.5) |

La tagline se escribe **«Gestiona lo que cuidas»** en caja normal cuando es texto de interfaz. La versión
en versales del kit («GESTIONA LO QUE CUIDAS») es un tratamiento del logotipo, no una regla ortográfica:
poner el texto en mayúsculas reales —o forzarlo con `text-transform`— hace que algunos lectores de
pantalla lo deletreen letra a letra.

### 10.2 Literales a sustituir — lista cerrada

**Estado real verificado: `Vetrina` (5) y `VetSoftware` (39) conviven hoy en los fronts. Son dos marcas
antiguas en el árbol a la vez.**

**A · `VetSoftwareFront` (consola) — 15 literales de interfaz**

| Fichero:línea | Actual | Nuevo |
|---|---|---|
| `index.html:13` | `<title>VetSoftware</title>` | `Lumbre` |
| `components/layout/SidebarBrand.vue:27` | `VetSoftware` | `Lumbre` |
| `components/layout/SidebarBrand.vue:28` | `Panel administrativo` | `Panel de plataforma` |
| `components/layout/PublicLayout.vue:105` | `VetSoftware` | `Lumbre` |
| `components/layout/PublicLayout.vue:124` | `© 2026 VetSoftware` | `© 2026 Lumbre` |
| `features/auth/views/LoginView.vue:53` | `…administrar VetSoftware.` | `…administrar Lumbre.` |
| `features/auth/views/LoginView.vue:54` | `Iniciar sesión · VetSoftware` | `… · Lumbre` |
| `features/platform-access/views/AceptarInvitacionView.vue` :157, :168, :179, :188 | `· VetSoftware` | `· Lumbre` |
| `features/platform-access/views/AprobarAccesoView.vue` :234, :244, :254, :265, :275, :288 | `· VetSoftware` | `· Lumbre` |
| `features/platform-access/views/SolicitarAccesoView.vue` :137, :150, :161, :275 | `VetSoftware` | `Lumbre` |
| `features/dashboard/views/DashboardView.vue:124` | `…cobranza de VetSoftware…` | `…cobranza de Lumbre…` |

**B · `VetSoftwarePublicFront` (tenant) — 13 literales de interfaz**

| Fichero:línea | Actual | Nuevo |
|---|---|---|
| `index.html:7` | `<title>VetSoftware</title>` | `Lumbre` |
| `components/layout/AppSidebar.vue:129` | `app-name="Vetrina"` | `app-name="Lumbre"` |
| `components/public/PublicLayout.vue:45` | `VetSoftware` | `Lumbre` |
| `components/public/PublicLayout.vue:57` | `© 2026 VetSoftware · Colombia` | `© 2026 Lumbre · Colombia` |
| `features/landing/components/LandingTopbar.vue:23` | `aria-label="VetSoftware, inicio"` | `aria-label="Lumbre, inicio"` |
| `features/landing/components/LandingTopbar.vue:27` | `VetSoftware` | `Lumbre` |
| `features/landing/components/LandingFooter.vue:19` | `VetSoftware · Colombia` | `Lumbre · Colombia` |
| `features/legal/components/LegalDocumentBody.vue:47` | `Documento legal · VetSoftware Colombia` | `… · Lumbre Colombia` |
| `features/legal/components/LegalDocumentPage.vue:41` | `VetSoftware` | `Lumbre` |
| `features/registration/components/RegisterForm.vue:254` | `VetSoftware` | `Lumbre` |
| `features/auth/views/LoginView.vue:24` | `…administrar VetSoftware.` | `…administrar Lumbre.` |
| `features/auth/views/RecuperarCodigoView.vue:130` | `…cuentas en Vetrina…` | `…cuentas en Lumbre…` |
| `features/asistente/components/AsistenteFueraDeDominio.vue` :64, :68 | `VetSoftware` | `Lumbre` |
| `features/tienda/components/ReceiptModal.vue:79` | `brand: { name: 'Vetrina' }` | `'Lumbre'` |
| `composables/buildDocumentReceipt.ts:115` | `issuer?.legalName \|\| 'Vetrina'` | `\|\| 'Lumbre'` |
| `composables/useReceiptPrint.ts:183` | fallback `'V'` | `'L'` |

**C · Backend `VetSoftware` — 16 ocurrencias en 11 ficheros** (fuera del alcance de los agentes de
front; se listan para que se abra su propia tarea)

- 5 asuntos de correo: `aiproposal/…/ResendProposalLinkEmailSender.java:58`,
  `coderecovery/…:41`, `employee/…:29`, `passwordreset/…:34`, `platformaccess/…:62`.
- 2 plantillas HTML de correo: `email-templates/ai-proposal-link.html:9`;
  `email-templates/recover-code.html` :9, :39, :55, :81, :141, :157.
- 4 plantillas PDF: `templates/pdf/{cash-arqueo:52, inventory-kardex:49, inventory-purchases:46,
  purchase-book:45}.html`.

⚠️ **`recover-code.html:55` declara `font-family:'Geist',Arial,sans-serif`** y la cabecera va sobre
`#43215F`/`#5B2A86` — la paleta antigua. Al renombrar hay que recolorear esa plantilla también, o el
correo será lo único de la marca que siga siendo morado-amatista. **La comparación es literal: es lo
primero que ve un usuario nuevo.**

⚠️ **El comentario `useReceiptPrint.ts:7`** («*El diseño replica el handoff "Recibo Vetrina"*») es una
referencia a un documento de diseño, no a la marca en pantalla. **Decidir si se actualiza o se deja**;
cambiarlo rompe la trazabilidad con el handoff original.

---

## 11 · Presupuesto de CSS y puertas automáticas

### 11.1 El presupuesto NO está a cero — medido hoy

`node scripts/css-budget.mjs` en los dos repos, **ejecutado** (es lectura, no build):

| | SFC | `<style>` | `<script>` | **Distancia** | Cuerpos repetidos | SFC > 500 |
|---|---:|---:|---:|---:|---:|---:|
| Consola | 285 | 4.604 | 23.767 | **−19.163** (techo 0) | 0 (techo 0) | 0 (techo 0) |
| Tenant | 402 | 23.046 | 27.727 | **−4.681** (techo 0) | 0 (techo 0) | 0 (techo 0) |

**`maxStyleMinusScript: 0` no significa «cero líneas nuevas»:** significa «el CSS no puede superar a la
lógica», y hay **19.163** y **4.681** líneas de margen. La premisa de que cualquier línea rompe el gate
es falsa.

**Y algo más importante: `tokens.css` y `primitives.css` no cuentan.** `css-budget.mjs:56-64` recorre
`src/` y **solo recoge ficheros `.vue`**. Todo el recoloreo del §4 tiene **coste de presupuesto cero**.

### 11.2 Lo que sí está a cero, y es lo que hay que respetar

| Gate | Techo | Qué lo rompe en este rebrand | Compensación |
|---|---|---|---|
| `maxOversizedSfc: 0` (500 líneas) | **0 infractores** | `VetSoftwarePublicFront/src/components/layout/AppSidebar.vue` está en **497**. Quedan **3 líneas**. | **El marcado del logo no entra en `AppSidebar.vue`.** Va dentro de `SidebarBrand.vue` (72 líneas), que tiene 428 de margen. Si aun así no cupiera, se paga extrayendo, no subiendo el techo. |
| `maxDuplicateGroups: 0` (cuerpo idéntico en >3 SFC) | **0 grupos** | El bloque de estilo del `<img>` de marca repetido en 4+ SFC (sidebar tenant, PublicLayout tenant, PublicLayout consola, tarjetas de auth) | **Nace como primitiva `.ds-brand-mark` en `primitives.css`** (gemelo TR-02, fuera del presupuesto). Es exactamente lo que el gate pide: «*lo que se copia en veinte sitios es una primitiva que falta*». |
| `vetsoftware/no-duplicate-primitive` | activa | Un `<style scoped>` que reescriba `.ds-brand-mark` | Ver arriba |
| `reportDescriptionlessDisables: true` (`stylelint.config.mjs:17`) | activa | El recoloreo reordena colisiones y puede volver `needless` un `stylelint-disable` existente → **error** | Barrer los `stylelint-disable` de `public-auth.css` y de los SFC recoloreados **en el mismo PR** |
| `ds-audit.mjs` (techo 320, trinquete) | trinquete | Compara `backgroundColor/backgroundImage/color/border*Color/boxShadow/filter` contra el harness `docs/ds-audit.html`, que tiene **CSS original literal a la izquierda**. Ese literal es de la paleta vieja. | **El harness hay que recolorearlo con el mismo cambio**, o cada par medirá una diferencia que no existe y el trinquete saltará. **No previsto en ninguna lista de reparto hasta ahora.** |

### 11.3 Regresión visual: 52 líneas base

25 en la consola + 27 en el tenant, `threshold: 0.01` y `maxDiffPixels: 60` — calibrado a propósito para
cazar recoloreos del 1 %. **Van a fallar todas, y eso es lo correcto: es la señal de que el cambio se
aplicó.**

- Se regeneran con **`npm run visual:docker:update`**, en contenedor. **Nunca en Windows**: el
  antialiasing del render difiere y las líneas base quedarían inservibles en CI.
- **Antes de regenerar**, hay que haber hecho el §8.4 (`visual/fonts/`). Si no, la suite falla por
  fuentes que no cargan y no por píxeles, y el síntoma engaña.
- **Regenerar es lo último.** Regenerar a medias congela un estado intermedio como si fuera el bueno.

---

## 12 · Reparto por agente — dos listas cerradas

> **Cualquier fichero que no esté en una de estas dos listas no se toca.**
>
> **La Lista A no se escribe a mano: es `scripts/tr02-parity.config.json`.** Ese fichero es lo que
> `npm run quality` lee de verdad, y cualquier entrada de la Lista B que también esté ahí es un
> fichero asignado dos veces. Cuando pasó, los dos desenlaces eran malos: dos agentes editando el
> mismo gemelo a la vez, o ninguno editándolo por suponer cada uno que era del otro —y entonces
> retirar `--font-serif` de `tokens.css` deja dos primitivas apuntando a un token inexistente, un
> cambio visual silencioso que las líneas base congelarían como correcto. Antes de repartir,
> contrasta las dos listas contra ese JSON.

### 12.1 Lista A — gemelos TR-02 → los aplica **`front-parity`**

Byte a byte idénticos en los dos repos. Se editan **a la vez** en `VetSoftwareFront/` y
`VetSoftwarePublicFront/`; un gemelo arreglado solo en un lado es una divergencia que **ningún gate
comprueba**.

| Fichero (ruta relativa, ×2 repos) | Cambio | §|
|---|---|---|
| `src/assets/styles/tokens.css` | `--hue: 281`; nuevo `--hue-neutral: 256`; croma de 100/200/300; 13 × `60deg` → `var(--hue-neutral)`; `--info-border` parametrizado; nuevo `--brand-canvas`; retirar los 8 `--v-*`; `--font-sans` → Inter; nuevo `--font-display`; retirar `--font-serif`; **actualizar los números de los comentarios A11Y-01/02/09/10** | §4 |
| `src/assets/styles/primitives.css` | Nueva primitiva `.ds-brand-mark` (caja del logotipo); migrar `var(--font-serif)` → `var(--font-display)` (:569) | §11.2 · §4.4 |
| `src/assets/styles/base.css` | Ninguno previsto. **Verificar** que `--font-sans` sigue resolviendo | §8 |
| `src/plugins/vuetify.ts` | Los 8 colores del tema + el comentario. **Es gemelo TR-02** (`tr02-parity.config.json:15`), pese a lo que decía el §4.6 | §4.6 |
| `src/components/feedback/PawLoader.vue` | Tres hues `300` → `281` (líneas 39, 42, 86) | §7.6 |
| `src/components/feedback/PageLoader.vue` | Ninguno previsto. Verificar tras el recoloreo | — |
| `src/components/feedback/ToastStack.vue` | Ninguno previsto (usa `--warm-*` y `--danger-500`, que se recolorean solos) | — |
| `src/components/ui/ModalShell.vue` | Migrar `var(--font-serif)` → `var(--font-display)` (:341) | §4.4 |
| `src/components/ui/ErrorSummary.vue` | Ninguno previsto | — |
| `visual/fonts.css` | Retirar Geist e Instrument Serif; añadir Inter (variable, 4 pesos) y Poppins (**3 ficheros**, 500/600/700) | §8.4 |
| `visual/fonts/*.woff2` + `visual/fonts/LICENSE.md` | Añadir 4 ficheros, retirar 3, actualizar licencias | §8.4 |
| `scripts/css-budget.mjs`, `scripts/ds-audit.mjs`, `stylelint-plugins/no-duplicate-primitive.mjs` | **NO SE TOCAN.** Ninguna recomendación de este documento implica subir un techo. | §11 |

### 12.2 Lista B — propios de cada repo → **dos `front-feature`, uno por repo**

**B.1 · `VetSoftwareFront` (consola)**

| Fichero | Cambio |
|---|---|
| `index.html` | `<title>` → `Lumbre`; `<link>` de fuentes (§8.2); `description`, `theme-color`, `og:*`, `twitter:*`, `apple-touch-icon`, `manifest` |
| `src/components/layout/SidebarBrand.vue` | Retirar el cuadro degradado + `ICONS.PAW`; texto «Lumbre» en `--font-display`; subtítulo «Panel de plataforma» |
| `src/components/layout/PublicLayout.vue` | Isotipo 32×32 en `.brand-mark`; literales :105 y :124 |
| `src/features/auth/views/LoginView.vue` | Literales :53, :54 |
| `src/features/platform-access/views/{AceptarInvitacion,AprobarAcceso,SolicitarAcceso}View.vue` | 14 `documentTitle`/literales (§10.2 A) |
| `src/features/dashboard/views/DashboardView.vue` | Literal :124 |
| `src/features/config/{components/UvtEditor.vue,views/ConfigView.vue}` | Barrer `Geist`/`Instrument Serif` escritos a pelo |
| `public/brand/**` | **Nuevo.** Assets del §7.3 |
| `public/favicon.svg` | **Retirar** y sustituir por los PNG/ICO del kit |
| `public/site.webmanifest` | **Nuevo** (§7.4) |
| `public/icons.svg`, `src/assets/{hero.png,vite.svg,vue.svg}` | **Retirar.** Cero consumidores (verificado) |
| `docs/ds-audit.html` | Recolorear el CSS literal del harness (§11.2) |
| `docs/ux/brand-refresh-2026.md` | Marcar como *superseded* o fusionar (§1) |

**B.2 · `VetSoftwarePublicFront` (tenant)**

| Fichero | Cambio |
|---|---|
| `index.html` | `<title>` → `Lumbre`; `<link>` de fuentes; metadatos sociales; **arreglar el `favicon.svg` inexistente** |
| `src/assets/styles/public-auth.css` | Recolorear **25 de las 34** `--pub-*` **en sitio**, con ratios recalculados en los comentarios (§9) |
| `src/components/layout/SidebarBrand.vue` | Retirar la «V» en serif; texto «Lumbre»; isotipo 32×32 + `ds-sr-only` en el raíl ≤1024 px |
| `src/components/layout/AppSidebar.vue` | **Solo** `app-name="Lumbre"` (línea 129). **497/500 líneas: no añadir nada más aquí** |
| `src/components/public/PublicLayout.vue` | Sustituir `<v-icon>mdi-paw</v-icon>` por el isotipo; literales :45 y :57 |
| `src/features/landing/components/LandingTopbar.vue` | `aria-label` :23, literal :27, retirar `PawPrint`; verificar objetivo ≥24×24 |
| `src/features/landing/components/LandingFooter.vue` | Literal :19 |
| `src/features/landing/components/LandingHero.vue` | Lockup con `srcset`/`sizes`/`width`/`height` (§7.3); barrer `Geist`/`Instrument Serif` a pelo |
| `src/features/legal/components/{LegalDocumentBody,LegalDocumentPage}.vue` | Literales :47 y :41 |
| `src/features/registration/components/{RegisterForm,CheckEmailPanel}.vue` | Literal :254; barrer fuentes a pelo |
| `src/features/registration/views/VerifyEmailView.vue` | Barrer fuentes a pelo |
| `src/features/auth/views/{LoginView,RecuperarCodigoView}.vue` | Literales :24 y :130 |
| `src/features/asistente/components/AsistenteFueraDeDominio.vue` | Literales :64, :68 |
| `src/features/tienda/components/ReceiptModal.vue` | `brand.name` :79 |
| `src/composables/buildDocumentReceipt.ts` | Fallback :115 |
| `src/composables/useReceiptPrint.ts` | Fallback de inicial :183; línea de atribución en el pie (§7.5) |
| Consumidores de `var(--font-serif)` | Migrar a `var(--font-display)`. **Filtrar antes contra `tr02-parity.config.json`**: los que sean gemelos van a la Lista A, no aquí |
| `public/brand/**`, `public/site.webmanifest`, favicons | **Nuevos** |
| `docs/ux/` | — |

### 12.3 Fuera del alcance de los agentes de front

`VetSoftware/` (backend): 16 literales en 11 ficheros + la paleta de `recover-code.html` (§10.2 C).
**Tarea aparte.** Si el correo no se recolorea, será la única superficie que siga siendo amatista.

### 12.4 Orden de ejecución

1. `front-parity` — Lista A **salvo** `visual/fonts*` (los tokens primero: todo lo demás depende).
2. Los dos `front-feature` — Lista B, en paralelo (árboles disjuntos).
3. `front-parity` — `visual/fonts.css` y `visual/fonts/*.woff2`.
4. `npm run quality` en los dos repos (**no ejecutado aquí**).
5. `front-e2e-visual` — `npm run visual:docker:update` en los dos repos. **Lo último.**

---

## 13 · Issues propuestos — redactados, **no abiertos**

> No abro issues por mi cuenta. Estos son los cuerpos, listos para que el humano decida. Los números
> son por repo.

**1 · `VetSoftwarePublicFront` — el tenant sirve un 404 de favicon en cada carga**
`index.html:5` enlaza `/favicon.svg` y ese fichero no existe en `public/`. La consola sí lo tiene. Se
cierra con el rebrand (§7.3) pero **es un defecto vivo hoy**, no una consecuencia del cambio.

**2 · Ambos — `--info-border` tiene el hue literal en un token paramétrico**
`tokens.css:149`: `oklch(62% 0.15 300deg)` en vez de `var(--hue)`. Gemelo TR-02: está en los dos repos.
Invisible mientras `--hue` valga 300; al primer ajuste, el banner informativo se desalinea del sistema.

**3 · Ambos — ocho tokens `--v-*` sin un solo consumidor**
`tokens.css:86-93`. Cero referencias en `src/` de los dos repos. Duplican la fuente de verdad del tema
de Vuetify y son el origen de que `vuetify.ts:20` (`#7C3AED`) y `tokens.css:88` (`#4f46e5`) declaren
primarios distintos para las mismas pantallas.

**4 · Ambos — seis tokens semánticos caen fuera del gamut sRGB**
`--danger-50`, `--danger-100`, `--danger-400`, `--warning-50` y dos más. No dependen de `--hue`, así que
quedan fuera del rebrand. El propio fichero ya rechazó un valor por este motivo (`tokens.css:130-134`);
el criterio no se aplicó a estas escalas. **Efecto probable: escalones que el navegador recorta al mismo
color, es decir, alias de facto.** Requiere medición aparte.

**5 · Ambos — cero puertas de accesibilidad en el pipeline**
No hay `axe-core`, `@axe-core/playwright`, `eslint-plugin-vuejs-accessibility`, pa11y ni Lighthouse en
ninguno de los dos repos. La conformidad de contraste es paramétrica sobre `--hue` y **ningún gate la
mide**: este documento tuvo que escribir su propio verificador para saberlo. Mínimo propuesto: el script
de §5 como `npm run a11y:contrast`, más `toMatchAriaSnapshot` sobre las pantallas ya fotografiadas.

**6 · Kit — el «wordmark» es un recorte defectuoso**
`04_WORDMARK/*` incluye el calendario y el suelo del isotipo cortados por el borde superior. Y falta un
glifo vectorial simplificado para tamaños `< 48 px`, que ninguna pieza del kit cubre.

---

## 14 · Riesgos y lo que NO comprobé

### 14.1 Lo que NO ejecuté — declarado como no ejecutado

- **`npm run quality`, `npm run build`, Playwright, `ds:audit`.** No los corrí en ninguno de los dos
  repos. **No doy por pasado ningún gate.** Lo único que ejecuté es `node scripts/css-budget.mjs`
  (lectura pura, sin efectos) y mis propios scripts del scratchpad.
- **No abrí ningún navegador.** Todos los ratios salen de mi implementación de OKLCH → sRGB →
  luminancia, validada contra los números del propio `tokens.css` (§5.1, Δ máx 0,03) — **pero no contra
  un render real**. Chrome, Safari y Firefox aplican mapeo de gamut propio, y CSS Color 4 **no impone un
  método único**. Para los colores dentro de gamut esto no importa; para los cuatro semánticos que ya
  hoy caen fuera, mis hexes son los del recorte por canal y **el navegador puede pintar otra cosa**.
- **No verifiqué la documentación de tema de Vuetify 3.** `vuetifyjs.com` es una SPA y `WebFetch`
  devolvió solo el título. La forma que propongo es la que el repo ya usa y compila.
- **No inspeccioné las 52 líneas base visuales una a una.** Sé cuántas hay (25 + 27) y cómo se
  regeneran, no qué pantalla es cada una.
- **No medí el árbol de accesibilidad de ninguna pantalla.** Este documento es de marca y color; el
  hueco de accesibilidad automatizada queda en el issue n.º 5.
- **No conté las líneas exactas de `public-auth.css` que hay que recolorear.** Di el alcance por
  variable (21 de 30), no por regla.

### 14.2 Riesgos, ordenados por lo que cuesta descubrirlos tarde

1. **`AppSidebar.vue` del tenant, a 3 líneas del techo.** Es el fallo más probable de todo el rebrand y
   el más fácil de evitar: **el marcado del logo no entra ahí**. Si algún día hay que tocarlo, se paga
   extrayendo un componente, nunca subiendo `maxSfcLines`.
2. **`docs/ds-audit.html` no estaba en ninguna lista de reparto.** Su lado «a» es CSS de la paleta vieja
   escrito literal. Si no se recolorea con el mismo cambio, `ds-audit` medirá diferencias inexistentes y
   el trinquete de 320 saltará — y el mensaje señalará a las primitivas, no al harness.
3. **`reportDescriptionlessDisables: true` convierte un `stylelint-disable` sobrante en error.** El
   recoloreo reordena las colisiones que ve `no-duplicate-primitive`. Es un fallo que aparece al final,
   en `quality`, y que no se parece a un problema de color.
4. **Regenerar las líneas base antes de tocar `visual/fonts/`** congela capturas con la tipografía de
   respaldo. La suite fallará con «declaradas pero sin cargar», no con un diff de píxeles: el síntoma no
   señala a la causa.
5. **Los comentarios de contraste que quedarán mintiendo.** A11Y-01 cita 4,50 (pasa a 4,44), A11Y-09
   cita 3,55/3,77 (pasan a 3,47/3,69) y el guard-rail de los 180° cambia de referencia. Un comentario de
   ratio obsoleto es peor que ninguno: la próxima auditoría lo creerá.
6. **La ilustración del isotipo es raster y no hay glifo pequeño.** Si el tramo `< 48 px` acaba usando el
   PNG «porque no había otra cosa», el resultado es una mancha en el sitio más visible de la app.
7. **El correo es lo único que un usuario nuevo ve antes de entrar.** Si `recover-code.html` se queda con
   `#43215F` y `'Geist'`, el rebrand estará incompleto justo en la primera impresión.
8. **281° vs 277°.** Si se prefiere alinear con `brand-refresh-2026.md`, el cambio es bajar además
   `--amatista-50` a `0.014`. **Los dos hues cumplen; lo que no puede es haber dos documentos vigentes
   con hues distintos.**

---

## 15 · Fuentes

Consultadas y verificadas el 2026-09-03. Se declara cuál no respondió.

- WCAG 2.2 §1.4.3 Contrast (Minimum) — <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
  (4,5:1 texto normal; 3:1 ≥18 pt o ≥14 pt negrita; **excepción literal de logotipos**; «*computed values
  should not be rounded*»)
- WCAG 2.2 §1.4.5 Images of Text — <https://www.w3.org/WAI/WCAG22/Understanding/images-of-text.html>
  (la excepción cubre el **nombre de marca**, no un eslogan)
- WCAG 2.2 §1.4.11 Non-text Contrast — <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>
  (3:1 en componentes y objetos gráficos; los logotipos quedan exentos **solo** cuando la restricción la
  impone la identidad corporativa)
- WCAG 2.2 §2.5.8 Target Size (Minimum) — <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
  (24×24 px CSS y sus cinco excepciones)
- CSS Color Module Level 4 — <https://www.w3.org/TR/css-color-4/>
  (`<hue>` admite `<number>` y `<angle>`; **el mapeo de gamut no está normalizado a un único método**)
- MDN `<img>` — <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img>
  (`width`/`height` y CLS; `loading`; `decoding`; `srcset`/`sizes` con descriptores `w` y `x`)
- Vue 3 — Accesibilidad — <https://vuejs.org/guide/best-practices/accessibility.html>
  (skip link y devolución del foco tras cambio de ruta)
- **Vuetify 3 — Theme — <https://vuetifyjs.com/en/features/theme/> — NO CONSULTABLE.** SPA;
  `WebFetch` devolvió solo el título. La forma del tema se tomó del código que ya compila en el repo.
