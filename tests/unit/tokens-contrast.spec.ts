import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Guarda de A11Y-01 — contraste de los anillos de foco.
 *
 * `.ds-btn` hace `outline: none`, así que `--ring` / `--ring-danger` son el
 * ÚNICO indicador de foco visible del sistema. Antes de la auditoría usaban
 * `--amatista-50` y `--danger-200`: 1,06:1 y 1,25:1 sobre la superficie. Un
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

/**
 * `primitives.css` sin comentarios. Se despoja a propósito: los comentarios de
 * ese archivo citan literalmente los valores que la auditoría RETIRÓ —
 * `var(--danger-200)` aparece escrito dentro de la explicación de
 * `.ds-field-invalid-focus`—, así que buscar sobre el texto crudo daría por
 * presente lo que solo está documentado como ausente.
 */
const PRIMITIVES = readFileSync(
  path.join(ROOT, 'src/assets/styles/primitives.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '')

/** Umbral de WCAG 2.2 §1.4.11 Non-text Contrast (AA) para indicadores no textuales. */
const MIN_CONTRAST = 3

/**
 * Umbral de WCAG 2.2 §1.4.3 Contrast (Minimum) (AA) para texto normal. El texto
 * secundario del sistema mide 11,5–12px, así que no entra por ningún lado en la
 * excepción de "texto grande" (18,5px, o 14px en negrita) que rebajaría la
 * exigencia a 3:1. Le aplica éste.
 */
const MIN_TEXT_CONTRAST = 4.5

// --------------------------------------------------------------------------
// Lectura de tokens
// --------------------------------------------------------------------------

/** Declaraciones `--x: valor` del bloque `:root` de tokens.css. */
function parseRootTokens(css: string): Map<string, string> {
  const open = css.indexOf(':root {')
  if (open === -1) throw new Error('tokens.css no declara un bloque :root')
  const close = css.indexOf('\n}', open)
  // Sin este despojo, un `--danger:` citado dentro de un comentario (p. ej. el
  // que menciona `.ds-icon-btn--danger:hover`) se lee como declaración: el
  // regex de abajo consume hasta el siguiente `;`, que es el de la
  // declaración real siguiente, y esa se pierde del mapa.
  const block = css.slice(open, close).replace(/\/\*[\s\S]*?\*\//g, '')

  const tokens = new Map<string, string>()
  // `[^;]` cruza saltos de línea a propósito: hay valores multilínea.
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]*);/gi)) {
    const name = match[1]
    const value = match[2]
    if (name === undefined || value === undefined) continue
    tokens.set(name, value.trim().replace(/\s+/g, ' '))
  }
  return tokens
}

const tokens = parseRootTokens(CSS)

describe('el parseo de tokens.css', () => {
  it('el mapa de tokens contiene todos los `--*-border` que tokens.css declara', () => {
    // Enumeración independiente de `parseRootTokens`: si el parser vuelve a
    // tragarse una declaración, esto falla con el nombre exacto en vez de
    // fallar más tarde con "no está declarado en :root" en otro punto.
    const declarados = new Set(
      Array.from(CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[a-z0-9-]+-border)\s*:/gi)).map(
        (m) => m[1] as string,
      ),
    )
    expect(declarados.size).toBeGreaterThan(0)
    for (const name of declarados) {
      expect(
        tokens.has(name),
        `${name} se declara en tokens.css pero no está en el mapa parseado`,
      ).toBe(true)
    }
  })
})

/**
 * Cuerpo de una regla de primer nivel de `primitives.css`, por selector exacto.
 * El anclaje a inicio de línea es lo que impide que `.ds-meta` se lleve por
 * delante a `.ds-meta--sm` o a `.ds-meta-dark`, que comparten prefijo pero son
 * OTRAS bases con otro color.
 */
function ruleBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(PRIMITIVES)
  if (match === null) throw new Error(`primitives.css no declara la regla ${selector}`)
  const cuerpo = match[1]
  if (cuerpo === undefined)
    throw new Error(`primitives.css: la regla ${selector} no capturó cuerpo`)
  return cuerpo
}

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
  return Array.from(value.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi))
    .map((m) => m[1])
    .filter((name): name is string => name !== undefined)
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
  const [lRaw, cRaw, hRaw] = [match[1], match[2], match[3]]
  if (lRaw === undefined || cRaw === undefined || hRaw === undefined) {
    throw new Error(`OKLCH sin los tres componentes: "${value}"`)
  }

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
    l: component(lRaw, true),
    c: component(cRaw, false),
    h: component(hRaw, false),
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

/** sRGB lineal → sRGB con gamma (CSS Color 4 §7.2, IEC 61966-2-1). */
function gammaEncode(linear: number): number {
  return linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055
}

/** sRGB con gamma → sRGB lineal (CSS Color 4 §7.2, IEC 61966-2-1). */
function gammaDecode(encoded: number): number {
  return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4
}

/**
 * METODOLOGÍA DE REFERENCIA de este archivo: todo canal se cuantiza a 8 bits
 * (redondeo a 1/255 tras codificar a gamma) antes de calcular luminancia. El
 * navegador cuantiza igual antes de pintar, así que este es el contraste que
 * el usuario ve de verdad — sin este paso, el motor mide un contraste más
 * continuo que no corresponde a ningún píxel real, y calibra contra los
 * comentarios de `tokens.css`/`primitives.css` con hasta 0,02:1 de
 * desviación (verificado en `--amatista-450`/`--amatista-50`: 3,47 con
 * cuantización, 3,49 sin ella). Quitar este paso no rompe ningún umbral hoy
 * porque el margen sobre 3:1/4,5:1 lo absorbe, pero deja de reproducir los
 * valores documentados y el próximo barrido de contraste "corregirá" tokens
 * que ya estaban bien.
 */
function quantizeTo8Bit(encoded: number): number {
  return Math.round(encoded * 255) / 255
}

/**
 * Luminancia relativa (WCAG 2.x). El recorte a [0, 1] es el mismo que hace el
 * navegador al pintar un OKLCH fuera del gamut sRGB, así que la cifra
 * corresponde a lo que realmente se ve en pantalla.
 */
function relativeLuminance(color: Oklch): number {
  const clamp = (channel: number) => Math.min(1, Math.max(0, channel))
  const toDisplayLinear = (channel: number) =>
    gammaDecode(quantizeTo8Bit(gammaEncode(clamp(channel))))
  const [rRaw, gRaw, bRaw] = oklchToLinearSrgb(color)
  const r = toDisplayLinear(rRaw)
  const g = toDisplayLinear(gRaw)
  const b = toDisplayLinear(bRaw)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contraste WCAG 2.x entre dos luminancias relativas. */
function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const WHITE_LUMINANCE = 1

/** Contraste de un valor CSS de color (con o sin `var()`) contra un fondo. */
function contrastOfValue(value: string, backgroundLuminance: number): number {
  return contrastRatio(relativeLuminance(parseOklch(resolveVars(value))), backgroundLuminance)
}

/** Contraste de un token de color contra una luminancia de fondo. */
function contrastOf(tokenName: string, backgroundLuminance: number): number {
  return contrastOfValue(tokenValue(tokenName), backgroundLuminance)
}

/** Valor de una declaración concreta dentro de una regla de `primitives.css`. */
function declaration(selector: string, property: string): string {
  const block = ruleBlock(selector)
  // El `(?:^|;)` delante es lo que evita que `color` case con `border-color`.
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(block)
  if (match === null) throw new Error(`${selector} no declara \`${property}\``)
  const valor = match[1]
  if (valor === undefined) throw new Error(`${selector}: \`${property}\` sin grupo capturado`)
  return valor.trim().replace(/\s+/g, ' ')
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
  { ring: '--ring-danger', antes: '--danger-200', contrasteAntes: 1.25 },
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

/**
 * Las clases que pintan texto secundario con `--warm-500`. No se comprueba
 * "usan el token X": se comprueba el color que REALMENTE declaran, se resuelva
 * como se resuelva. Si mañana alguien las despega del token y les escribe un
 * `oklch()` a mano, la guarda sigue midiendo lo que el usuario ve.
 *
 * `.ds-icon-muted` entra en la lista aun siendo un icono: no es decorativo —
 * acompaña y clasifica el texto de una fila— y en cualquier caso queda por
 * encima del 3:1 de §1.4.11 por el mismo margen.
 */
const TEXTO_SECUNDARIO = ['.ds-hint', '.ds-meta', '.ds-icon-muted'] as const

describe('texto secundario (A11Y-02 / WCAG 2.2 §1.4.3, AA)', () => {
  it('--warm-500 contrasta 4,5:1 o más con la superficie y con blanco', () => {
    // El fondo real del texto secundario es uno de los dos: `--warm-50` en el
    // lienzo de la aplicación, blanco puro dentro de una `.ds-card`. El peor de
    // los dos es el que manda, y aquí se exigen los dos por separado.
    const sobreSuperficie = contrastOf('--warm-500', surfaceLuminance)
    const sobreBlanco = contrastOf('--warm-500', WHITE_LUMINANCE)

    expect(
      sobreSuperficie,
      `--warm-500: ${sobreSuperficie.toFixed(2)}:1 sobre --warm-50`,
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(
      sobreBlanco,
      `--warm-500: ${sobreBlanco.toFixed(2)}:1 sobre blanco`,
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it('--text-subtle es --warm-500, no un tono suelto', () => {
    // `--text-subtle` es el alias semántico por el que la mitad del producto
    // llega a este color. Si se despega del token, la medida de arriba deja de
    // describirlo y la guarda se queda vigilando algo que ya nadie usa.
    expect(referencedTokens(tokenValue('--text-subtle'))).toEqual(['--warm-500'])
  })

  it.each(TEXTO_SECUNDARIO)('%s contrasta 4,5:1 o más con la superficie y con blanco', (clase) => {
    const color = declaration(clase, 'color')
    const sobreSuperficie = contrastOfValue(color, surfaceLuminance)
    const sobreBlanco = contrastOfValue(color, WHITE_LUMINANCE)

    expect(
      sobreSuperficie,
      `${clase} pinta ${color}: ${sobreSuperficie.toFixed(2)}:1 sobre --warm-50`,
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(
      sobreBlanco,
      `${clase} pinta ${color}: ${sobreBlanco.toFixed(2)}:1 sobre blanco`,
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })
})

/**
 * Foco sobre un campo inválido. Es el gemelo por la puerta de al lado de
 * A11Y-01: `--ring-danger` ya estaba arreglado y medido, pero `.ds-field-
 * invalid-focus` seguía escribiendo su propio `0 0 0 3px var(--danger-200)`
 * (1,25:1) sin enterarse. El único origen admitido del anillo es el token:
 * ningún valor de sombra se declara a mano.
 *
 * En ESTA consola la clase está huérfana —ningún componente la aplica— y aun
 * así la guarda se queda: `primitives.css` es un archivo de paridad TR-02, byte
 * a byte idéntico al del front del tenant, donde sí la usan cinco componentes
 * (BaseInput, BaseSelect, BaseTextarea, OwnerSearchAutocomplete, DateInput). La
 * regresión se introduciría aquí y se sufriría allí.
 */
describe('foco sobre campo inválido (A11Y-02 / WCAG 2.2 §1.4.11, AA)', () => {
  it('hereda el anillo de --ring-danger en vez de escribirlo a mano', () => {
    expect(referencedTokens(declaration('.ds-field-invalid-focus', 'box-shadow'))).toEqual([
      '--ring-danger',
    ])
  })

  it('no vuelve a --danger-200', () => {
    // El regreso probable no es inventar un color: es volver al suave de antes.
    expect(referencedTokens(ruleBlock('.ds-field-invalid-focus'))).not.toContain('--danger-200')
  })

  it('el anillo que consume sigue en 3:1 o más', () => {
    // Consumir el token no basta si el token se degrada. Se vuelve a medir por
    // la vía que usa esta clase, no por la de `RINGS`.
    const colorToken = referencedTokens(declaration('.ds-field-invalid-focus', 'box-shadow'))
      .flatMap((ring) => referencedTokens(tokenValue(ring)))
      .at(-1)
    expect(colorToken, '.ds-field-invalid-focus no llega a ningún token de color').toBeDefined()

    expect(contrastOf(colorToken as string, surfaceLuminance)).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(contrastOf(colorToken as string, WHITE_LUMINANCE)).toBeGreaterThanOrEqual(MIN_CONTRAST)
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

  it('reprueba el --warm-500 al 58 % que había antes de A11Y-02', () => {
    // Contrapartida del test de arriba: sin esto, una fórmula rota que
    // devolviera siempre un número alto daría por bueno cualquier gris.
    const antes = contrastOfValue('oklch(58% 0.012 60deg)', surfaceLuminance)
    expect(antes).toBeLessThan(MIN_TEXT_CONTRAST)
    expect(antes).toBeCloseTo(4.17, 2)
  })

  it('reproduce los pares de referencia de WCAG', () => {
    // Negro sobre blanco son exactamente 21:1; blanco sobre blanco, 1:1. Si la
    // conversión OKLCH → sRGB se rompe, estos dos dejan de cuadrar.
    const negro = relativeLuminance(parseOklch('oklch(0% 0 0)'))
    const blanco = relativeLuminance(parseOklch('oklch(100% 0 0)'))
    expect(contrastRatio(negro, blanco)).toBeCloseTo(21, 5)
    expect(contrastRatio(blanco, blanco)).toBeCloseTo(1, 10)
  })
})
