#!/usr/bin/env node
/**
 * Presupuesto de bundle verificado sobre `dist/`.
 *
 * Mide la RUTA CRÍTICA, no "el archivo index". Esa distinción es el motivo de
 * que este script exista: Vite emite el entry junto con una lista de
 * `<link rel="modulepreload">`, y el navegador descarga todo eso antes de
 * pintar. Un presupuesto que solo mirara `index-*.js` daría por bueno un
 * bundle que creció en los chunks precargados — que es exactamente donde vive
 * la mayor parte del peso (Vuetify, los iconos).
 *
 * Se mide en gzip porque es lo que viaja por el cable: nginx y Cloudflare
 * comprimen, así que los bytes sin comprimir no son lo que espera el usuario.
 *
 * Uso:
 *   node scripts/check-bundle-budget.mjs            # falla si se excede
 *   node scripts/check-bundle-budget.mjs --report   # solo informa
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'

const DIST = path.resolve(import.meta.dirname, '../dist')

/**
 * Presupuestos en bytes gzip. Se fijan con holgura sobre la medida real del
 * momento en que se establecieron, no en un número redondo aspiracional: la
 * gracia es que salte cuando algo crece de verdad, no que quepa cualquier cosa.
 *
 * Medida al establecerlos (8 de agosto de 2026, build de producción):
 *   ruta crítica JS   121,3 KB gzip   → presupuesto 150 KB   (+24 %)
 *   CSS crítico        37,2 KB gzip   → presupuesto  45 KB   (+21 %)
 *   JS total          190,3 KB gzip   → presupuesto 240 KB   (+26 %)
 *
 * Subir un presupuesto es una decisión consciente que queda en el historial.
 * Eso es justo lo que faltaba: nada impedía que el peso creciera sin que nadie se
 * enterara hasta que un usuario se quejara de la carga.
 *
 * ── El subset de Iconify ya no existe (TR-02) ───────────────────────────────
 *
 * Estos números se midieron cuando los iconos venían de una colección Tabler
 * recortada por `scripts/build-icon-subset.mjs`. Ese script, el JSON generado y
 * su prueba se retiraron al unificar los dos fronts: ahora los iconos son
 * componentes de Lucide, tanto los de la aplicación como los que Vuetify pide
 * para sí. El bundler se lleva solo los que se usan, un nombre inexistente deja
 * de compilar en vez de dejar un hueco, y no hay paso de generación que
 * recordar. El JS total bajó de 190,3 a 186,2 KB pese a entrar tokens y
 * primitivas del sistema de diseño.
 *
 * ── JS total re-basado tras la onda 3 (24 de agosto de 2026) ────────────────
 *
 * El total llegó a 321,6 KB / 310 KB (127 chunks), excedido, sin que ninguna tarea
 * individual lo causara: doce pantallas de campaña lo fueron subiendo, sobre todo el
 * chunk diferido de los editores de puentes del catálogo (9,24 KB, W3-A) y tres
 * primitivas nuevas (`DocumentSheet`/`DocumentSeal`/`RecordSkeleton`, 0,9 KB). Ver
 * #172/#169.
 *
 * Antes de tocar el techo se midió qué hay dentro (`dist/assets/*.js` descomprimido a
 * mano, sin sourcemaps —no se publican ni en dev— comparando contra bytes gzip):
 *
 *   - Los dos chunks más pesados, `icons-*.js` (50,6 KB gzip) e `index-*.js`
 *     (46,5 KB gzip) — el 30 % del total — NO son bloat de producto: son Vue +
 *     Vue Router + Vuetify (layout/tema) + Pinia + Axios + el componente base de
 *     Lucide, el runtime compartido que Rollup agrupa automáticamente porque lo
 *     usan casi todas las rutas (así es como se decidió no forzar `manualChunks`,
 *     más arriba en este archivo).
 *   - El tree-shaking de iconos SÍ funciona: `icons-*.js` embebe 55 iconos (los que
 *     importa `constants/icons.ts`) y el segundo lote de `index-*.js` embebe otros
 *     46 (los que pide `vuetify-icon-aliases.ts` para los propios controles de
 *     Vuetify) — 101 de los 3410 que trae `lucide-vue-next`, no la librería
 *     entera. No hay una vía real de adelgazar aquí sin dejar de usar iconos.
 *   - Ningún chunk de vista domina: la ruta más pesada de la campaña
 *     (`SubscriptionMoneyView`) pesa 12,2 KB gzip. Trocear más no baja la suma
 *     (ya se intentó, ver el comentario de `manualChunks` en `vite.config.ts`).
 *
 * Y un hallazgo que sí cambia el número: la reserva de 70 KB que TR-05 añadió para
 * Faro/OTel (240 → 310, más abajo) lleva **sin gastarse desde que se creó**:
 * `VITE_TELEMETRY_URL` está vacío en `.env.dev`, `.env.prod` y `.env.example` — no hay
 * un solo entorno que lo active — así que ese chunk nunca se emite y los 70 KB no
 * protegían nada real. Lo que hicieron fue absorber en silencio dos oleadas de
 * crecimiento genuino de la consola, y por eso el gate no avisó hasta que ya no había
 * margen (#172, #169). Mantener una reserva especulativa sin gastar contradice la
 * regla de este mismo archivo — "se fijan con holgura sobre la medida real", no sobre
 * una futura — así que se retira: el día que un entorno real active la telemetría, esa
 * PR mide el chunk de verdad y sube el techo esa cantidad exacta, documentado igual
 * que se hizo aquí. No antes.
 *
 * Con eso, el nuevo total se re-basa sobre la medida real de hoy (321,6 KB, ya sin
 * telemetría dentro) con el mismo criterio de holgura que se usó al fijar el
 * presupuesto original — ~20 %, ligeramente más conservador que el +26 % de la
 * primera vez porque ya sabemos que este número puede consumirse en semanas:
 *
 *   JS total (hoy)   321,6 KB gzip   → presupuesto 385 KB   (+20 %, ~16 % de margen)
 *
 * Los otros dos no se tocan: ruta crítica JS va al 35 % de margen (97,1/150 KB) y CSS
 * crítico al 19 % (36,3/45 KB) — ninguno de los dos estuvo nunca en riesgo, y son los
 * que de verdad miden lo que tarda en pintar la pantalla. Con 63 KB de margen nuevo
 * (frente a los 1,7 KB de #172), una oleada del tamaño de la onda 3 (+11,4 KB) cabe
 * más de cinco veces antes de volver a estar rojo — no es una cifra cómoda para
 * siempre, es sitio real para lo que ya se sabe que viene.
 *
 * ── `/limites` entra en el router: JS total re-basado (27 de agosto de 2026) ─
 *
 * El total llegó a 399,5 KB / 385 KB (162 chunks). La causa inmediata es que al registrar
 * `limitsRoutes` en `router/index.ts`, las seis pantallas de cupo y límites entraron por
 * primera vez en el grafo del empaquetador.
 *
 * Antes de tocar el techo se comprobó que ese peso es REAL y no un accidente de empaquetado.
 * Se midió construyendo con `--sourcemap` a un `outDir` aparte —los mapas siguen sin
 * publicarse, ver `sourcemap: false` en `vite.config.ts`— para saber qué módulo cae en qué
 * chunk, en vez de deducirlo de los nombres:
 *
 *   - `features/limits` ocupa 11 chunks, 24,57 KB gzip, y **los once son diferidos**:
 *     ninguno aparece en `index.html` ni como entry ni como `modulepreload`.
 *   - Esos once contienen **solo** módulos de `features/limits`. No hay una sola fuente de
 *     la feature dentro de `index-*.js` ni de `icons-*.js`, que son la ruta crítica entera.
 *     Nada de cupo se carga al abrir la aplicación.
 *   - Ningún `import` estático donde debería haber uno perezoso: las seis vistas entran por
 *     `() => import(...)` desde `routes/limits.routes.ts`, que fuera de eso solo importa un
 *     tipo. Los dos modales (`GrantOverrideModal`, `RevokeOverrideModal`) viajan dentro del
 *     chunk de su vista, que ya es diferido.
 *   - Cero módulos repetidos entre chunks distintos — comprobado sobre los 162, no solo
 *     sobre los de cupo. No hay nada empaquetándose dos veces.
 *   - Ninguna biblioteca nueva: la feature no arrastra nada de `node_modules` que no
 *     estuviera ya en el bundle.
 *   - Ningún chunk de cupo domina: el mayor (`LimitOverridesView`, 6,76 KB) está muy por
 *     debajo del mayor de la onda 3 (`SubscriptionMoneyView`, 12,2 KB).
 *
 * O sea: 24,57 KB gzip por seis pantallas, once componentes y tres stores, aislados y
 * diferidos. Es peso de producto, no bloat de empaquetado — no hay nada que arreglar.
 *
 * Los otros dos presupuestos NO se tocan, y son los que de verdad miden lo que tarda en
 * pintar: ruta crítica JS 100,0/150 KB (33 % de margen) y CSS crítico 36,3/45 KB (19 %). La
 * ruta crítica subió 2,9 KB desde el 24 de agosto y **no es de cupo**: son los `*.tab.ts` de
 * los expedientes de empresa y de suscripción, que `import.meta.glob(..., { eager: true })`
 * mete en el entry a propósito — solo los metadatos, ~5,7 KB en crudo; los SFC de cada
 * pestaña siguen cargándose de forma diferida.
 *
 *   JS total (hoy)   399,5 KB gzip   → presupuesto 440 KB   (+10 %, ~9 % de margen)
 *
 * Se sube un +10 % y no el +20 % de la vez anterior, y es a conciencia. Los 63 KB de margen
 * que dejó el re-base del 24 de agosto se consumieron **en tres días** (321,6 → 399,5 KB), de
 * los cuales cupo pone 24,6 y el resto lo pusieron otras oleadas de la campaña. Un colchón
 * más grande no habría evitado nada: solo habría retrasado la conversación hasta que ya no
 * hubiera sitio, que es exactamente el argumento con el que este mismo archivo retiró la
 * reserva especulativa de 70 KB de Faro. Si quedan oleadas en cola, lo correcto es que cada
 * una mida su propio chunk y suba el techo esa cantidad exacta, documentándolo aquí — no
 * pre-inflarlo hoy sobre una cifra futura que nadie ha medido todavía.
 *
 * ── La oleada entera aterriza: JS total re-basado (28 de agosto de 2026) ────
 *
 * El total llegó a 504,2 KB / 440 KB (192 chunks). La causa es la misma clase de
 * suceso que el 27 de agosto, a otra escala: cinco lotes cerraron sus pantallas a la
 * vez y la integración enganchó al router las dos familias que quedaban escritas sin
 * registrar —`reconciliationRoutes` y `trialsRoutes`—, así que sus vistas entraron por
 * primera vez en el grafo del empaquetador junto con todo lo que los lotes añadieron a
 * features ya registradas (cobranza, expediente de empresa, documentos de cobro).
 *
 * Antes de tocar el techo se comprobó que el peso es REAL y no un accidente de
 * empaquetado, con el mismo método de la vez anterior: build con `--sourcemap` a un
 * `outDir` aparte —los mapas siguen sin publicarse, ver `sourcemap: false` en
 * `vite.config.ts`— y atribución de cada módulo a su chunk leyendo los 192 `.map`, en
 * vez de deducirlo de los nombres:
 *
 *   - **Cero módulos repetidos** entre chunks distintos, comprobado sobre los 192. No
 *     hay nada empaquetándose dos veces.
 *   - La ruta crítica son **dos** chunks, `index-*.js` (72,0 KB) e `icons-*.js`
 *     (30,1 KB), y dentro de `src/` no hay una sola vista, componente ni store de
 *     ninguna feature: solo el armazón (App, main, plugins, guardas, primitivas de
 *     feedback, http/storage y los stores transversales), los 30 manifiestos de
 *     `routes/*.routes.ts` —que el router importa por definición— y los 17 `*.tab.ts`
 *     de los expedientes de empresa y suscripción, que `import.meta.glob(…,
 *     { eager: true })` mete ahí a propósito y ya estaban declarados el 27 de agosto.
 *     Los SFC de cada pestaña siguen siendo diferidos.
 *   - Todos los chunks de las dos familias recién registradas son diferidos:
 *     `features/reconciliation` 15,67 KB en 1 chunk (su vista única con tres
 *     pestañas) y `features/trials` 19,14 KB en 8. Ninguno aparece en `index.html`.
 *   - Ningún `import` estático donde debería haber uno perezoso: las vistas entran por
 *     `() => import(…)` desde sus ficheros de rutas, y los modales viajan dentro del
 *     chunk de su vista, que ya es diferido.
 *   - Ninguna biblioteca nueva. `axios` domina `index-*.js` y `lucide-vue-next`
 *     `icons-*.js`, igual que antes; no ha entrado nada de `node_modules` que no
 *     estuviera ya.
 *   - El chunk de vista más pesado pasa a ser `ReconciliationView` (15,67 KB, 40
 *     módulos), por delante de `SubscriptionMoneyView` (11,5 KB). Es una sola ruta con
 *     tres pestañas dentro; trocearlo por pestaña bajaría el pico, no la suma.
 *
 * Y lo que de verdad decide cuánto tarda en pintar NO se movió: ruta crítica JS
 * 102,0/150 KB (32 % de margen, +2,0 KB desde el 27 de agosto, y esos 2 KB son los dos
 * manifiestos de rutas nuevos más las pestañas que la oleada añadió al glob eager) y
 * CSS crítico 36,3/45 KB (19 %), idéntico. Lo que crece es código diferido que solo se
 * descarga al entrar en su ruta.
 *
 *   JS total (hoy)   504,2 KB gzip   → presupuesto 555 KB   (+10 %, ~9 % de margen)
 *
 * Se sube el mismo +10 % que la vez anterior y por el mismo motivo: un colchón mayor no
 * evitaría nada, solo retrasaría la conversación. Quedan oleadas en cola —contabilidad,
 * fiscal, informes, catálogos anuales, incidentes (§2 de la ampliación)— y lo correcto
 * sigue siendo que cada una mida su propio chunk y suba el techo esa cantidad exacta,
 * documentándolo aquí.
 *
 * <b>No está contado aquí</b> lo que pesa `features/billing-documents` (16,46 KB en 3
 * chunks): sus dos vistas SÍ están en el bundle —`BillingDocumentsTable.vue` importa
 * `BILLING_DOCUMENT_ROUTE_NAMES` y enlaza a ellas— pero `billingDocumentsRoutes` no
 * está registrado en `router/index.ts`, así que hoy son 16 KB que nadie puede abrir.
 * Registrarlas no sube el techo: ya se está pagando su peso.
 */
const BUDGET_GZIP = {
  criticalJs: 150 * 1024,
  criticalCss: 45 * 1024,
  totalJs: 555 * 1024,
}

const KB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

function gzipSize(assetPath) {
  return gzipSync(readFileSync(path.join(DIST, assetPath))).length
}

/** Assets que el navegador pide antes de poder pintar: el entry y sus precargas. */
function readCriticalPath() {
  const html = readFileSync(path.join(DIST, 'index.html'), 'utf8')
  const hrefs = (pattern) =>
    Array.from(html.matchAll(pattern), (m) => m[1].replace(/^\//, '')).filter((f) =>
      existsSync(path.join(DIST, f)),
    )

  return {
    js: [
      ...hrefs(/<script[^>]+type="module"[^>]+src="([^"]+)"/g),
      ...hrefs(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
    ],
    css: hrefs(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
  }
}

function allJs() {
  return readdirSync(path.join(DIST, 'assets'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `assets/${f}`)
}

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('No hay dist/index.html. Ejecuta el build antes de medir el presupuesto.')
  process.exit(1)
}

const critical = readCriticalPath()
const sum = (files) => files.reduce((acc, f) => acc + gzipSize(f), 0)

const measured = {
  criticalJs: sum(critical.js),
  criticalCss: sum(critical.css),
  totalJs: sum(allJs()),
}

const rows = [
  ['Ruta crítica JS', measured.criticalJs, BUDGET_GZIP.criticalJs, `${critical.js.length} chunks`],
  [
    'Ruta crítica CSS',
    measured.criticalCss,
    BUDGET_GZIP.criticalCss,
    `${critical.css.length} hojas`,
  ],
  ['JS total', measured.totalJs, BUDGET_GZIP.totalJs, `${allJs().length} chunks`],
]

console.log('\nPresupuesto de bundle (gzip)\n')
for (const [label, value, budget, detail] of rows) {
  const margen = (((budget - value) / budget) * 100).toFixed(0)
  const estado = value > budget ? 'EXCEDIDO' : `${margen} % de margen`
  console.log(
    `  ${label.padEnd(18)} ${KB(value).padStart(9)} / ${KB(budget).padStart(9)}   ${estado}   (${detail})`,
  )
}

if (process.argv.includes('--report')) {
  console.log('\nModo informe: no se aplica el presupuesto.\n')
  process.exit(0)
}

const excedidos = rows.filter(([, value, budget]) => value > budget)
if (excedidos.length > 0) {
  console.error(
    `\nPresupuesto excedido en: ${excedidos.map(([label]) => label).join(', ')}.` +
      '\nO se reduce el peso, o se sube el presupuesto en scripts/check-bundle-budget.mjs' +
      ' explicando por qué en el commit.\n',
  )
  process.exit(1)
}

console.log('\nDentro de presupuesto.\n')
