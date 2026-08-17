/**
 * Presupuesto de CSS del front (hallazgo FE-08).
 *
 * FE-08 —«más CSS que lógica en el front operativo»— reaparecía corte tras corte
 * porque nada en el `build` medía su propia métrica: se retiraba CSS a mano, se
 * anotaba la cifra en un informe, y a las dos semanas la cifra había vuelto a
 * subir sin que ningún gate se enterase. Este script es esa puerta.
 *
 * Mide tres cosas sobre los SFC de `src/` y falla si alguna empeora respecto al
 * techo escrito abajo:
 *
 *   1. `<style>` no puede pesar más que `<script>`. Es el enunciado literal del
 *      hallazgo, convertido en aserción.
 *   2. Ningún cuerpo de regla CSS puede repetirse, idéntico, en más de
 *      `MAX_DUPLICATE_BODIES` componentes distintos. Lo que se copia en veinte
 *      sitios es una primitiva que falta en `primitives.css`.
 *   3. Ningún SFC puede pasar de `MAX_SFC_LINES` líneas.
 *
 * Los techos son un trinquete: se bajan cuando una tanda de retirada los mejora,
 * nunca se suben. Si este script te bloquea, la salida indica el fichero y la
 * regla concreta — la salida no es subir el número.
 *
 * Uso:  npm run css:budget        (forma parte de `npm run quality`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')

// ── Techos (trinquete: solo bajan) ───────────────────────────────────
// Viven en `css-budget.config.json` y no aquí porque este script es un fichero
// gemelo TR-02: los dos fronts lo comparten byte a byte y solo difieren en los
// números, que son distintos porque los dos repos parten de sitios distintos.
const {
  /** `<style>` no puede superar a `<script>`: es el enunciado de FE-08. */
  maxStyleMinusScript: MAX_STYLE_MINUS_SCRIPT,
  /** Un mismo cuerpo repetido en más de N componentes es una primitiva que falta. */
  maxDuplicateBodies: MAX_DUPLICATE_BODIES,
  /** Cuántos grupos duplicados se toleran todavía por encima del umbral anterior. */
  maxDuplicateGroups: MAX_DUPLICATE_GROUPS,
  /** Tamaño máximo de un SFC. */
  maxSfcLines: MAX_SFC_LINES,
  /**
   * Cuántos SFC se toleran todavía por encima de ese tamaño. La regla es 500 y
   * no se negocia; lo que baja con cada tanda es el número de infractores.
   */
  maxOversizedSfc: MAX_OVERSIZED_SFC,
} = JSON.parse(
  readFileSync(fileURLToPath(new URL('css-budget.config.json', import.meta.url)), 'utf8'),
)

// ── Recorrido ────────────────────────────────────────────────────────
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith('.vue')) out.push(full)
  }
  return out
}

/**
 * Líneas dentro de los bloques `<tag ...> ... </tag>` de nivel superior,
 * EXCLUYENDO las dos líneas delimitadoras. Es el mismo criterio con el que se
 * midieron las cifras que cita el informe de auditoría, para que comparen.
 */
function blockLines(source, tag) {
  const re = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g')
  let total = 0
  for (const match of source.matchAll(re)) {
    const body = match[2]
    if (body.trim() === '') continue
    total += body.split('\n').length - 2
  }
  return Math.max(total, 0)
}

/**
 * Reglas CSS de los bloques `<style>`, con el cuerpo normalizado: sin selector,
 * declaraciones ordenadas, espacios colapsados. Dos copias de la misma pieza
 * visual colisionan aunque las hayan llamado distinto — que es justo el caso que
 * interesa detectar.
 */
function normalizedBodies(source) {
  const bodies = []
  for (const match of source.matchAll(/<style(\s[^>]*)?>([\s\S]*?)<\/style>/g)) {
    const css = match[2].replace(/\/\*[\s\S]*?\*\//g, '')
    // Recorrido con profundidad para no confundir el cierre de una `@media`
    // con el de una regla: solo interesan los bloques hoja.
    let depth = 0
    let bodyStart = -1
    for (let i = 0; i < css.length; i++) {
      const ch = css[i]
      if (ch === '{') {
        depth++
        bodyStart = i + 1
      } else if (ch === '}') {
        if (depth >= 1 && bodyStart >= 0) {
          const raw = css.slice(bodyStart, i)
          if (!raw.includes('{')) {
            const decls = raw
              .split(';')
              .map((d) => d.trim().toLowerCase().replace(/\s+/g, ' '))
              .filter(Boolean)
              .sort()
            // Una regla de una sola declaración no es una pieza de diseño: que
            // veinte componentes pinten `background: var(--warm-100)` en su
            // `:hover` es uso del token, no copia de un bloque. Solo cuentan los
            // cuerpos de dos declaraciones o más.
            if (decls.length >= 2) bodies.push(decls.join(';'))
          }
        }
        depth = Math.max(0, depth - 1)
        bodyStart = -1
      }
    }
  }
  return bodies
}

// ── Medición ─────────────────────────────────────────────────────────
const files = walk(SRC)
let styleLines = 0
let scriptLines = 0
const oversized = []
/** cuerpo normalizado → Set de ficheros que lo contienen */
const byBody = new Map()

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const rel = relative(ROOT, file).split(sep).join('/')

  styleLines += blockLines(source, 'style')
  scriptLines += blockLines(source, 'script')

  const lines = source.split('\n').length
  if (lines > MAX_SFC_LINES) oversized.push({ rel, lines })

  for (const body of new Set(normalizedBodies(source))) {
    if (!byBody.has(body)) byBody.set(body, new Set())
    byBody.get(body).add(rel)
  }
}

const duplicated = [...byBody.entries()]
  .map(([body, owners]) => ({ body, count: owners.size, owners: [...owners] }))
  .filter((g) => g.count > MAX_DUPLICATE_BODIES)
  .sort((a, b) => b.count - a.count)

// ── Veredicto ────────────────────────────────────────────────────────
const distance = styleLines - scriptLines
const failures = []

console.log(`SFC analizados            ${files.length}`)
console.log(`Líneas <style>            ${styleLines}`)
console.log(`Líneas <script>           ${scriptLines}`)
console.log(
  `Distancia style − script  ${distance > 0 ? '+' : ''}${distance} (techo ${MAX_STYLE_MINUS_SCRIPT})`,
)
console.log(
  `Cuerpos repetidos en >${MAX_DUPLICATE_BODIES} componentes  ${duplicated.length} (techo ${MAX_DUPLICATE_GROUPS})`,
)
console.log(
  `SFC de más de ${MAX_SFC_LINES} líneas   ${oversized.length} (techo ${MAX_OVERSIZED_SFC})`,
)

if (distance > MAX_STYLE_MINUS_SCRIPT) {
  failures.push(
    `El CSS supera a la lógica por ${distance} líneas (techo ${MAX_STYLE_MINUS_SCRIPT}). ` +
      `Retira CSS scoped a favor de las primitivas de src/assets/styles/primitives.css.`,
  )
}

if (duplicated.length > MAX_DUPLICATE_GROUPS) {
  failures.push(
    `${duplicated.length} cuerpos de regla se repiten en más de ${MAX_DUPLICATE_BODIES} componentes ` +
      `(techo ${MAX_DUPLICATE_GROUPS}). Cada uno es una primitiva que falta:`,
  )
  for (const group of duplicated.slice(0, 10)) {
    failures.push(`    · en ${group.count} componentes: {${group.body}}`)
    failures.push(`      p. ej. ${group.owners.slice(0, 3).join(', ')}`)
  }
  if (duplicated.length > 10) failures.push(`    · … y ${duplicated.length - 10} grupos más`)
}

if (oversized.length > MAX_OVERSIZED_SFC) {
  failures.push(
    `${oversized.length} SFC pasan de ${MAX_SFC_LINES} líneas (techo ${MAX_OVERSIZED_SFC}):`,
  )
  for (const file of oversized.sort((a, b) => b.lines - a.lines)) {
    failures.push(`    · ${file.rel} (${file.lines} L)`)
  }
}

if (failures.length > 0) {
  console.error('\nFE-08 · presupuesto de CSS excedido\n')
  for (const line of failures) console.error(line)
  process.exit(1)
}

console.log('\nFE-08 · presupuesto de CSS respetado')
