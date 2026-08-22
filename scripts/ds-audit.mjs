/**
 * Auditoría visual del design system.
 *
 * Compara, propiedad por propiedad, el CSS scoped original (lado "a" del
 * harness) contra las primitivas `ds-*` (lado "b"). Sirve para verificar que
 * migrar un componente a las primitivas no cambia su aspecto — y, cuando sí lo
 * cambia, para ver exactamente en qué y cuánto.
 *
 * Uso:
 *   npm run dev          # en otra terminal (el harness se sirve desde /docs)
 *   npm run ds:audit
 *
 * Para auditar un patrón nuevo: añade un par `data-pair` en docs/ds-audit.html
 * con el CSS original literal a la izquierda y las clases `ds-*` a la derecha.
 *
 * ── Puerta de calidad ────────────────────────────────────────────────────
 * El total de diferencias es un trinquete, igual que `css-budget.mjs`: el techo
 * vive en `ds-audit.config.json` (gemelo TR-02, solo el número puede diferir) y
 * SOLO baja, nunca sube. No mide "cero diferencias" a propósito — durante una
 * migración en curso las primitivas cambian el tamaño de caja de forma medida y
 * documentada (`docs/design-system.md`, tabla de convergencia); lo que este gate
 * atrapa es que la cifra no CREZCA sin que alguien la revise y, si el cambio es
 * legítimo, baje el techo a mano en el mismo PR.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

// `URL` (minúscula reservada del DOM/Node) queda tomada abajo por la variable
// del harness, así que la ruta del techo se arma con `path.join`, no con
// `new URL(...)`, para no pisar el constructor global.
const { maxDiffs: MAX_DIFFS } = JSON.parse(
  readFileSync(join(import.meta.dirname, 'ds-audit.config.json'), 'utf8'),
)

const URL = process.env.DS_AUDIT_URL ?? 'http://localhost:5174/docs/ds-audit.html'
const SHOT = process.argv[2] ?? null

const PROPS = [
  'display',
  'alignItems',
  'justifyContent',
  'gap',
  'backgroundColor',
  'backgroundImage',
  'color',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'whiteSpace',
  'cursor',
  'opacity',
  'filter',
  'maxWidth',
  'gridTemplateColumns',
  'boxShadow',
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

async function styles(pair, side) {
  return page.evaluate(
    ([p, s, props]) => {
      const el = document.querySelector(`[data-pair="${p}"] [data-side="${s}"]`)
      const cs = getComputedStyle(el)
      const o = {}
      for (const k of props) o[k] = cs[k]
      const r = el.getBoundingClientRect()
      o.__w = Math.round(r.width * 100) / 100
      o.__h = Math.round(r.height * 100) / 100
      return o
    },
    [pair, side, PROPS],
  )
}

const pairs = await page.$$eval('[data-pair]', (els) => els.map((e) => e.dataset.pair))
const report = []

for (const pair of pairs) {
  const a = await styles(pair, 'a')
  const b = await styles(pair, 'b')
  const diffs = []
  for (const k of [...PROPS, '__w', '__h']) {
    if (String(a[k]) !== String(b[k])) diffs.push({ prop: k, original: a[k], primitiva: b[k] })
  }
  report.push({ pair, state: 'base', diffs })
}

// Estado hover de los botones. Se espera a que la transición (120ms) termine:
// leer antes devuelve el valor interpolado, no el final.
for (const pair of pairs.filter((p) => p.includes('btn') || p.includes('cta'))) {
  if (pair.includes('disabled')) continue
  await page.hover(`[data-pair="${pair}"] [data-side="a"]`)
  await page.waitForTimeout(400)
  const a = await styles(pair, 'a')
  await page.hover(`[data-pair="${pair}"] [data-side="b"]`)
  await page.waitForTimeout(400)
  const b = await styles(pair, 'b')
  await page.mouse.move(0, 0)
  const diffs = []
  for (const k of ['backgroundColor', 'backgroundImage', 'filter', 'borderTopColor', 'color']) {
    if (String(a[k]) !== String(b[k])) diffs.push({ prop: k, original: a[k], primitiva: b[k] })
  }
  report.push({ pair, state: 'hover', diffs })
}

let total = 0
for (const r of report) {
  if (!r.diffs.length) {
    console.log(`OK   ${r.pair} [${r.state}] — idéntico`)
    continue
  }
  total += r.diffs.length
  console.log(`DIFF ${r.pair} [${r.state}] — ${r.diffs.length} propiedad(es)`)
  for (const d of r.diffs) console.log(`       ${d.prop}: "${d.original}"  →  "${d.primitiva}"`)
}
console.log(`\n=== total de diferencias: ${total} (techo ${MAX_DIFFS}) ===`)

if (SHOT) await page.screenshot({ path: SHOT, fullPage: true })
await browser.close()

// ── Veredicto ────────────────────────────────────────────────────────
// Trinquete, no "cero": ver la nota de cabecera. Si esta tanda quedó con MÁS
// diferencias que el techo, algo divergió sin revisión; si quedó con menos,
// baja el techo en `ds-audit.config.json` en el mismo PR que lo mejoró.
if (total > MAX_DIFFS) {
  console.error(
    `\nEl total de diferencias (${total}) supera el techo (${MAX_DIFFS}). Revisa los pares ` +
      `DIFF de arriba: si el cambio de aspecto es intencional, documéntalo en ` +
      `docs/design-system.md y baja el techo a ${total}; si no lo es, es una regresión.`,
  )
  process.exit(1)
}

console.log(`Techo respetado (trinquete: solo baja).`)
