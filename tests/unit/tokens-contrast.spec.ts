import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Guarda de A11Y-01 — contraste de los anillos de foco.
 *
 * `.ds-btn` hace `outline: none`, así que `--ring` / `--ring-danger` son el
 * ÚNICO indicador de foco visible del sistema. Antes de la auditoría usaban
 * `--amatista-50` y `--danger-200`: 1,06:1 y 1,29:1 sobre la superficie. Un
 * usuario de teclado no podía ver dónde estaba. WCAG 2.2 §2.4.7 Focus Visible
 * (AA) obliga a que haya un indicador de foco visible, y §1.4.11 Non-text
 * Contrast (AA) es el que fija el 3:1 que se mide aquí. (§2.4.13 Focus
 * Appearance, que además detalla tamaño y forma del indicador, es AAA: no es
 * el nivel al que se compromete el producto y no es lo que guarda esta prueba.)
 *
 * El problema es que la regresión es INVISIBLE en revisión: los tokens son
 * OKLCH y nadie mira `oklch(97% 0.015 300)` y concluye "eso no se ve". Por eso
 * esta prueba no compara cadenas: extrae el color que el anillo referencia, lo
 * convierte OKLCH → sRGB y calcula el contraste con la fórmula de luminancia
 * relativa de WCAG 2.x. Cambiar el token a cualquier otro que no llegue a 3:1
 * —volver a `--amatista-50` o inventar uno nuevo— falla aquí.
 *
 * Sin dependencias nuevas: la conversión vive en este archivo.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')
const CSS = readFileSync(path.join(ROOT, 'src/assets/styles/tokens.css'), 'utf8')

/** Umbral de WCAG 2.2 §1.4.11 Non-text Contrast (AA) para indicadores no textuales. */
const MIN_CONTRAST = 3

// --------------------------------------------------------------------------
// Lectura de tokens
// --------------------------------------------------------------------------

/** Declaraciones `--x: valor` del bloque `:root` de tokens.css. */
function parseRootTokens(css: string): Map<string, string> {
  const open = css.indexOf(':root {')
  if (open === -1) throw new Error('tokens.css no declara un bloque :root')
  const close = css.indexOf('\n}', open)
  const block = css.slice(open, close)

  const tokens = new Map<string, string>()
  // `[^;]` cruza saltos de línea a propósito: hay valores multilínea.
  for (const [, name, value] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]*);/gi)) {
    tokens.set(name, value.trim().replace(/\s+/g, ' '))
  }
  return tokens
}

const tokens = parseRootTokens(CSS)

function tokenValue(name: string): string {
  const value = tokens.get(name)
  if (value === undefined) throw new Error(`${name} no está declarado en :root`)
  return value
}

/** Sustituye `var(--x)` por su valor, recursivamente. */
function resolveVars(value: string, seen: ReadonlySet<string> = new Set()): string {
  return value.replace(/var\(\s*(--[a-z0-9-]+)\s*\)/gi, (_match, name: string) => {
    if (seen.has(name)) throw new Error(`referencia circular en ${name}`)
    return resolveVars(tokenValue(name), new Set(seen).add(name))
  })
}

/** Nombres de token que referencia un valor, en orden de aparición. */
function referencedTokens(value: string): string[] {
  return Array.from(value.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi), (m) => m[1])
}

// --------------------------------------------------------------------------
// OKLCH → sRGB → luminancia relativa (WCAG 2.x)
// --------------------------------------------------------------------------

interface Oklch {
  l: number
  c: number
  h: number
}

/** `oklch(58% 0.18 300)` → `{ l: 0.58, c: 0.18, h: 300 }`. */
function parseOklch(value: string): Oklch {
  const match = /^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/)]+)\s*\)$/i.exec(value.trim())
  if (!match) throw new Error(`no se reconoce como OKLCH sin alfa: "${value}"`)

  const component = (raw: string, allowPercent: boolean): number => {
    // Solo se aceptan número puro, `%` y `deg`. Un `rad`/`turn` revienta aquí
    // en vez de convertirse mal en silencio y dar un contraste inventado.
    const parsed = /^(-?[\d.]+)(%|deg)?$/.exec(raw)
    if (!parsed) throw new Error(`componente OKLCH no soportado: "${raw}" en "${value}"`)
    const n = Number(parsed[1])
    if (parsed[2] === '%') {
      if (!allowPercent) throw new Error(`porcentaje inesperado en "${raw}" de "${value}"`)
      return n / 100
    }
    return n
  }

  return {
    l: component(match[1], true),
    c: component(match[2], false),
    h: component(match[3], false),
  }
}

/** OKLCH → sRGB lineal. Matrices de la especificación CSS Color 4. */
function oklchToLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)

  const lCone = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mCone = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sCone = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone,
    -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone,
    -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone,
  ]
}

/**
 * Luminancia relativa (WCAG 2.x). El recorte a [0, 1] es el mismo que hace el
 * navegador al pintar un OKLCH fuera del gamut sRGB, así que la cifra
 * corresponde a lo que realmente se ve en pantalla.
 */
function relativeLuminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(color).map((channel) => Math.min(1, Math.max(0, channel)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contraste WCAG 2.x entre dos luminancias relativas. */
function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const WHITE_LUMINANCE = 1

/** Contraste de un token de color contra una luminancia de fondo. */
function contrastOf(tokenName: string, backgroundLuminance: number): number {
  const color = parseOklch(resolveVars(tokenValue(tokenName)))
  return contrastRatio(relativeLuminance(color), backgroundLuminance)
}

const surfaceLuminance = relativeLuminance(parseOklch(resolveVars(tokenValue('--warm-50'))))

// --------------------------------------------------------------------------
// Pruebas
// --------------------------------------------------------------------------

/**
 * Los dos anillos y el color que cada uno tenía ANTES del arreglo. El par
 * "antes" no decora: abajo se comprueba que esta misma fórmula reprueba los
 * valores que la auditoría midió como insuficientes. Sin eso, un conversor
 * roto que devolviera siempre contraste alto dejaría pasar cualquier cosa.
 */
const RINGS = [
  { ring: '--ring', antes: '--amatista-50', contrasteAntes: 1.06 },
  { ring: '--ring-danger', antes: '--danger-200', contrasteAntes: 1.29 },
] as const

describe('anillos de foco (A11Y-01 / WCAG 2.2 §2.4.7 + §1.4.11, AA)', () => {
  it.each(RINGS)('$ring contrasta 3:1 o más con la superficie y con blanco', ({ ring }) => {
    const layers = referencedTokens(tokenValue(ring))
    // La capa visible es la exterior: la última referencia del box-shadow.
    const colorToken = layers.at(-1)
    expect(colorToken, `${ring} no referencia ningún token de color`).toBeDefined()

    const sobreSuperficie = contrastOf(colorToken as string, surfaceLuminance)
    const sobreBlanco = contrastOf(colorToken as string, WHITE_LUMINANCE)

    expect(
      sobreSuperficie,
      `${ring} usa ${colorToken}: ${sobreSuperficie.toFixed(2)}:1 sobre --warm-50`,
    ).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(
      sobreBlanco,
      `${ring} usa ${colorToken}: ${sobreBlanco.toFixed(2)}:1 sobre blanco`,
    ).toBeGreaterThanOrEqual(MIN_CONTRAST)
  })

  it.each(RINGS)('$ring ya no usa $antes', ({ ring, antes }) => {
    // Guarda literal del regreso más probable: alguien "restaura" el color
    // suave porque le parece más bonito y se lleva por delante el foco.
    expect(referencedTokens(tokenValue(ring))).not.toContain(antes)
  })

  it.each(RINGS)('$ring apoya el color sobre una capa de superficie', ({ ring }) => {
    // El anillo es de dos capas por diseño: la interior repite `--warm-50`
    // para despegar el color del borde del propio control. Sin ella, el anillo
    // de un botón primario queda color sobre color y el 3:1 medido arriba deja
    // de describir lo que se ve.
    const layers = referencedTokens(tokenValue(ring))
    expect(layers.length, `${ring} debería declarar dos capas`).toBeGreaterThanOrEqual(2)
    expect(layers[0]).toBe('--warm-50')
  })
})

describe('la fórmula de contraste', () => {
  it.each(RINGS)(
    'reprueba $antes, el color que $ring tenía antes de la auditoría',
    ({ antes, contrasteAntes }) => {
      const medido = contrastOf(antes, surfaceLuminance)
      expect(medido).toBeLessThan(MIN_CONTRAST)
      expect(medido).toBeCloseTo(contrasteAntes, 2)
    },
  )

  it('reproduce los pares de referencia de WCAG', () => {
    // Negro sobre blanco son exactamente 21:1; blanco sobre blanco, 1:1. Si la
    // conversión OKLCH → sRGB se rompe, estos dos dejan de cuadrar.
    const negro = relativeLuminance(parseOklch('oklch(0% 0 0)'))
    const blanco = relativeLuminance(parseOklch('oklch(100% 0 0)'))
    expect(contrastRatio(negro, blanco)).toBeCloseTo(21, 5)
    expect(contrastRatio(blanco, blanco)).toBeCloseTo(1, 10)
  })
})
