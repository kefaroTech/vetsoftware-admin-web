# Verificación independiente del rebrand Lumbre — marca y contraste

Auditoría de solo lectura sobre los worktrees `MainVetSoftware-uxaudit/admin-web`
(`audit/ux-screens-admin`, HEAD `f9ec359`) y `MainVetSoftware-uxaudit/public-web`
(`audit/ux-screens-public`, HEAD `32e88ef`). No se tocó `src/` en ningún repo.

**Qué verifica este documento.** No recalcula el rebrand: contrasta lo que aterrizó en `develop`
(PR admin#234 / public#317) contra lo que `docs/ux/lumbre-rebrand.md` §4–§10 especificó, contra el
kit `veterinary-brand-kit/`, y contra WCAG 2.2 AA. Todo número de aquí está **medido**, con la misma
metodología que el propio repositorio usa en `tests/unit/tokens-contrast.spec.ts` (OKLCH → sRGB con
las matrices de CSS Color 4, recorte a gamut, **cuantización a 8 bits** y luminancia relativa de
WCAG 2.x). El motor se validó reproduciendo siete ratios documentados en `tokens.css` con desviación
**0,00** en los siete.

---

## 0 · Veredicto

**El producto SÍ es la marca Lumbre, y la parte tokenizada del sistema CUMPLE.** Las dos preguntas
del encargo se responden distinto:

| Pregunta | Veredicto |
|---|---|
| ¿`tokens.css` reproduce lo que §4 especificó? | **Sí, exactamente.** 26 de 26 tokens con el hex especificado. Cero desviaciones. |
| ¿Los gemelos TR-02 siguen siendo gemelos? | **Sí.** `tokens.css`, `primitives.css`, `base.css`, `visual/fonts.css` y `reglas-de-interfaz.md` son byte a byte idénticos entre repos (`diff` limpio). |
| ¿Los activos de marca son los del kit? | **Sí.** Los 26 ficheros de `public/brand/` de los dos repos coinciden por SHA-256 con su máster del kit. Cero obsoletos. |
| ¿§5.3 sigue describiendo lo entregado? | **Casi.** 20 de 22 filas exactas; **2 quedaron obsoletas** por cambios que se colaron en el mismo commit y que §4 no especifica. |
| ¿La paleta CUMPLE contraste? | **La tokenizada sí. La de la zona pública del tenant, no.** Dos incumplimientos AA vivos, ambos fuera del alcance que §4 cubrió. |

**Los dos incumplimientos vivos comparten causa**: están en superficies que la especificación
declaró explícitamente fuera del alcance del rebrand (`public-auth.css` por el §9, y los `Base*`
del tenant que nunca adoptaron `--text-placeholder`). El rebrand hizo bien lo que dijo que iba a
hacer; el defecto está en el perímetro que dejó fuera.

---

## 1 · El kit de marca contra los tokens reales

### 1.1 Desviación marca → token, medida

Los nueve colores del kit (`07_DESIGN_TOKENS/brand.json`) contra el token que desempeña su papel en
el DS. ΔE2000 sobre Lab D65; Δ por canal en enteros de 8 bits; ΔL/ΔC/ΔH en OKLCH.

| Rol del kit | Hex kit | Token que lo implementa | Hex real | ΔR ΔG ΔB | ΔL / ΔC / ΔH | **ΔE2000** |
|---|---|---|---|---|---|---:|
| `background` | `#F5F3FF` | `--brand-canvas` (`tokens.css:165`) | `#f5f3ff` | 0 0 0 | 0,0 % / 0,000 / 0,0° | **0,00** |
| `border` | `#E2E8F0` | `--warm-200` → `--border` | `#dfe5ed` | −3 −3 −3 | −0,9 % / 0,000 / 0,0° | **0,65** |
| `surface` | `#FFFFFF` | `--warm-50` → `--surface` | `#fafcff` | −5 −3 0 | −1,0 % / +0,005 / — | **1,73** |
| `text_secondary` | `#475569` | `--warm-600` → `--text-muted` | `#51565c` | +10 +1 −13 | +0,5 % / −0,026 / −4,4° | **6,60** |
| `violet` | `#6D28D9` | `--amatista-600` | `#564dc5` | −23 +37 −20 | +0,8 % / −0,061 / −11,6° | **8,67** |
| `indigo` | `#4F46E5` | `--amatista-500` | `#6b66e0` | +28 +32 −5 | +6,8 % / −0,050 / +4,0° | **9,57** |
| `navy` | `#0F172A` | `--warm-900` → `--text` | `#0a0e12` | −5 −9 −24 | −4,6 % / −0,029 / −17,2° | **9,71** |
| `coral` | `#F43F5E` | `--danger-500` | `#c53637` | −47 −9 −39 | −9,5 % / −0,035 / +8,6° | **12,55** |
| `teal` | `#14B8A6` | **ninguno** | — | — | — | **sin token** |

**Cómo se lee esto, y por qué la mitad de la tabla no es un defecto.** El umbral de perceptibilidad
está en ΔE ≈ 2,3. Los tres primeros están por debajo o al borde: `--brand-canvas` es el hex exacto,
`--border` reproduce el `#E2E8F0` del kit (lo que el comentario de `tokens.css:46-50` afirma, y es
cierto), y `--warm-50` es indistinguible del blanco. Las cuatro desviaciones grandes son
**deliberadas y trazables**:

- **`navy`, `text_secondary`, `coral`** se apartan porque el DS los eligió por contraste medido, no
  por fidelidad. `--warm-900` da 18,84:1 donde el navy del kit daría menos; `--danger-500` es el
  color del anillo de peligro y tiene que llegar a 3:1 contra la superficie. §5.4 de la
  especificación ya sentó el principio: cuando la marca y el criterio chocan, manda el criterio.
- **`indigo` / `violet`** se apartan por **croma**, no por claridad: el kit trae 0,230 y 0,241, y la
  rampa está a 0,18. La razón está en §4.1: tres escalones tuvieron que bajar de croma para no
  salirse de sRGB. Es una pérdida de saturación real frente al kit, decidida y documentada.
- **`teal` no tiene token y no debe tenerlo**: `lumbre-rebrand.md` §3.4 («Segundo eje de acento:
  **no**») lo resolvió explícitamente. **No es un hueco: es una decisión.** El token más cercano
  está a ΔE 19,4, es decir, el DS no lo aproxima ni por accidente.

> Búsqueda ciega de vecino más próximo, por si el mapeo semántico anterior fuera el equivocado:
> para `indigo` el token más cercano no es `--amatista-500` (ΔE 9,6) sino **`--amatista-600`
> (ΔE 4,4)**. Es decir: **el `#4F46E5` del kit vive, en la rampa entregada, un escalón más abajo de
> donde su nombre sugiere.** No es un defecto —la rampa es paramétrica y su escalón 600 es el
> primario sólido—, pero conviene saberlo antes de que alguien «corrija» el 500 para acercarlo al kit
> y con ello tumbe el anillo de foco, que es justo el token que lo consume.

### 1.2 §4 de la especificación contra el `tokens.css` real

**26 tokens comprobados, 0 desviaciones.** Cada token de §4.1, §4.2 y §4.3 tiene en el árbol
exactamente la declaración especificada y produce exactamente el hex publicado:

`--hue: 281` · `--hue-neutral: 256` · `--amatista-{50,100,200,300,400,450,500,600,700,800,900}` ·
`--warm-{50,100,150,200,300,400,450,500,600,700,800,900}` · `--text-placeholder` ·
`--info-border` (ya paramétrico sobre `var(--hue)`, defecto n.º 1 cerrado) ·
`--brand-canvas: #f5f3ff` con su comentario de POR QUÉ íntegro.

**§4.4 (retiradas): cumplido.** Los ocho `--v-*`, `--font-serif` y `--danger-400` no están en
`tokens.css` ni tienen un solo consumidor en `src/` de ninguno de los dos repos. Única mención
superviviente: `primitives.css:1112`, dentro de un comentario que documenta el color retirado — es
correcto que se quede.

**§4.5 (tipografía): cumplido.** `--font-sans: 'Inter', …`, `--font-display: 'Poppins', 'Inter',
system-ui, sans-serif`, `--font-mono` intacto. Cero ocurrencias de `Geist` o `Instrument Serif` en
`src/`, `index.html` o `visual/` de ninguno de los dos repos.

**§6 (invariante de rampa): cumplido y verificado, no supuesto.** Recalculé la luminancia relativa
(Y×100) de las tres familias sobre el árbol entregado. `--amatista-*` y `--warm-*` son **estrictamente
monótonas decrecientes** y reproducen los valores de §6 al céntimo. `--danger-*` es monótona **no
estricta**: ver el hallazgo n.º 7.

### 1.3 Tipografía: lo declarado y lo cargado

| | Declara | Carga de verdad | Se usa |
|---|---|---|---|
| `--font-sans` | `'Inter', …` | `index.html:40-43` (admin) y `:48-51` (tenant), Google Fonts, pesos 400/500/600/700, `display=swap`, con `preconnect` a los dos orígenes | 8 usos admin · 38 tenant |
| `--font-display` | `'Poppins', 'Inter', …` | ídem, mismos cuatro pesos | 11 usos admin · 53 tenant |
| `--font-mono` | `'JetBrains Mono', …` | ídem, pesos 400/500 | — |
| Galería visual | — | `visual/fonts.css` autoaloja las tres familias en WOFF2 subset `latin`, gemelo TR-02, con una `@font-face` por peso | — |

**Coincide con la recomendación del kit** (Poppins display, Inter UI) y **las tres familias que se
cargan se usan las tres**. No hay familia cargada y huérfana ni familia usada que caiga al respaldo.
El único apunte es de rendimiento, no de marca: se piden **12 ficheros de fuente** en la ruta crítica
(4 Poppins + 4 Inter + 2 JetBrains Mono, más los dos viajes de `preconnect`), y `JetBrains Mono` solo
hace falta en recibos e identificadores de traza. No lo cuento como hallazgo porque nadie me pidió
auditar rendimiento y no lo he medido.

### 1.4 Logotipo, favicon y metadatos — SHA-256

**Los 26 ficheros de `public/brand/` de los dos repos coinciden byte a byte con su máster del kit.**
Verificado con `sha256sum` contra `veterinary-brand-kit/`; ningún activo obsoleto, ninguna versión
duplicada divergente. Muestra:

| Activo | SHA-256 (12 primeros) | Origen en el kit |
|---|---|---|
| `favicon.ico` | `e8b7e42b5155` | `05_ICONS_FAVICON/favicon.ico` |
| `favicon-32x32.png` | `8ac5f0f83b42` | `05_ICONS_FAVICON/` |
| `apple-touch-icon.png` | `263df0fc21f6` | `05_ICONS_FAVICON/` |
| `android-chrome-512x512.png` | `44a890cf14a0` | `05_ICONS_FAVICON/` |
| `maskable-icon-512x512.png` | `d32fbaacfdcc` | `05_ICONS_FAVICON/` |
| `open-graph-1200x630.png` | `e1df1e0fd3e6` | `06_SOCIAL/` |
| `lumbre-lockup-transparent-480.png` | `eac686a13f7f` | `03_LOCKUP/png/` |
| `lumbre-logo-only-transparent-64.png` | `8fbf1552e1bd` | `02_LOGO_ONLY/png/` |

Las cuatro huellas de máster que publica `09_BRAND_GUIDE/README.md` (`bc6cf390…`, `70c01651…`,
`5ee371ba…`, `c474c5b6…`) coinciden con los ficheros de `01_MASTERS/`: **el kit no ha derivado**.

**§7.3 (tabla de superficies): implementada tal cual.** Verificado en el marcado real del tenant —
`SidebarBrand.vue:22-31` (raíl, isotipo 32×32 con `width`/`height`/`alt=""`/`decoding`/`loading` y
`<span class="ds-sr-only">`), `LoginView.vue:22-39` y `RegisterForm.vue`/`CambiarContrasenaView.vue`
(lockup con `<picture>`, `srcset` 480/768/1024, `alt="Lumbre — Gestiona lo que cuidas"`),
`LandingHero.vue:32-50` (`width="320" height="320"`, `fetchpriority="high"`). `LandingTopbar.vue:20-22`
tomó la **opción (b)** que §7.3 recomendaba: solo texto, con `aria-label="Lumbre, inicio"` ya
actualizado. **El `mdi-paw` del §7.7 no existe: cero ocurrencias de `mdi-` en el tenant.**

**§7.4 (`site.webmanifest`): cumplido**, incluido el `name` distinto por front («Lumbre — Plataforma»
en la consola, «Lumbre» en el tenant), `theme_color: #0F172A` y `background_color: #F5F3FF`.
`<html lang="es">` correcto en los dos `index.html`, y `<meta name="theme-color" content="#0F172A">`
también. La ausencia de `og:image` en la consola es deliberada y está justificada en su propio
comentario (`index.html:19-23`).

### 1.5 §10.2 «literales a sustituir» — lista cerrada, cerrada de verdad

**Cero literales de marca vieja en texto visible.** Barrido de `Vetrina` y `VetSoftware` sobre
`src/**/*.{vue,ts}` de los dos repos:

- **admin-web**: 0 `Vetrina`, 2 `VetSoftware` — ambas en comentarios que citan rutas del backend
  (`usePlatformSetup.ts:40`) o del repo gemelo (`format.ts:26`). Correctas.
- **public-web**: 1 `Vetrina` — `useReceiptPrint.ts:7`, el comentario que referencia el handoff
  «Recibo Vetrina». **§10.2 lo dejó explícitamente a decisión** («cambiarlo rompe la trazabilidad con
  el handoff original»). 1 `VetSoftware` — comentario que cita el gemelo (`AppLayout.vue:19`).

Los 28 literales de interfaz de las listas A y B están todos sustituidos. **Este era el defecto de
acabado que nadie había comprobado tras el merge: no lo hay.**

### 1.6 Censo de color literal en CSS efectivo

Comentarios y `<script>` despojados; solo `<style>` de los SFC, `style="…"` del marcado y los `.css`;
`tokens.css` excluido. Clasificado por ΔE2000 contra el color de marca más próximo.

| | admin-web | public-web |
|---|---:|---:|
| Ocurrencias de color literal | **39** | **153** |
| Colores distintos | 10 | 70 |
| Indistinguible de un color de marca (ΔE ≤ 2) | 22 (`#ffffff`) | 47 |
| Deriva visible de un color de marca (2 < ΔE ≤ 8) | 8 | 54 |
| Inventado (ΔE > 8) | **9** | **52** |
| Fichero que más concentra | `DashboardView.vue` (13) | **`public-auth.css` (52)** |

**La consola está limpia**: 39 literales, de los que 22 son `#fff` (legítimo: texto sobre botón
sólido, que `primitives.css` declara así a propósito) y el resto son hexes que **coinciden con el hex
que el token ya produce** (`#564dc5` = `--amatista-600`, `#7777e3` = `--amatista-450`, `#4339a0` =
`--amatista-700`, `#aaaffe` = `--amatista-300`, `#8989f8` = `--amatista-400`). Son copias manuscritas
de un valor tokenizado — defecto de forma (R11), no de color.

**El tenant concentra el problema en un solo fichero**, `public-auth.css`, y ese fichero es una
**excepción deliberada**: §9 de la especificación dictaminó «se recolorean los valores en sitio, NO se
reescriben apuntando a los tokens del DS», con tres motivos escritos. **§14.1 declaró que no contó sus
líneas.** Las cuento aquí: **52 ocurrencias literales, y el recoloreo se ejecutó correctamente** —
`--pub-ame-500` está en OKLCH `281,0°` y `--pub-ame-700` en `281,1°`; `--pub-ink-500` en `256,5°` y
`--pub-ink-400` en `256,0°`. Dieron en el clavo del hue objetivo.

Y la **«condición innegociable»** del §9 —cada hex nuevo acompañado de su ratio recalculado— **se
cumplió al céntimo**. Verifiqué los seis ratios que los comentarios de `public-auth.css` afirman:

| Comentario afirma | Medido | |
|---|---:|---|
| `--pub-ink-400` sobre blanco: 3,94:1 | **3,94** | ✅ |
| `--pub-ink-500` sobre blanco: 5,96:1 | **5,96** | ✅ |
| `--pub-ink-500` sobre `--pub-tint-mute`: 5,53:1 | **5,53** | ✅ |
| `--pub-ok-tx` sobre `--pub-ok-bg`: 4,76:1 | **4,76** | ✅ |
| `#16a34a` (retirado) sobre `--pub-ok-bg`: 3,12:1 | **3,12** | ✅ |
| `#dc2626` (retirado) sobre `--pub-err-bg`: 4,41:1 | **4,41** | ✅ |

Seis de seis exactos. **Ningún comentario de contraste de ese fichero miente.** Lo que sí falta es lo
que ningún comentario cubre: ver el hallazgo n.º 1.

---

## 2 · Contraste — la tabla con verdictos

### 2.1 Qué cubre ya el repo, y qué no (leído antes de medir)

Hay **dos** ficheros de guarda, uno por repo, y **no son gemelos**:

| | `admin-web/tests/unit/tokens-contrast.spec.ts` (436 líneas) | `public-web/tests/unit/tokens-contrast.spec.ts` (212 l.) + `tests/helpers/wcag-contrast.ts` |
|---|---|---|
| Anillos `--ring` / `--ring-danger` ≥ 3:1 contra `--warm-50` **y** blanco | ✅ | ✅ |
| Anillo de dos capas, la interior es `--warm-50` | ✅ | ✅ (comprueba ≥ 2 capas) |
| Regresión al color anterior (`--amatista-50` / `--danger-200`) | ✅ | ✅ |
| `--warm-500` / `--text-subtle` ≥ 4,5:1 | ✅ | ✅ |
| `.ds-hint`, `.ds-meta`, `.ds-icon-muted` medidas por su `color` declarado | ✅ | ❌ |
| `.ds-field-invalid-focus` hereda `--ring-danger` | ✅ | ✅ |
| Autoverificación de la fórmula (21:1 negro/blanco, reprobar el valor viejo) | ✅ | ✅ (parcial) |

**Lo que NINGUNO de los dos cubre, y por tanto es aportación nueva de esta auditoría:** los bordes de
banner (`--danger-border`, `--warning-border`, `--success-border`, `--info-border`), el borde de
control `--warm-450`, `--text-placeholder`, los gradientes de botón, `--amatista-450`, el invariante
de rampa, **todo `public-auth.css`**, y **todos los pares en los que el color no llega por un token**
(que es exactamente donde están los dos incumplimientos vivos). No dupliqué nada de lo ya cubierto:
lo reproduje una vez para validar el motor y seguí adelante.

### 2.2 §1.4.3 Contraste mínimo (AA) — texto

4,5:1 texto normal · 3:1 texto grande (≥ 24 px, o ≥ 18,66 px en negrita). Fondos: `--warm-50` es el
lienzo, blanco puro el interior de `.ds-card`, `--warm-100` el de `.ds-panel`/`.ds-card--flat`,
`--warm-150` el de `.ds-table th` y `.ds-field-readonly`.

| Token / uso real | `--warm-50` | blanco | `--warm-100` | `--warm-150` | Verdicto |
|---|---:|---:|---:|---:|---|
| `--text` = `--warm-900` (`primitives.css` passim) | 18,84 | 19,36 | 17,73 | 16,75 | **PASA** |
| `--text-muted` = `--warm-600` (`.ds-btn--plain`) | 7,21 | 7,41 | 6,78 | 6,41 | **PASA** |
| `--text-subtle` = `--warm-500` (`.ds-hint`, `.ds-meta`) | 5,38 | 5,53 | 5,07 | 4,78 | **PASA** |
| `--warm-700` (`.ds-btn--ghost`, `.ds-btn--neutral`) | 10,99 | — | 10,35 | 9,77 | **PASA** |
| `--text-placeholder` (`AppInput.vue:213`, admin) | 4,93 | 5,06 | 4,64 | **4,38** | **PASA salvo en `--warm-150`** → n.º 11 |
| `--amatista-700` (enlace/acento, `PawLoader`) | 8,76 | 9,01 | 8,25 | — | **PASA** |
| `--amatista-600` | 6,26 | 6,43 | — | — | **PASA** |
| `--amatista-500` | 4,44 | 4,56 | — | — | **PASA como icono (§1.4.11)**, no usar como texto |
| `--danger-fg` = `--danger-900` sobre `--danger-100` | 8,59 | — | — | — | **PASA** |
| `--danger-700` sobre `--danger-50` / `--danger-200` (`.ds-btn--danger`) | 6,20 / 5,60 | — | — | — | **PASA** |
| `--warning-fg` = `--warning-900` sobre `--warning-50` | 8,02 | — | — | — | **PASA** |
| `--success-fg` sobre `--success-bg` | 7,52 | — | — | — | **PASA** |
| `--amatista-800` sobre `--amatista-50` (`.ds-banner--info`) | 12,09 | — | — | — | **PASA** |
| `--compras-ok-fg` sobre `--compras-ok-bg` | 7,12 | — | — | — | **PASA** |
| `--amount-pos` / `--amount-neg` | 4,90 / 5,30 | 5,04 / 5,45 | 4,61 / 4,99 | — | **PASA** |
| **`--warm-400`** (`BaseSelect.vue:369`, `SearchableSelect.vue:358` — marcador) | **2,41** | **2,48** | — | **2,15** | **FALLA** → n.º 2 |

**Texto blanco sobre relleno sólido:**

| Superficie | Ratio con `#fff` | Verdicto |
|---|---:|---|
| `--gradient-primary`, parada clara `oklch(45% 0.18 281)` = `#4a3eb4` | **7,96** | PASA |
| `--gradient-primary`, parada oscura `oklch(38% 0.18 276)` = `#302a9f` | **10,73** | PASA |
| `--gradient-danger`, parada clara `oklch(52% 0.18 25deg)` = `#ba2b2e` | **6,05** | PASA |
| `.ds-btn--solid` por defecto = `--amatista-700` | **9,01** | PASA |
| `.ds-btn--solid` en `caja`/`compras` = `--amatista-600` | **6,43** | PASA |

Los dos gradientes se midieron **en sus dos paradas**, que es lo que importa: el peor caso es el
extremo claro, y aun así sobra margen. §5.3 solo publicaba el gradiente primario; el de peligro es
nuevo aquí y también pasa.

### 2.3 §1.4.11 Contraste no textual (AA) — 3:1 contra los colores adyacentes

> Norma verificada con `WebFetch` sobre
> <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>: *«The visual presentation of
> the following have a contrast ratio of at least 3:1 against adjacent color(s): User Interface
> Components [and] Graphical Objects»*. Exime explícitamente **componentes inactivos**, **decoración
> pura**, y los **límites visuales cuando otro indicador visual identifica el control**. No se redondea:
> 2,999:1 falla.

| Elemento | Token | Sobre | Ratio | Verdicto |
|---|---|---|---:|---|
| Borde de control en reposo (`.ds-field-rest`, `.ds-btn--ghost`) | `--warm-450` | `--warm-50` / blanco / `--warm-100` / `--warm-150` | 3,54 / 3,63 / 3,33 / **3,14** | **PASA** en las cuatro |
| Borde de banner de error | `--danger-border` | `--danger-100` / `--warm-50` | **3,68** / 4,16 | **PASA** |
| Borde de banner de aviso | `--warning-border` | `--warning-50` / `--warm-50` | **3,45** / 3,89 | **PASA** |
| Borde de banner de éxito | `--success-border` | `--success-50` / `--warm-50` | 3,46 / 3,94 | **PASA** |
| Borde de banner informativo | `--info-border` | `--amatista-50` / `--warm-50` | 3,47 / 3,70 | **PASA** |
| Borde de selección de acento | `--amatista-450` | `--amatista-50` / `--warm-50` / blanco | 3,47 / 3,69 / 3,80 | **PASA** |
| Borde de campo enfocado (`base.css:81`) | `--amatista-500` | `--warm-50` / blanco | 4,44 / 4,56 | **PASA** |
| Icono con significado (`.ds-icon-muted`) | `--warm-500` | `--warm-50` … `--warm-150` | 5,38 … 4,78 | **PASA** |
| Punto de estado | `--success-dot` | `--success-bg` / `--warm-50` | 3,88 / 4,44 | **PASA** |
| Separador / borde de `.ds-card`, `.ds-panel`, `.ds-frame` | `--border` = `--warm-200` | `--warm-50` / blanco | 1,23 / 1,27 | **EXENTO** (decorativo: no delimita ningún control; la superficie ya lo identifica) |
| Barra de desplazamiento y estado deshabilitado | `--warm-400` | `--warm-50` | 2,41 | **EXENTO** (componente inactivo / render del UA) |
| **Borde de `AuthInput` y `AuthSelect`** (`AuthInput.vue:97`, `AuthSelect.vue:79`) | `--pub-line` `#dfe9f7` | blanco | **1,23** | **FALLA** → n.º 1 |
| `--pub-line-2` `#e5eefa` / `--pub-line-strong` `#d6e3f4` | | blanco | **1,17** / **1,30** | **FALLA** si delimitan control |

### 2.4 El anillo de foco contra sus DOS vecinos

`--ring: 0 0 0 2px var(--warm-50), 0 0 0 4px var(--amatista-500)`. Es un anillo de **dos capas**, y
eso cambia el análisis de adyacencia: la capa que toca el control es la interior (`--warm-50`); la que
toca la página es la exterior (`--amatista-500`). Hay que medir **cada capa contra su propio vecino**,
no la exterior contra el relleno del botón.

| Anillo | Capa | Vecino real | Ratio | Verdicto |
|---|---|---|---:|---|
| `--ring` | exterior `--amatista-500` | superficie `--warm-50` | **4,44** | PASA (umbral 3) |
| `--ring` | exterior `--amatista-500` | blanco (`.ds-card`) | **4,56** | PASA |
| `--ring` | exterior `--amatista-500` | `--warm-100` (`.ds-panel`) | **4,18** | PASA |
| `--ring` | interior `--warm-50` | relleno `.ds-btn--solid` = `--amatista-700` | **9,01** | PASA |
| `--ring` | interior `--warm-50` | relleno `.ds-btn--primary`, parada clara | **7,96** | PASA |
| `--ring-danger` | exterior `--danger-500` | `--warm-50` / blanco / `--warm-100` | **5,16** / 5,31 / 4,86 | PASA |
| `--ring-danger` | interior `--warm-50` | relleno `.ds-btn--danger-solid`, parada clara | **6,05** | PASA |

**El diseño de dos capas es correcto y hay que preservarlo tal cual.** Si alguien «simplifica» el
anillo a una sola capa de color, el anillo de un botón sólido pasa a medirse contra su propio relleno
—1,97:1 en `.ds-btn--solid`, 1,41:1 en `.ds-tone--accent-solid`— y **deja de cumplir**. Esos son los
números que justifican la capa interior; hoy no aplican porque la capa interior existe. La guarda
`tokens-contrast.spec.ts` ya vigila que sean dos capas y que la primera sea `--warm-50`: **está bien
puesta y no hay que tocarla**.

### 2.5 Aspecto del foco (§2.4.11 vs §2.4.13) — precisión normativa

El encargo pedía «§2.4.11 Focus Appearance». **En WCAG 2.2, §2.4.11 es *Focus Not Obscured (Minimum)*,
nivel AA**, y trata de que el elemento enfocado no quede tapado por contenido superpuesto. **El
criterio que fija área y contraste del indicador es §2.4.13 *Focus Appearance*, y es AAA.** Los dos
ficheros de guarda del repo lo dicen bien (`admin-web/tests/unit/tokens-contrast.spec.ts:10-15`); esta
auditoría lo confirma y no lo exige como AA.

Medido de todos modos, contra §2.4.13: el anillo aparece **fuera** del control, así que el píxel que
cambia pasa de superficie a color de anillo. `--ring` da **4,44:1** sobre `--warm-50` y **4,56:1**
sobre blanco; `--ring-danger`, **5,16:1** y **5,31:1**. Los cuatro superan el 3:1. El área también
cumple: un contorno macizo de 2 px de grosor alrededor del perímetro supera con holgura el mínimo
equivalente a 2 px CSS. **Conforme incluso al criterio AAA, en contraste y en área.**

---

## 3 · Hallazgos

Ordenados por severidad. **Ninguno es bloqueante**: no hay incumplimiento de nivel A ni pérdida de
trabajo del usuario. Los dos primeros son incumplimientos AA vivos.

---

> ### 1 · **[grave]** El borde de todo campo de la zona pública del tenant mide 1,23:1
> **Dónde:** `public-web/src/components/public/AuthInput.vue:97` y
> `public-web/src/components/public/AuthSelect.vue:79` —
> `border: 1px solid var(--pub-line)`, definido en
> `public-web/src/assets/styles/public-auth.css:26` como `#dfe9f7`.
>
> **Criterio:** WCAG 2.2 §1.4.11 *Non-text Contrast* (AA), 3:1. El borde **es el único indicador
> visual que delimita el control**: la caja va sobre la tarjeta blanca `.pub-card` y no hay relleno,
> sombra ni subrayado que la identifique. La exención de «límites visuales cuando otro indicador
> identifica el control» **no aplica**. Y `reglas-de-interfaz.md` **R10.1** («todo color se mide
> contra las dos superficies reales antes de entrar»).
>
> **Medido:** `#dfe9f7` sobre blanco = **1,23:1**. Falla por un factor de 2,4. Los otros dos bordes
> de la familia: `--pub-line-2` `#e5eefa` = **1,17:1**, `--pub-line-strong` `#d6e3f4` = **1,30:1**.
>
> **Impacto:** las **16 pantallas públicas del tenant** — login, registro, recuperar código,
> recuperar/restablecer contraseña, verificar correo, aceptar invitación, landing, legales. Es la
> **primera pantalla que ve todo usuario nuevo** y la que se usa con luz ambiente mala o pantalla
> barata. Un auxiliar que no distingue dónde empieza el campo escribe fuera de él.
>
> **Por qué se coló, y por qué no es culpa del rebrand:** es **exactamente** el defecto que A11Y-09
> corrigió en el DS (`--warm-200`, 1,23:1 → `--warm-450`, 3,54:1) y que `lumbre-rebrand.md` §5.4
> enuncia como principio: «*`border: #E2E8F0` mide 1,23:1 sobre blanco y **no vale como borde de
> control***». Pero §9 blindó `public-auth.css` frente al DS —con tres motivos correctos— y en su
> tabla de alcance clasificó `--pub-line` como «*acompaña a los neutros*»: se le **giró el tono** a
> 256° y **no se le tocó la claridad**. El 1,23:1 viajó intacto de la marca vieja a la nueva. Ningún
> comentario de ese fichero lo cubre, y las dos `tokens-contrast.spec.ts` solo miran `tokens.css`.
>
> **Arreglo — un remedio, en un solo sitio (R10.2).** No tocar `AuthInput`/`AuthSelect`: corregir la
> variable, que es lo que está más arriba en la cadena. En `public-auth.css:26`, conservando el
> croma 0,062 y el tono 256° con los que ya se recoloreó la familia `--pub-ink-*`:
>
> ```css
> /* WCAG 2.2 §1.4.11 (AA): es el contorno de `AuthInput`/`AuthSelect`, único
>    indicador del control. #dfe9f7 medía 1,23:1 sobre la tarjeta blanca.
>    oklch(66% 0.062 256) da 3,12:1 — mismo criterio con el que `--warm-450`
>    sustituyó a `--warm-200` en el DS. Solo cambia donde delimita un control:
>    `--pub-line-2` y `--pub-line-strong` siguen siendo separadores. */
> --pub-line: #7994b8;
> ```
>
> Escalones medidos, por si se prefiere más margen: `#7994b8` (L 66 %) = **3,12:1** · `#748eb2`
> (L 64 %) = **3,36:1** · `#6e88ac` (L 62 %) = **3,63:1**, el equivalente exacto de `--warm-450`.
> **Recomiendo `#6e88ac`**: iguala el margen del borde de control del DS (3,63:1 sobre blanco) en vez
> de raspar el umbral, y es el mismo criterio de margen que A11Y-09 aplicó.
>
> ⚠️ **`--pub-line` se usa también como borde de superficie** (`public-auth.css:190` `.pub-card`,
> `:405`, `:514`, `:555` `.pub-doc-toc`, `:638` `.pub-doc-foot`), donde §1.4.11 **sí** exime por
> decorativo y oscurecerlo cambiaría 6 líneas base visuales. **Por eso el cambio correcto no es
> oscurecer `--pub-line`, sino introducir `--pub-line-control` con el valor de arriba y apuntar a él
> solo desde `AuthInput.vue:97` y `AuthSelect.vue:79`.** Es una variable nueva y dos referencias, y
> deja intactas las seis superficies. Adopto esta variante como la recomendación final.
>
> **Verificación posterior:** añadir a `public-web/tests/unit/tokens-contrast.spec.ts` un caso que
> lea `--pub-line-control` de `public-auth.css` y exija ≥ 3:1 contra `--pub-surface` y contra blanco.
> El helper `tests/helpers/wcag-contrast.ts` ya tiene `readCustomProperties()`, que parsea cualquier
> hoja, y `contrastRatio()`; no hace falta código nuevo de color, solo el caso.

---

> ### 2 · **[grave]** El texto marcador del tenant mide 2,41:1, y el token que lo arregla tiene cero consumidores allí
> **Dónde:** `public-web/src/components/ui/BaseSelect.vue:369` y
> `public-web/src/components/ui/SearchableSelect.vue:358` — `.value.placeholder { color: var(--warm-400) }`.
> Además `public-web/src/components/ui/BaseSelect.vue:445` (`.panel[role='listbox'] .empty`, el texto
> «sin resultados»), `public-web/src/features/historia-clinica/components/OwnerSearchList.vue:128` y
> `public-web/src/features/roles/components/EditRoleHeader.vue:164`.
>
> **Criterio:** WCAG 2.2 §1.4.3 *Contrast (Minimum)* (AA), 4,5:1 — el marcador mide 12–13 px, no entra
> en la excepción de texto grande. Y `reglas-de-interfaz.md` **R10** («el remedio se aplica en un solo
> sitio, el que esté más arriba en la cadena, porque cubre a todos los consumidores presentes y
> futuros»).
>
> **Medido:** `--warm-400` = `#9fa5ae`. **2,41:1** sobre `--warm-50`, **2,48:1** sobre blanco,
> **2,15:1** sobre `--warm-150`. Falla las tres.
>
> **La prueba de que es un remedio a medio aplicar, y es literal.** `tokens.css:177-183` declara
> `--text-placeholder` y su comentario dice, textualmente:
>
> > *«A11Y-10 · WCAG 2.2 §1.4.3 (AA). El marcador de posición de `BaseSelect`, `SearchableSelect` y
> > `BaseInput` usaba `--warm-400`: 2,41:1.»*
>
> `BaseSelect`, `SearchableSelect` y `BaseInput` son componentes **del tenant** (prefijo `Base*`). El
> token vive en `tokens.css`, que es **gemelo TR-02 byte a byte**, así que existe en los dos repos.
> Pero sus consumidores reales son **cinco, y los cinco están en la consola**: `AppInput.vue:213`,
> `AppListSearch.vue:196`, `AppSelect.vue:351`, `AppTextarea.vue:170`, `LoginView.vue:193`.
> **`--text-placeholder` tiene cero consumidores en `public-web`.** El arreglo se aplicó en el repo
> donde los componentes que el comentario nombra ni siquiera existen, y no en el repo donde sí están.
> Es un token gemelo con un consumidor huérfano: el tipo de divergencia que ningún gate mira.
>
> **Impacto y alcance.** `BaseSelect` y `SearchableSelect` son **primitivas**: el defecto no está en
> dos pantallas, está en toda pantalla del tenant con un desplegable sin elegir — agenda, consulta,
> hospitalización, tienda, cuentas, compras, laboratorio. Un auxiliar con prisa no ve qué campo le
> falta por rellenar porque el rótulo del hueco es casi invisible.
>
> **Matiz importante, medido:** el resto de marcadores del tenant **sí cumplen**, y lo hacen con otro
> token — `--warm-500` (**5,38:1**): `BaseInput.vue:181`, `BaseTextarea.vue:135`, `DateInput.vue:246`,
> `OwnerSearchInput.vue:90`, `EmpleadosTable.vue:119`, `PermissionToolbar.vue:74`. Es decir, el tenant
> ya tiene **tres colores distintos** para el mismo rol semántico: `--warm-500` (cumple, 5,38),
> `--warm-400` (falla, 2,41) y el `--text-placeholder` que no usa (4,93).
>
> **Arreglo.** Sustituir `var(--warm-400)` por `var(--text-placeholder)` en las cinco líneas citadas.
> **No** cambiar los seis que ya usan `--warm-500`: subirlos también sería aplicar dos remedios al
> mismo defecto, que es justo lo que R10.2 prohíbe. Con esto el tenant queda con dos valores
> (`--text-placeholder` en marcador de selector, `--warm-500` en marcador de input), los dos por
> encima de 4,5:1, y el token vuelve a tener el alcance que su comentario declara.
>
> **Verificación posterior:** ampliar `public-web/tests/unit/tokens-contrast.spec.ts` con un caso que
> recorra los `::placeholder` y `.placeholder` de `src/components/ui/*.vue`, resuelva su `color` y
> exija ≥ 4,5:1 contra `--warm-50` y blanco — el mismo patrón que el admin ya aplica a `.ds-hint` /
> `.ds-meta` / `.ds-icon-muted` en `tokens-contrast.spec.ts:356-369`.

---

> ### 3 · **[menor]** El espejo de Vuetify se rompió dentro del propio commit que lo instauró
> **Dónde:** `src/plugins/vuetify.ts:27` (`warning: '#683D00'`) contra
> `src/assets/styles/tokens.css:136` (`--warning-900: oklch(40% 0.08 80deg)`). **Gemelo TR-02: los dos
> repos.**
>
> **Criterio:** regla del repositorio `lumbre-rebrand.md` §4.6 — «*el tema de Vuetify es un espejo en
> sRGB de los tokens del DS, no una paleta paralela. Eso es lo que cierra el defecto n.º 3 de forma
> permanente*».
>
> **Medido:** `#683D00` es **exactamente** el hex de `oklch(40% 0.12 80deg)`, el valor que
> `--warning-900` tenía **antes** del ajuste de gamut. El commit `53fa37c` hizo las dos cosas a la
> vez: fijó el espejo con el hex de §4.6 y bajó el croma de `--warning-900` de 0,12 a 0,08. El token
> se movió a `#5e4205`; el espejo se quedó donde estaba. **ΔE2000 = 5,45** (perceptible). Los otros
> seis siguen espejando al byte: `background`↔`--warm-50`, `primary`/`info`↔`--amatista-600`,
> `secondary`↔`--warm-500`, `success`↔`--success-dot`, `error`↔`--danger-500`.
>
> **Impacto:** ninguno en accesibilidad — blanco sobre `#683D00` da 9,31:1 y sobre el token real
> 9,30:1, los dos pasan §1.4.3 de sobra. El daño es de **régimen**: el defecto n.º 3 que §4.6 declaró
> cerrado «de forma permanente» reapareció en el mismo commit, y el comentario de `vuetify.ts:15-16`
> lo admite sin ironía: «*Ningún gate comprueba automáticamente que los dos coincidan*». Superficie
> afectada: las **16 pantallas públicas del tenant**, que es donde Vuetify pinta de verdad
> (en la consola solo queda el `<v-app>`).
>
> **Arreglo.** Dos partes, y la segunda es la que importa:
> 1. `vuetify.ts:27` → `warning: '#5E4205'`.
> 2. Convertir la regla en gate: un caso en `tokens-contrast.spec.ts` que lea los ocho hexes de
>    `vuetify.ts`, resuelva su token espejo desde `tokens.css`, convierta OKLCH → sRGB y exija
>    **igualdad byte a byte**. Es la única forma de que §4.6 sea cierto en vez de aspiracional. El
>    mapeo (`background`→`--warm-50`, `primary`/`info`→`--amatista-600`, `secondary`→`--warm-500`,
>    `success`→`--success-dot`, `error`→`--danger-500`, `warning`→`--warning-900`) está en la tabla
>    de §4.6 y no hace falta inventarlo.
>
> ⚠️ Toca un gemelo TR-02: el cambio va **idéntico en los dos repos** o `npm run quality` cae.

---

> ### 4 · **[menor]** La especificación ya no describe lo entregado: §4 omite ocho cambios de token y §5.3 tiene dos filas obsoletas
> **Dónde:** `admin-web/docs/ux/lumbre-rebrand.md` §4.3 («*Las escalas `--danger-*`, `--warning-*`,
> `--success-*` … **no se tocan***») y §5.2 («*los cuatro de las escalas semánticas … quedan fuera de
> este rebrand. Van al §13 como issue propuesto*»), contra el commit `53fa37c`.
>
> **Criterio:** trazabilidad. La especificación es el documento contra el que se audita; si no
> describe el árbol, la próxima auditoría medirá lo que no es.
>
> **Medido — lo que el commit cambió sin que §4 lo especifique:** `--danger-50` (0,05→0,02),
> `--danger-100` (0,06→0,02), `--danger-150` (0,06→0,03), `--danger-200` (0,06→0,04), `--danger-300`
> (0,1→0,08), `--danger-900` (0,18→0,16), `--danger-950` (0,15→0,14), `--warning-50` (0,06→0,04),
> `--warning-900` (0,12→0,08), y **`--danger-400` retirado** (no aparece en la tabla de retiradas de
> §4.4). El implementador **hizo bien** en arreglarlo —eran los cuatro fuera de gamut que §5.2
> detectó—, pero lo hizo **dentro** del rebrand en vez de en el issue separado que §5.2 prometía, y no
> actualizó §4.
>
> **Consecuencia en §5.3, recalculada:** de las 22 filas que pude reproducir, **20 dan exactamente el
> valor publicado** (Δ = 0,00). Dos ya no:
>
> | Fila de §5.3 | Publicado | **Entregado** | Δ |
> |---|---:|---:|---:|
> | `--danger-border` / `--danger-100` | 3,45 | **3,68** | +0,23 |
> | `--warning-border` / `--warning-50` | 3,41 | **3,45** | +0,04 |
>
> Las dos **mejoraron** y las dos siguen pasando: no hay riesgo de accesibilidad. Pero §5.3 se
> presenta como «34 pares, cero incumplimientos» y dos de sus celdas ya no corresponden al árbol.
> Nota colateral: §5.3 también cita los hexes `#ffe0da` y `#ffebc2`, que ya no existen.
>
> **Arreglo.** Añadir a §4.3 una subsección «escalas semánticas — corrección de gamut A11Y-11» con
> las diez líneas de arriba, mover `--danger-400` a la tabla de §4.4, y corregir las dos filas y los
> dos hexes de §5.3. Es edición de documento, no de código.

---

> ### 5 · **[menor]** R10 de `reglas-de-interfaz.md` —la ley de interfaz— cita un valor, un ratio y dos líneas que ya no existen
> **Dónde:** `docs/ux/reglas-de-interfaz.md:740-752`. **Gemelo TR-02: idéntico en los dos repos**
> (verificado con `diff`).
>
> **Criterio:** la propia R10 («*un comentario de contraste con un número obsoleto es peor que no
> tenerlo*», §9 de `lumbre-rebrand.md`, mismo principio).
>
> **Medido:** R10 presenta como «Así sí» el bloque `--warm-500: oklch(55% 0.012 60deg)` y una tabla
> que da **4,725:1**. En el árbol, `--warm-500` es `oklch(52% 0.012 var(--hue-neutral))` y mide
> **5,38:1**. Ni el valor, ni el hue, ni el ratio existen ya. Además:
> - R10 cita `tokens.css:31-36`; ahí hay hoy el comentario de `--amatista-450`. `--warm-500` está en
>   la **línea 76**.
> - R11 cita `primitives.css:768-776` como el «Así sí» de `.ds-field-invalid-focus`; ahí hay hoy
>   `.ds-truncate`. La regla está en la **línea 837** — y, comprobado, **es correcta**: consume
>   `var(--danger-border)`, no un valor a mano.
>
> **Impacto:** quien aplique R10 al pie de la letra reintroduce un `--warm-500` al 55 % que hoy sería
> una regresión de −0,65:1. Alcance: es la ley que rige a los dos fronts.
>
> **Arreglo.** Actualizar en R10 el bloque de código a `oklch(52% 0.012 var(--hue-neutral))`, la
> tabla de ratios a los valores medidos (58 % → 4,17 ✗ · 52 % → **5,38** ✓ · `--warm-600` → 7,21) y
> las referencias a `tokens.css:76` y `primitives.css:837`. **Va idéntico en los dos repos.**

---

> ### 6 · **[menor]** Un color escrito a mano sobrevive donde R11 exige consumir el token
> **Dónde:** `public-web/src/components/ui/BaseInput.vue:164` —
> `.input.invalid .icon { color: oklch(55% 0.22 25deg) }`.
>
> **Criterio:** `reglas-de-interfaz.md` **R11** («*si existe un token para un efecto, la clase de
> estado lo consume con `var()`. Escribir el valor a mano —aunque hoy sea el mismo valor— es lo que
> saca a esa clase del alcance de cualquier guarda que se ponga sobre el token*»).
>
> **Medido:** `oklch(55% 0.22 25deg)` = `#d40924`, **5,29:1** sobre `--warm-50` — **cumple** §1.4.11
> hoy. El token equivalente `--danger-500` pinta `#c53637` y mide **5,16:1**: prácticamente el mismo
> resultado. Es la **única** copia manuscrita que queda en los dos repos de ese valor; `primitives.css`
> ya migró `.ds-field-invalid-focus` a `var(--danger-border)`.
>
> **Impacto:** ninguno visible hoy. El daño es el punto ciego: es el icono del **campo inválido**, y
> si mañana se ajusta la escala `danger` por contraste, este icono no se entera. Es exactamente el
> modo de fallo que R11 describe.
>
> **Arreglo.** `color: var(--danger-500)`. Diferencia visual ΔE ≈ 5, en un icono de 16 px sobre un
> campo ya marcado en rojo; si se considera que el matiz importa, la alternativa correcta es promover
> el valor a token, no dejarlo escrito.

---

> ### 7 · **[menor]** La escala `danger` tiene dos pares de nombres que pintan el mismo color
> **Dónde:** `src/assets/styles/tokens.css:107-112`. Gemelo TR-02.
>
> **Criterio:** invariante de rampa de `lumbre-rebrand.md` §6 y del comentario de `tokens.css:15-22`
> («*el número mayor SIEMPRE oscurece*»).
>
> **Medido:** `--danger-50` y `--danger-100` son ambos `oklch(95% 0.02 25deg)`; `--danger-250` y
> `--danger-300` son ambos `oklch(85% 0.08 25deg)`. Luminancia Y×100 de la escala:
> 85,37 → **85,37** → 82,18 → 76,64 → 59,48 → **59,48** → 14,78 → 10,88 → 9,58 → 7,86 → 5,52 → 3,65.
> **Monótona, pero no estricta**: dos mesetas. Las rampas `--amatista-*` y `--warm-*` sí son
> estrictamente decrecientes y reproducen §6 al céntimo.
>
> **El propio comentario lo admite** (`tokens.css:102-106`): a 95 % y 85 % de claridad el techo de
> croma en gamut es tan bajo que los pares coinciden, y «*ya lo hacían de facto, recortados por el
> navegador*». La decisión es defendible; el problema es que **cuatro nombres prometen cuatro
> escalones y entregan dos**, y quien elija `--danger-300` creyendo que oscurece frente a
> `--danger-250` se equivoca sin que nada se lo diga.
>
> **Arreglo (propuesta, no urgente).** Convertir el par redundante en alias explícito —
> `--danger-100: var(--danger-50);` y `--danger-300: var(--danger-250);` — para que la igualdad sea
> visible en el fichero y no una coincidencia aritmética. Y añadir a `tokens-contrast.spec.ts` un caso
> de invariante que exija monotonía **no estricta** en las tres familias, y **estricta** en
> `--amatista-*` y `--warm-*`: es la guarda que el comentario de `tokens.css:15-22` describe con todo
> detalle y que hoy **no existe** en ningún test.

---

> ### 8 · **[menor]** La consola sirve tres activos de marca que nadie referencia
> **Dónde:** `admin-web/public/brand/` — `lumbre-logo-only-transparent-64.png`,
> `open-graph-1200x630.png`, `twitter-x-1200x600.png`.
>
> **Criterio:** higiene de artefacto. No hay criterio WCAG.
>
> **Medido:** cero referencias en `admin-web/src/**` (la consola no usa **ninguna** imagen de marca en
> el marcado: sus dos superficies son texto, según §7.3) y cero en `index.html` — que omite `og:image`
> y `twitter:image` **a propósito y con el motivo escrito** (`index.html:19-23`: la consola no tiene
> dominio público declarado). El manifiesto solo referencia los tres iconos PWA.
>
> **Impacto:** peso muerto en el artefacto desplegado. Nulo para el usuario.
>
> **Arreglo.** O se borran los tres de `admin-web/public/brand/`, o —si se dejan como reserva para
> cuando la consola tenga dominio— se anota el porqué junto al comentario que ya explica la ausencia
> de `og:image`. Lo que no debe quedar es un activo sin referencia y sin explicación.

---

> ### 9 · **[nota]** `--amatista-50` cae fuera del gamut sRGB y §4.1 lo declara dentro
> **Dónde:** `tokens.css:23` — `--amatista-50: oklch(97% 0.015 var(--hue))`, marcado en
> `lumbre-rebrand.md` §4.1 como «*sin cambio · **En gamut a 281°***».
>
> **Criterio:** CSS Color 4 no normaliza el recorte fuera de gamut; cada motor decide.
>
> **Medido — exceso de canal fuera de [0, 1] antes del recorte:**
>
> | Token | Exceso | Lectura |
> |---|---:|---|
> | `--amatista-50` | **3,6 × 10⁻³** | fuera de gamut; recorte apreciable |
> | `--warm-50` | 1,6 × 10⁻³ | fuera, pero §4.2 **ya lo declara** («*margen más ajustado: 0,0005 en `--warm-50`*») |
> | `--warm-100`, `--danger-50`, `--warning-50`, `--success-50`, `--success-bg`, `--compras-ok-bg` | 0 | dentro |
>
> `--amatista-50` excede el doble que `--warm-50`, y es el **fondo de `.ds-banner--info` y de
> `.ds-tone--accent-selected`**. §4.1 lo da por bueno sin medirlo. El §14.1 de la especificación ya
> advirtió honestamente de este riesgo: «*para los que caen fuera, mis hexes son los del recorte por
> canal y el navegador puede pintar otra cosa*».
>
> **Impacto:** despreciable hoy — todos los ratios que lo usan de fondo tienen margen amplio
> (`--warm-500` sobre él, 5,06:1; `--amatista-800` sobre él, 12,09:1). Lo anoto porque **§4.1 afirma
> algo que no es cierto**, y esa afirmación es la que impide que alguien lo revise.
>
> **Arreglo.** Bajar el croma a **0,013** deja el token dentro de gamut con el mismo aspecto
> (diferencia invisible, mismo hex tras cuantizar), o corregir §4.1 para decir «marginalmente fuera,
> recorte de 3,6 × 10⁻³, aceptado». Cualquiera de las dos; lo que no vale es la afirmación actual.

---

> ### 10 · **[nota]** La cabecera de `public-auth.css` sigue nombrando la marca y la paleta viejas
> **Dónde:** `public-web/src/assets/styles/public-auth.css:1-5` — «*tokens y utilidades del handoff
> (design_handoff_vetsoftware_completo)*» y «*Paleta amatista + Inter*».
>
> **Criterio:** `lumbre-rebrand.md` §10.1 y política de comentarios del proyecto (un comentario que
> ha dejado de ser cierto se corrige).
>
> **Medido:** la paleta ya **no** es amatista: `--pub-ame-500` está en OKLCH 280,9° y `--pub-ame-700`
> en 281,1°, es decir, es la familia índigo de Lumbre. El comentario describe el estado anterior.
>
> **Impacto:** nulo para el usuario; confunde a quien abra el fichero más cargado de literales del
> árbol y crea que sigue sin recolorear.
>
> **Arreglo.** «*Paleta de marca Lumbre (índigo 281°, neutros 256°) + Inter*». La referencia a
> `design_handoff_vetsoftware_completo` es un documento de origen y **se conserva**, por el mismo
> criterio con el que §10.2 dejó el «Recibo Vetrina» de `useReceiptPrint.ts:7`: es trazabilidad, no
> marca en pantalla.

---

> ### 11 · **[nota]** El contrato de `--text-placeholder` y la superficie hundida pueden cruzarse
> **Dónde:** `tokens.css:177-183` (contrato: «*solo sobre `--warm-50`/`--surface`/blanco. **NO usar
> sobre `--warm-150`** (4,38:1, incumple)*») contra `primitives.css:1664-1668`
> (`.ds-field-readonly { background: var(--surface-sunken) }` = `--warm-150`).
>
> **Criterio:** WCAG 2.2 §1.4.3 (AA).
>
> **Medido:** `--text-placeholder` sobre `--warm-150` = **4,38:1**, falla por 0,12. El contrato es
> correcto y está bien escrito; lo que no existe es nada que lo haga cumplir.
>
> **Impacto:** hoy **no se materializa** — verificado: los cinco consumidores de `--text-placeholder`
> están en la consola y ninguno está sobre `--warm-150`. Pero `BaseSelect.vue:70` devuelve
> `['ds-field-readonly']` en modo solo lectura, y un selector solo-lectura sin valor pinta
> `.value.placeholder` sobre la superficie hundida. Si el hallazgo n.º 2 se arregla moviendo esa clase
> a `--text-placeholder`, **se crea el cruce**: 4,38:1.
>
> **Arreglo — que el arreglo del n.º 2 no cree este defecto.** Al migrar `BaseSelect.vue:369`, añadir
> la excepción del solo-lectura, que además es la que ya usa `.ds-field-readonly` para el texto:
>
> ```css
> .ds-field-readonly .value.placeholder { color: var(--warm-500); }  /* 4,78:1 sobre --warm-150 */
> ```
>
> **Verificación posterior:** un caso que exija ≥ 4,5:1 de todo color declarado dentro de una regla
> cuyo fondo resuelto sea `--warm-150`. Es la forma general del contrato, y hoy nadie la comprueba.

---

> ### 12 · **[nota]** No hay ninguna puerta de accesibilidad en el pipeline, y las dos que hay no son gemelas
> **Dónde:** los dos `package.json`, los dos `eslint.config.ts`, los workflows.
>
> **Criterio:** ninguno normativo; es una observación de proceso que enmarca los once hallazgos
> anteriores.
>
> **Medido:** cero `axe-core`, cero `@axe-core/playwright`, cero `eslint-plugin-vuejs-accessibility`,
> cero pa11y, cero Lighthouse — ni como dependencia, ni en CI, ni en scripts, en ninguno de los dos
> repos. La única cobertura de contraste son los dos `tokens-contrast.spec.ts`, que **solo miran
> `tokens.css` y `primitives.css`** y **divergen entre sí**: el de la consola tiene 436 líneas y
> comprueba `.ds-hint`/`.ds-meta`/`.ds-icon-muted` por su `color` declarado; el del tenant tiene 212 y
> no lo hace, **aunque las tres clases viven en el `primitives.css` gemelo**.
>
> **Por qué esto es la causa raíz de los hallazgos 1, 2, 3 y 6:** los cuatro están **fuera** de
> `tokens.css`. El n.º 1 en `public-auth.css`, el n.º 2 en el `<style scoped>` de dos primitivas, el
> n.º 3 en `vuetify.ts`, el n.º 6 en el `<style scoped>` de un SFC. **La guarda protege el token, no
> el píxel** — que es literalmente lo que R11 advierte. Mientras la medida se detenga en el borde de
> `tokens.css`, este documento se volverá a escribir dentro de seis meses con otros cuatro hallazgos
> en los mismos sitios.
>
> **Arreglo — el más barato primero, y sin dependencias nuevas.** Los tres casos que proponen los
> hallazgos 1, 2 y 3 se construyen **con el helper que el tenant ya tiene**
> (`tests/helpers/wcag-contrast.ts`: `readCustomProperties`, `resolveVars`, `parseOklch`,
> `oklchToSrgb`, `contrastRatio`). Cubren `public-auth.css`, los `::placeholder` y el espejo de
> Vuetify sin instalar nada. Solo después, y como decisión aparte, tiene sentido plantear
> `@axe-core/playwright` sobre la suite visual que ya existe.

---

## 4 · Issues propuestos — redactados, no abiertos

No abro issues por iniciativa propia. Estos son los cuerpos, listos para que decida el humano. Antes
de abrirlos conviene buscar duplicados (`gh issue list --state all --search "contraste borde"`); **no
lo hice**, ver §5.

**A · `public-web` — El borde de los campos de la zona pública mide 1,23:1 (WCAG 2.2 §1.4.11 AA)**
> `AuthInput.vue:97` y `AuthSelect.vue:79` dibujan el contorno del control con `var(--pub-line)`
> (`#dfe9f7`), que mide **1,23:1** sobre la tarjeta blanca. Es el único indicador visual del control,
> así que la exención de límites de §1.4.11 no aplica. Afecta a las 16 pantallas públicas: es la
> primera que ve todo usuario nuevo.
> Es el mismo defecto que A11Y-09 corrigió en el DS (`--warm-200` → `--warm-450`) y que
> `lumbre-rebrand.md` §5.4 enuncia; no llegó aquí porque §9 blindó `public-auth.css` frente al DS y
> clasificó `--pub-line` como neutro «de acompañamiento»: se le giró el tono y no la claridad.
> **Propuesta:** variable nueva `--pub-line-control: #6e88ac` (**3,63:1**, el margen exacto de
> `--warm-450`) referenciada solo desde esas dos líneas — `--pub-line` sigue igual en las seis
> superficies donde §1.4.11 lo exime, y no se mueve ninguna línea base visual.
> **Verificación:** caso en `tests/unit/tokens-contrast.spec.ts` con el helper existente.

**B · `public-web` — El marcador de los selectores mide 2,41:1; `--text-placeholder` no se usa aquí (WCAG 2.2 §1.4.3 AA)**
> `BaseSelect.vue:369`, `SearchableSelect.vue:358`, `BaseSelect.vue:445`, `OwnerSearchList.vue:128` y
> `EditRoleHeader.vue:164` pintan texto de marcador con `var(--warm-400)` = **2,41:1**.
> `tokens.css:177-183` creó `--text-placeholder` (**4,93:1**) citando por su nombre a `BaseSelect`,
> `SearchableSelect` y `BaseInput` — componentes de **este** repo — pero sus cinco consumidores están
> todos en la consola: aquí tiene **cero**. `BaseSelect` y `SearchableSelect` son primitivas, así que
> el defecto alcanza toda pantalla con un desplegable sin elegir.
> **Propuesta:** migrar esas cinco líneas a `var(--text-placeholder)`, **sin tocar** los seis que ya
> usan `--warm-500` (5,38:1) — dos remedios al mismo defecto lo empeoran (R10.2). Añadir la excepción
> `.ds-field-readonly .value.placeholder { color: var(--warm-500) }` para no crear el cruce con la
> superficie hundida (4,38:1).

**C · ambos fronts — El espejo de Vuetify no tiene gate y ya está roto en un valor**
> `vuetify.ts:27` declara `warning: '#683D00'`, que es el hex de `--warning-900` **antes** del ajuste
> de gamut del commit `53fa37c`. El token vale hoy `#5e4205` (ΔE 5,45). El mismo commit fijó el espejo
> y movió el token. `lumbre-rebrand.md` §4.6 declaraba esto «cerrado de forma permanente» y el
> comentario de `vuetify.ts:15-16` admite que ningún gate lo comprueba. Contraste no afectado (9,31 vs
> 9,30).
> **Propuesta:** corregir el valor y añadir un caso que exija igualdad byte a byte entre los ocho
> hexes de `vuetify.ts` y sus tokens espejo. Gemelo TR-02: idéntico en los dos repos.

**D · `admin-web` — La especificación del rebrand y la ley de interfaz citan valores que ya no existen**
> Documentación, sin impacto en ejecución. (a) `lumbre-rebrand.md` §4.3/§5.2 dicen que las escalas
> semánticas «no se tocan», pero el commit cambió diez tokens de `danger`/`warning` y retiró
> `--danger-400`; §5.3 tiene dos filas obsoletas (3,45→**3,68** y 3,41→**3,45**, las dos mejoraron) y
> dos hexes que ya no existen. (b) `reglas-de-interfaz.md` R10 presenta como ejemplo correcto
> `--warm-500: oklch(55% 0.012 60deg)` con 4,725:1, cuando el árbol tiene `oklch(52% 0.012
> var(--hue-neutral))` = **5,38:1**; R10 y R11 citan `tokens.css:31-36` y `primitives.css:768-776`,
> que hoy apuntan a otras reglas (los sitios reales son `tokens.css:76` y `primitives.css:837`).
> `reglas-de-interfaz.md` es gemelo TR-02: la corrección va idéntica en los dos repos.

---

## 5 · Lo que NO ejecuté — declarado como no ejecutado

- **No corrí ningún gate.** Ni `npm run quality`, ni `npm run build`, ni `vue-tsc`, ni Vitest, ni
  Playwright, ni `ds:audit`, ni `css-budget.mjs`, en ninguno de los dos repos. **No doy por pasado
  nada.** En particular, **no ejecuté los dos `tokens-contrast.spec.ts`**: los leí y los describí, y
  reproduje su metodología por separado, pero no sé si hoy pasan.
- **No abrí ningún navegador ni rendericé ninguna pantalla.** Todos los ratios salen de mi propia
  implementación OKLCH → sRGB → luminancia, validada contra siete valores documentados en
  `tokens.css` con desviación 0,00 en los siete — **pero no contra un render real**. Para los tres
  tokens fuera de gamut (`--amatista-50`, `--warm-50`, `--surface`) mis hexes son los del recorte por
  canal, y CSS Color 4 no impone un método único: **el navegador puede pintar otra cosa**.
- **No inspeccioné visualmente ningún logotipo.** La verificación de activos es **criptográfica**
  (SHA-256 contra el kit), no visual. Los defectos visuales del kit que §2.2 identificó —el wordmark
  mal recortado, el isotipo que no sobrevive bajo 48 px, los SVG que son PNG en base64— **los cito, no
  los reverifiqué**.
- **No medí ningún árbol de accesibilidad**, ni foco real, ni orden del DOM, ni tamaño de objetivo
  (§2.5.8). Este documento es de **marca y color**. El §2.4.13 lo calculé sobre los valores de token,
  no sobre geometría renderizada.
- **No conté las 52 líneas base visuales** ni comprobé si el rebrand las invalidó. §11.3 de la
  especificación dice que hay 52; no las miré.
- **No busqué duplicados en GitHub** de los cuatro issues propuestos. Hay que hacerlo antes de
  abrirlos.
- **`--pub-line-2` y `--pub-line-strong`**: medí sus ratios (1,17:1 y 1,30:1) pero **no rastreé todos
  sus consumidores** para decidir cuáles delimitan un control y cuáles son separadores. El hallazgo
  n.º 1 solo afirma lo que verifiqué: `--pub-line` en `AuthInput` y `AuthSelect`.
- **Fuentes normativas:** `WebFetch` respondió correctamente a
  <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html> y
  <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>, y de ahí salen las citas
  literales de §2.2 y §2.3. **No consulté** IBM Carbon, GOV.UK ni Primer: ninguna conclusión de este
  documento depende de ellos, y son SPA de las que `WebFetch` extrae poco.
- **APCA no se usó en ningún punto.** Sigue en beta y no vale para conformidad; todo se midió con
  WCAG 2.x.

---

## 6 · Anexo — reproducibilidad

Scripts desechables usados, en el scratchpad de la sesión (prefijo `uxa-marca-`), **no versionados y
no dejados en ningún repo**: `uxa-marca-color.mjs` (motor OKLCH↔sRGB, ΔE2000, gamut),
`uxa-marca-brand.mjs` (desviación marca↔token), `uxa-marca-contraste.mjs` (barrido de pares),
`uxa-marca-verifica.mjs` (§4/§5.3/§6 contra el árbol), `uxa-marca-censo.mjs` (censo de literales).

Validación del motor, reproducida sobre el árbol entregado:

| Par | `tokens.css` documenta | Medido aquí | Δ |
|---|---:|---:|---:|
| `--amatista-450` / `--amatista-50` | 3,47 | **3,47** | 0,00 |
| `--amatista-450` / `--warm-50` | 3,69 | **3,69** | 0,00 |
| `--warm-500` / `--warm-50` | 5,38 | **5,38** | 0,00 |
| `--warm-450` / `--warm-50` | 3,54 | **3,54** | 0,00 |
| `--danger-border` / `--danger-100` | 3,68 | **3,68** | 0,00 |
| `--amatista-500` / `--warm-50` | 4,44 | **4,44** | 0,00 |
| `--text-placeholder` / `--warm-50` | 4,93 | **4,93** | 0,00 |

Y el guard-rail que el comentario de `--amatista-450` describe: a `--hue: 180` el par cae a
**2,94:1** e incumpliría — exactamente la cifra que `tokens.css:34` afirma. **El comentario dice la
verdad.**
