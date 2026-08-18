/**
 * Regla propia `vetsoftware/no-duplicate-primitive` (FE-08, fase final).
 *
 * `scripts/css-budget.mjs` mide el AGREGADO — falla cuando un cuerpo de regla
 * ya se repitió en varios componentes — pero eso siempre se descubre después,
 * en una auditoría, con el CSS ya escrito varias veces. Esta regla mueve la
 * misma comprobación al momento de escribir el código: rechaza cualquier
 * bloque `<style>` de un SFC cuyo cuerpo normalizado (declaraciones
 * ordenadas, sin selector) sea idéntico al de una clase que YA existe en
 * `src/assets/styles/primitives.css`, y nombra la primitiva que debería
 * usarse en su lugar. Se ejecuta en el pre-commit de cada desarrollador
 * (`lint-staged.config.mjs`) y otra vez en `stylelint:strict` dentro de
 * `npm run quality`.
 *
 * Deliberadamente MÁS estricta que el presupuesto: aquí basta una sola
 * reescritura (el presupuesto exige que se repita en varios componentes).
 * Es el equivalente en front de las reglas de ArchUnit que cerraron BE-21 y
 * BE-29 — la comprobación vive en el sitio donde se puede prevenir, no sólo
 * donde se puede medir.
 *
 * Mismo criterio que `css-budget.mjs` para qué cuenta como "cuerpo": sólo
 * los de DOS declaraciones o más. Que un componente pinte
 * `background: var(--warm-100)` suelto en su `:hover` es uso de un token,
 * no la copia de una pieza de diseño — igual que el presupuesto lo ignora,
 * esta regla también.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import stylelint from 'stylelint'

const ruleName = 'vetsoftware/no-duplicate-primitive'
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (selector, primitive) =>
    `«${selector}» repite el cuerpo de la primitiva ${primitive} (src/assets/styles/primitives.css). ` +
    `Aplica esa clase desde el template en vez de reescribir sus declaraciones.`,
})

const PRIMITIVES_PATH = fileURLToPath(
  new URL('../src/assets/styles/primitives.css', import.meta.url),
)

/** Ficheros que nunca pueden reescribir una primitiva: son la propia capa 1/2. */
const EXEMPT = /(?:^|\/)(?:primitives|tokens)\.css$/

/**
 * Cuerpo normalizado de una regla: declaraciones en minúscula, con los
 * espacios colapsados, ordenadas alfabéticamente y unidas — así dos copias
 * de la misma pieza visual colisionan aunque las hayan nombrado distinto, y
 * el orden en que se escribieron las declaraciones no importa. Sólo cuentan
 * los cuerpos de dos declaraciones o más (ver el comentario de cabecera).
 */
function normalize(rule) {
  const decls = []
  rule.each((node) => {
    if (node.type === 'decl') {
      decls.push(
        `${node.prop.toLowerCase()}:${node.value.toLowerCase().replace(/\s+/g, ' ').trim()}`,
      )
    }
  })
  return decls.length >= 2 ? decls.sort().join(';') : null
}

/** El primer selector de una lista (`.a, .b` → `.a`), sólo para el mensaje. */
function firstSelector(selector) {
  return selector.split(',')[0].trim()
}

let primitivesIndexCache = null

/**
 * cuerpo normalizado → primer selector que lo declara en `primitives.css`.
 * Se calcula una sola vez por proceso de `stylelint` (memoizado a nivel de
 * módulo): el fichero no cambia mientras dura un lint.
 */
function primitivesIndex() {
  if (primitivesIndexCache) return primitivesIndexCache
  const root = postcss.parse(readFileSync(PRIMITIVES_PATH, 'utf8'))
  const index = new Map()
  root.walkRules((rule) => {
    const body = normalize(rule)
    if (body && !index.has(body)) index.set(body, firstSelector(rule.selector))
  })
  primitivesIndexCache = index
  return index
}

const ruleFunction = (primary, _secondaryOptions, context) => (root, result) => {
  if (!primary) return
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true],
  })
  if (!validOptions) return

  const file = (root.source?.input?.file ?? '').replaceAll('\\', '/')
  if (EXEMPT.test(file)) return

  const index = primitivesIndex()

  root.walkRules((rule) => {
    const body = normalize(rule)
    if (!body) return

    const primitive = index.get(body)
    if (!primitive) return

    if (context?.fix) return // No hay arreglo automático seguro: requiere tocar el template.

    stylelint.utils.report({
      message: messages.rejected(firstSelector(rule.selector), primitive),
      node: rule,
      result,
      ruleName,
    })
  })
}

ruleFunction.ruleName = ruleName
ruleFunction.messages = messages

export default stylelint.createPlugin(ruleName, ruleFunction)
