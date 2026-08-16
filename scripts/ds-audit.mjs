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
 */
import { chromium } from 'playwright'

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
console.log(`\n=== total de diferencias: ${total} ===`)

if (SHOT) await page.screenshot({ path: SHOT, fullPage: true })
await browser.close()
