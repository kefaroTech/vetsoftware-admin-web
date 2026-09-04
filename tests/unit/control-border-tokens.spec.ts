import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'

/**
 * Guarda de regresión — bordes de control por debajo de 3:1 (A11Y-09 / WCAG
 * 2.2 §1.4.11).
 *
 * La auditoría A11Y-09 subió 21 bordes de control a 3:1 o más, pero nada
 * ataba ese resultado al código: un borde de `.editbtn` podía volver a
 * `--warm-300` "porque se ve más limpio" y ningún gate se enteraría. Esta
 * guarda no recalcula contraste (`tokens-contrast.spec.ts` ya lo hace sobre
 * los tokens): es más barata y más simple — solo exige que un borde/outline
 * de un control o un estado consuma uno de los escalones que esa auditoría ya
 * verificó, y rechaza cualquier otro token o cualquier color escrito a mano.
 *
 * "Control" y "estado" se leen del propio selector, no del árbol de render:
 * un elemento `button`, una clase que contenga `btn`, `[role="button"]`, o
 * cualquiera de `:hover`/`:focus`/`:focus-visible`/`:focus-within`/`.active`/
 * `.open`/`.selected`/`.on`. Deliberadamente amplio — `.editbtn` no tiene
 * guion antes de `btn` y aun así es exactamente el caso que esta guarda
 * existe para atrapar.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, 'src')

/**
 * Escalones que la auditoría A11Y-09 verificó en 3:1 o más (ver
 * `tokens.css`). El invariante de las rampas `--warm-*`/`--amatista-*` es que
 * un número mayor siempre oscurece, así que todo lo que sea igual o superior
 * a estos dos pisos también cumple.
 */
const ALLOWED_BORDER_TOKENS = new Set([
  '--warm-450',
  '--warm-500',
  '--warm-600',
  '--warm-700',
  '--warm-800',
  '--warm-900',
  '--amatista-450',
  '--amatista-500',
  '--amatista-600',
  '--amatista-700',
  '--amatista-800',
  '--amatista-900',
  '--danger-border',
  '--warning-border',
  '--info-border',
  '--success-border',
])

/** Contenedores decorativos ya verificados uno a uno — no bordes de control. */
const ALLOWLIST: readonly { file: string; selector: string; reason: string }[] = [
  {
    file: 'src/features/dashboard/views/DashboardView.vue',
    selector: '.cta-secondary:hover',
    reason:
      'El borde va sobre el hero del panel (`linear-gradient(135deg, var(--amatista-700), var(--amatista-800))`), no sobre una superficie clara: la lista blanca está calibrada contra `--warm-50` y aquí `--warm-50` ES el borde. Mide 8,68:1 y 12,76:1 contra las dos paradas opacas del hero, y 6,66:1 / 4,83:1 contra la cara interior, donde el velo del `:hover` (`--overlay-light-10`) aclara el fondo — los dos últimos son el mismo píxel compuesto en espacio gamma y en espacio lineal, los dos modelos que el repo tiene vivos (public-web#334). El peor de los cuatro números, con cualquiera de los dos modelos, deja +1,83 sobre el 3:1 de §1.4.11.',
  },
]

const BTN_RE = /btn/i
const BUTTON_ELEMENT_RE = /(^|[^a-z0-9_])button([^a-z0-9_-]|$)/i
const ROLE_BUTTON_RE = /\[role\s*=\s*["']?button["']?]/i
const STATE_RE = /:hover\b|:focus(-visible|-within)?\b|\.active\b|\.open\b|\.selected\b|\.on\b/i

function isControlOrStateSelector(selector: string): boolean {
  return (
    BTN_RE.test(selector) ||
    BUTTON_ELEMENT_RE.test(selector) ||
    ROLE_BUTTON_RE.test(selector) ||
    STATE_RE.test(selector)
  )
}

const BORDER_PROP_RE =
  /^(border|border-(top|right|bottom|left)(-color)?|border-color|outline|outline-color)$/i
const RAW_COLOR_RE = /oklch\(|#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i

interface Violation {
  file: string
  selector: string
  prop: string
  value: string
  token: string
}

/** Cuerpo de la guarda: recorre las reglas de un bloque CSS ya extraído. */
function scanCss(css: string, file: string, out: Violation[]): void {
  const root = postcss.parse(css)
  root.walkRules((rule) => {
    const selectors = rule.selector.split(',').map((s) => s.trim())
    if (!selectors.some(isControlOrStateSelector)) return

    rule.walkDecls((decl) => {
      if (!BORDER_PROP_RE.test(decl.prop)) return
      const value = decl.value
      // Se comprueba el literal ANTES que las variables: `oklch(80% 0.06
      // var(--hue) / 30%)` contiene un `var()`, pero de un componente de tono,
      // no del color completo — es un color escrito a mano igual que si el
      // `var(--hue)` no estuviera. Quitar las llamadas a `var()` antes de
      // buscar `oklch(`/hex/rgb/hsl es lo que distingue ambos casos.
      const withoutVarCalls = value.replace(/var\([^)]*\)/g, '')

      if (RAW_COLOR_RE.test(withoutVarCalls)) {
        out.push({ file, selector: rule.selector, prop: decl.prop, value, token: '(literal)' })
        return
      }

      const vars = [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1] as string)
      for (const token of vars) {
        if (!ALLOWED_BORDER_TOKENS.has(token)) {
          out.push({ file, selector: rule.selector, prop: decl.prop, value, token })
        }
      }
    })
  })
}

/** Bloques `<style>` de nivel superior de un SFC, anclados a inicio de línea. */
function extractStyleBlocks(source: string): string[] {
  return [...source.matchAll(/^<style(\s[^>]*)?>([\s\S]*?)^<\/style>/gm)].map((m) => m[2] as string)
}

function walk(dir: string, ext: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, ext, out)
    else if (entry.endsWith(ext)) out.push(full)
  }
  return out
}

function collectViolations(): Violation[] {
  const out: Violation[] = []

  for (const file of walk(SRC, '.vue')) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    const source = readFileSync(file, 'utf8')
    for (const block of extractStyleBlocks(source)) scanCss(block, rel, out)
  }

  const stylesDir = path.join(SRC, 'assets', 'styles')
  for (const file of walk(stylesDir, '.css')) {
    if (file.endsWith('tokens.css')) continue // solo declara custom properties, ningún selector
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    scanCss(readFileSync(file, 'utf8'), rel, out)
  }

  return out
}

function isAllowlisted(v: Violation): boolean {
  return ALLOWLIST.some((a) => a.file === v.file && a.selector === v.selector)
}

describe('bordes de control — contraste 3:1 (A11Y-09 / WCAG 2.2 §1.4.11, AA)', () => {
  it('todo border/border-color/outline de un control o un estado usa un token de la lista blanca', () => {
    const violations = collectViolations().filter((v) => !isAllowlisted(v))
    const detail = violations
      .map((v) => `${v.file} :: ${v.selector} :: ${v.prop}: ${v.value}`)
      .join('\n')
    expect(violations, violations.length > 0 ? `\n${detail}` : undefined).toEqual([])
  })
})

describe('la guarda muerde de verdad (fixtures sintéticas)', () => {
  it('rechaza un escalón claro en el borde de un control', () => {
    const found: Violation[] = []
    scanCss('.editbtn { border: 1px solid var(--warm-300); }', '(fixture)', found)
    expect(found).toHaveLength(1)
    expect(found[0]?.token).toBe('--warm-300')
  })

  it('rechaza un escalón claro en el borde de un estado', () => {
    const found: Violation[] = []
    scanCss('.card:hover { border-color: var(--amatista-300); }', '(fixture)', found)
    expect(found).toHaveLength(1)
    expect(found[0]?.token).toBe('--amatista-300')
  })

  it('rechaza un oklch()/hex escrito a mano', () => {
    const found: Violation[] = []
    scanCss('button.active { outline: 2px solid oklch(70% 0.1 30deg); }', '(fixture)', found)
    expect(found).toHaveLength(1)
    expect(found[0]?.token).toBe('(literal)')
  })

  it('acepta un token de la lista blanca', () => {
    const found: Violation[] = []
    scanCss(
      '.ds-icon-btn:focus-visible { outline: 2px solid var(--amatista-500); }',
      '(fixture)',
      found,
    )
    expect(found).toHaveLength(0)
  })

  it('ignora un selector que no denota ni control ni estado', () => {
    const found: Violation[] = []
    scanCss('.card { border: 1px solid var(--warm-200); }', '(fixture)', found)
    expect(found).toHaveLength(0)
  })
})
