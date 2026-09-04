#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Las plantillas de `emails/` no las mira ningún otro gate.
 *
 * `lint:strict` corre sobre `src visual tests e2e`, `stylelint:strict` sobre
 * `src/**`, y `typecheck` es `vue-tsc`: ninguno alcanza este directorio. El único
 * eslabón de `quality` que lo tocaba era `prettier --check`, al que el color le da
 * igual. Con ese hueco las cuatro plantillas derivaron a una tercera paleta de 20
 * colores —ni la del kit ni la de `tokens.css`— y `quality` siguió en verde
 * durante meses. El correo es la primera superficie del producto que ve un
 * superadministrador nuevo y la única que no puede comparar con nada, porque
 * llega a su bandeja y no a la aplicación.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EMAILS = path.join(ROOT, 'emails')

/**
 * Los nueve colores que el kit de marca declara como suyos, verbatim de
 * `veterinary-brand-kit/07_DESIGN_TOKENS/colors.csv`. Se copian aquí en vez de
 * leerse del kit porque el kit no se versiona en este repositorio: derivarlo en
 * tiempo de ejecución dejaría el gate verde en CI, donde ese directorio no
 * existe, que es justo donde tiene que morder.
 */
const PALETA = new Map([
  ['#f5f3ff', 'background'],
  ['#ffffff', 'surface'],
  ['#0f172a', 'navy'],
  ['#4f46e5', 'indigo'],
  ['#6d28d9', 'violet'],
  ['#14b8a6', 'teal'],
  ['#f43f5e', 'coral'],
  ['#475569', 'text_secondary'],
  ['#e2e8f0', 'border'],
])

/** `#abc` → `#aabbcc`; `rgb(1, 2, 3)` / `rgba(1, 2, 3, .4)` → `#010203`. */
function aHex(literal) {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(literal)
  if (hex) {
    const d = hex[1].toLowerCase()
    if (d.length === 3 || d.length === 4) return '#' + [...d.slice(0, 3)].map((c) => c + c).join('')
    return '#' + d.slice(0, 6)
  }
  const canales = /^rgba?\(([^)]*)\)$/i.exec(literal)?.[1]
  if (!canales) return null
  const [r, g, b] = canales
    .split(/[\s,/]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(Number)
  if ([r, g, b].some((n) => !Number.isFinite(n))) return null
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
}

/**
 * El `(?<!&)` descarta las referencias numéricas de carácter: una plantilla que
 * maquete con `&#8199;` (espacio de figura, que Outlook no colapsa como sí hace
 * con los normales) vería cada una leída como el hex de cuatro dígitos `#8199`.
 */
const COLOR = /(?<!&)#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g

const plantillas = readdirSync(EMAILS).filter((f) => f.endsWith('.html'))
if (plantillas.length === 0) {
  console.error('email:palette — no hay ninguna plantilla en emails/. ¿Se movió el directorio?')
  process.exit(1)
}

const fuera = []
const usados = new Set()

for (const nombre of plantillas) {
  const lineas = readFileSync(path.join(EMAILS, nombre), 'utf8').split(/\r?\n/)
  lineas.forEach((linea, i) => {
    for (const literal of linea.match(COLOR) ?? []) {
      const hex = aHex(literal)
      if (hex === null) continue
      if (PALETA.has(hex)) usados.add(hex)
      else fuera.push({ archivo: `emails/${nombre}`, linea: i + 1, literal, hex })
    }
  })
}

if (fuera.length > 0) {
  console.error(`\nemail:palette — ${fuera.length} color(es) fuera de la paleta de marca:\n`)
  for (const c of fuera) {
    console.error(`  ${c.archivo}:${c.linea}  ${c.literal}  →  ${c.hex}`)
  }
  console.error('\nPaleta permitida:')
  for (const [hex, token] of PALETA) console.error(`  ${hex}  ${token}`)
  console.error('')
  process.exit(1)
}

console.log(
  `email:palette — ${plantillas.length} plantillas, ${usados.size} colores, todos de la paleta de marca.`,
)
