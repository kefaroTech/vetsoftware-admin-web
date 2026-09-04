#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pertenencia a la paleta de marca — la puerta que faltaba.
 *
 * Los dos gates de color que ya existían miden CONTRASTE
 * (`tests/unit/tokens-contrast.spec.ts`, `control-border-tokens.spec.ts`): un
 * tono ajeno con 7:1 los pasa los dos. `no-duplicate-primitive` mide
 * repetición y `css:budget` mide tamaño; a ninguno le importa de qué paleta es
 * el color. Por ese hueco entra un tono ajeno sin que nada lo señale.
 *
 * Este script comprueba lo único que ninguno comprobaba: que cada color
 * declarado en `src/` pertenezca a la marca. Un color pertenece si
 *
 *   a) viaja por `var(--token)` — entonces lo responde `tokens.css`, que este
 *      mismo gate también recorre; o
 *   b) su hue en OKLCH cae a menos de TOLERANCIA_HUE de una de las nueve
 *      anclas del kit, con las dos excepciones estructurales de abajo.
 *
 * Claridad y croma quedan libres a propósito: una rampa es exactamente eso,
 * escalones de L y C sobre un mismo hue. Lo que la marca fija es el tono.
 *
 * Por qué mira dentro de los `.ts`: Stylelint no ve un `.ts`, y el color
 * también viaja en mapas `Record<string, ...>` que lo asignan por categoría,
 * por rol o por tipo de evento. Son cadenas CSS que acaban en un `:style`,
 * indistinguibles de una hoja de estilos en su efecto y a las que no llega
 * ningún gate de CSS.
 *
 * ESTE GATE NO COMPONE ALFA, y lo declara en vez de callarlo. Descarta el canal
 * alfa porque el alfa no cambia el TONO declarado, que es lo único que aquí se
 * juzga; el color que se ve, en cambio, sí depende de lo que haya debajo, y de
 * si se compone en espacio gamma o en espacio lineal — dos modelos que en este
 * repositorio conviven y que sobre el mismo píxel dan 2,85:1 y 3,12:1, o sea
 * incumplir y cumplir §1.4.11 (public-web#334). Elegir modelo es una decisión de
 * contraste, no de paleta, así que este script no la toma: cuenta cuántos de los
 * colores que mide llevan alfa y lo dice en su salida, para que ese hueco no se
 * lea como un verde. Ninguna puerta del repo mide superficies compuestas ni
 * paradas de degradado (admin-web#247).
 *
 * Uso:  npm run brand:palette      (forma parte de `npm run quality`)
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

/**
 * Los nueve colores del kit, verbatim de
 * `veterinary-brand-kit/07_DESIGN_TOKENS/colors.csv`. Se copian aquí, y no se
 * leen del kit, por la misma razón que en `email-palette-check.mjs`: el kit no
 * se versiona en este repositorio, así que derivarlo en tiempo de ejecución
 * dejaría el gate verde en CI — justo donde tiene que morder.
 */
const ANCLAS = [
  ['background', '#f5f3ff'],
  ['surface', '#ffffff'],
  ['navy', '#0f172a'],
  ['indigo', '#4f46e5'],
  ['violet', '#6d28d9'],
  ['teal', '#14b8a6'],
  ['coral', '#f43f5e'],
  ['text_secondary', '#475569'],
  ['border', '#e2e8f0'],
]

/** Grados de hue OKLCH que se toleran alrededor de un ancla. */
const TOLERANCIA_HUE = 3

/**
 * Las tres anclas neutras (border 255,5° · text_secondary 257,3° · navy
 * 265,8°) no son un punto sino un arco, y la rampa `--warm-*` lo recorre
 * interpolando hue con la claridad. Un neutro cuyo hue caiga DENTRO de ese
 * arco y cuyo croma no pase del de la más cromática de las tres es un escalón
 * de esa interpolación, no un tono nuevo: `--warm-700` (260,7°) queda entre
 * text_secondary y navy sin estar a 3° de ninguna.
 *
 * Se nombran a mano y NO se deducen por croma: `background` (#F5F3FF) también
 * es de croma bajo, y meterla estiraría el arco hasta 293,8° — con eso un azul
 * 240° de croma 0,04 entraba como «neutro interpolado» y el gate lo daba por
 * bueno.
 */
const NEUTRAS = ['border', 'text_secondary', 'navy']
const CROMA_NEUTRO_MAX = 0.045

/**
 * Ámbar 70°, la escala `--warning-*`. No es deriva: el usuario eximió los tres
 * estados de retroalimentación de la paleta de marca, y el informe de
 * semántica de color fija este hue por convención de seguridad (ISO 3864,
 * amarillo = advertencia) y por la ventana de gamut sRGB en la que un ámbar
 * cumple 3:1 por arriba y por abajo (L entre 58 % y 61 %). Error y éxito no
 * necesitan excepción: caen en coral 16,4° y en teal 182,5°, que sí son
 * anclas. Es un hue exento en todo el árbol, no la deuda de un archivo.
 *
 * El 13° es la parada oscura de `--gradient-danger`: ese mismo informe separa
 * las dos paradas del degradado también en tono, no solo en claridad, y la
 * oscura cae a 3,4° del coral — dentro de la familia de error, fuera de la
 * tolerancia por poco.
 */
const HUES_SEMANTICOS = [
  ['warning (ámbar)', 70],
  ['danger (parada oscura de --gradient-danger)', 13],
]

/**
 * Lo que hoy queda fuera de marca a sabiendas. Una entrada por hallazgo, con su
 * motivo, su issue y los sitios exactos. Un literal fuera de marca que no esté
 * aquí pone el gate en rojo; y una entrada que deje de hacer falta lo pone en
 * rojo también (ver `sobrantes`), igual que el `reportNeedlessDisables` de
 * Stylelint: una exención que ya nadie usa es una puerta abierta sin vigilar.
 *
 * Las rutas se resuelven contra la raíz del repo, y las que no existen se
 * ignoran: esta lista es un gemelo TR-02 byte a byte y cubre pantallas que
 * solo tiene uno de los dos fronts.
 */
const EXENCIONES = [
  {
    issue: 'admin-web#241',
    motivo:
      'El punto y el borde del aviso informativo son un azul 240deg que además cae fuera del gamut sRGB. El sistema no tiene rampa azul: la familia «info» es la amatista de marca, así que no hay token al que apuntar sin decidir antes si el aviso informativo cambia de color.',
    sitios: [
      {
        archivo: 'src/components/feedback/ToastStack.vue',
        colores: ['oklch(55% 0.16 240deg)'],
      },
    ],
  },
  {
    issue: 'admin-web#249 · public-web#335',
    motivo:
      'Los cinco tintes de sombra y velo se escribieron en rgb() y quedaron entre 296,8deg y 302,9deg, de 4 a 10 grados por encima del violet de marca. Son decorativos y sin umbral WCAG, pero unificarlos mueve la sombra de toda la aplicación y no cabe en una entrega de tokens.',
    sitios: [
      {
        archivo: 'src/assets/styles/tokens.css',
        colores: ['rgb(50 20 80 / 8%)', 'rgb(20 15 30 / 18%)'],
      },
      { archivo: 'src/assets/styles/primitives.css', colores: ['rgb(30 20 50 / 45%)'] },
      { archivo: 'src/components/feedback/ToastStack.vue', colores: ['rgb(20 15 30 / 18%)'] },
      {
        archivo: 'src/components/ui/ModalShell.vue',
        colores: ['rgb(20 15 30 / 55%)', 'rgb(20 15 30 / 35%)'],
      },
      { archivo: 'src/components/layout/AppSidebar.vue', colores: ['rgb(20 15 30 / 45%)'] },
      {
        archivo: 'src/components/feedback/ConsultaActiveBanner.vue',
        colores: ['rgb(20 15 30 / 28%)'],
      },
    ],
  },
  {
    issue: 'admin-web#250 · public-web#336',
    motivo:
      'El icono del modal con accent="warn" escribe el ámbar a mano en 80deg, el hue de la escala de aviso anterior, en vez de consumir `--warning-900` (70deg). ModalShell.vue es gemelo TR-02, por eso queda fuera de public-web#320, que solo cubre los componentes propios del tenant.',
    sitios: [{ archivo: 'src/components/ui/ModalShell.vue', colores: ['oklch(45% 0.13 80deg)'] }],
  },
  {
    issue: 'admin-web#251',
    motivo:
      'Las tres manchas decorativas y la sombra de la tarjeta de la pantalla pública replican en rgb() los escalones `--amatista-400`, `-450` y `-700` tal y como se pintaban con el hue 281 anterior al reanclado, así que el reanclado no las alcanzó.',
    sitios: [
      {
        archivo: 'src/components/layout/PublicLayout.vue',
        colores: [
          'rgb(137 137 248 / 25%)',
          'rgb(119 119 227 / 18%)',
          'rgb(67 57 160 / 18%)',
          'rgb(67 57 160 / 8%)',
        ],
      },
    ],
  },
  {
    issue: 'public-web#320',
    motivo:
      'Once componentes del marco autenticado del tenant escriben el tono a mano: coral en 25deg (el hue de la escala de error anterior), el ámbar y el verde de los chips en 80deg y 145deg, y el avatar por defecto en un degradado naranja→rosa que la marca no declara.',
    sitios: [
      {
        archivo: 'src/components/ui/BaseChip.vue',
        colores: [
          'oklch(94% 0.04 145deg)',
          'oklch(40% 0.1 145deg)',
          'oklch(94% 0.05 80deg)',
          'oklch(40% 0.12 80deg)',
        ],
      },
      {
        archivo: 'src/components/layout/SidebarNotifications.vue',
        colores: ['oklch(58% 0.2 25deg)'],
      },
      {
        archivo: 'src/components/layout/SidebarUserCard.vue',
        colores: [
          'oklch(78% 0.14 30deg)',
          'oklch(65% 0.16 350deg)',
          'oklch(58% 0.2 25deg / 16%)',
          'oklch(85% 0.14 25deg)',
        ],
      },
      { archivo: 'src/components/ui/BaseInput.vue', colores: ['oklch(55% 0.22 25deg)'] },
      { archivo: 'src/components/ui/DateInput.vue', colores: ['oklch(98.5% 0.02 25deg)'] },
      { archivo: 'src/components/ui/SegmentedRadio.vue', colores: ['oklch(98.5% 0.02 25deg)'] },
    ],
  },
  {
    issue: 'public-web#324',
    motivo:
      'Los mapas `estado → color` del tenant declaran azul (240-250deg), cian (200deg) y magenta (340deg) para categorías, estados de la DIAN y pastillas de compras. La marca no tiene ninguna de las tres familias y el sistema no puede darles token sin ampliar la paleta.',
    sitios: [
      {
        archivo: 'src/features/tienda/composables/categoryTone.ts',
        colores: [
          'oklch(94% 0.04 240)',
          'oklch(40% 0.15 240)',
          'oklch(94% 0.05 200)',
          'oklch(42% 0.12 200)',
          'oklch(94% 0.05 340)',
          'oklch(42% 0.15 340)',
        ],
      },
      {
        archivo: 'src/features/tienda/components/PromoStatusPill.vue',
        colores: ['oklch(94% 0.06 240)', 'oklch(45% 0.13 250)', 'oklch(58% 0.15 245)'],
      },
      {
        archivo: 'src/features/facturacion/types/facturacion.ts',
        colores: ['oklch(94% 0.04 240)', 'oklch(42% 0.14 240)', 'oklch(55% 0.16 240)'],
      },
      {
        archivo: 'src/features/facturacion/views/ReportesView.vue',
        colores: ['oklch(50% 0.16 240deg)'],
      },
      {
        archivo: 'src/features/compras/views/FacturasProveedorView.vue',
        colores: ['oklch(92% 0.07 250deg)', 'oklch(45% 0.14 250deg)'],
      },
      {
        archivo: 'src/features/compras/views/OrdenesRecepcionesView.vue',
        colores: ['oklch(92% 0.07 250deg)', 'oklch(45% 0.14 250deg)'],
      },
      {
        archivo: 'src/features/cuentas/components/AccountChargesColumn.vue',
        colores: ['oklch(45% 0.15 240deg)'],
      },
    ],
  },
  {
    issue: 'public-web#322',
    motivo:
      'La hoja de impresión del recibo se pinta para una térmica de 1 bit: el negro puro es la única tinta que la impresora tiene, y sustituirlo por el navy de marca deja los separadores y los datos fiscales por debajo del umbral de quemado del papel.',
    sitios: [{ archivo: 'src/composables/useReceiptPrint.ts', colores: ['#000'] }],
  },
]

/** Un color con alfa no se ve como se declara: depende de lo que tenga debajo. */
const TIENE_ALFA = /\/\s*[\d.]+%?\s*\)$|^#(?:[0-9a-f]{4}|[0-9a-f]{8})$|^rgba\(/

const gammaDecode = (u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4)

function rgbAOklch(r, g, b) {
  const R = gammaDecode(r / 255)
  const G = gammaDecode(g / 255)
  const B = gammaDecode(b / 255)
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  let h = (Math.atan2(bb, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { L, C: Math.hypot(a, bb), H: h }
}

function hexAOklch(hex) {
  const d = hex.slice(1).toLowerCase()
  const seis =
    d.length === 3 || d.length === 4
      ? [...d.slice(0, 3)].map((c) => c + c).join('')
      : d.length === 6 || d.length === 8
        ? d.slice(0, 6)
        : null
  if (seis === null) return null
  const n = Number.parseInt(seis, 16)
  return rgbAOklch((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

/**
 * Colores con nombre que el árbol usa hoy. `white` es el ancla `surface`; los
 * otros tres no pintan ningún tono. Los nombres cromáticos (`red`, `gold`...)
 * NO se buscan a propósito: «red» es también una palabra española y el gate
 * viviría de falsos positivos en las plantillas.
 */
const NOMBRES = new Map([
  ['white', '#ffffff'],
  ['transparent', null],
  ['currentcolor', null],
  ['inherit', null],
])

/**
 * `--hue` es la única variable que ocupa una ranura de tono en el árbol
 * (`oklch(58% 0.18 var(--hue))`, 60 sitios). Se resuelve leyéndola de
 * `tokens.css` en vez de darla por sabida: si un reanclado la mueve, este gate
 * mide el valor nuevo y no una copia envejecida.
 */
function hueDeTokens() {
  const css = readFileSync(path.join(SRC, 'assets/styles/tokens.css'), 'utf8')
  const m = /--hue:\s*([\d.]+)/.exec(css)
  if (m === null) {
    console.error('brand:palette — no encuentro `--hue` en src/assets/styles/tokens.css.')
    process.exit(1)
  }
  return Number(m[1])
}

const HUE = hueDeTokens()

function funcionAOklch(literal) {
  const abre = literal.indexOf('(')
  const nombre = literal.slice(0, abre).toLowerCase()
  const args = literal
    .slice(abre + 1, -1)
    .replace(/var\(--hue[^)]*\)/gi, String(HUE))
    .split('/')[0]
    .split(/[\s,]+/)
    .filter(Boolean)
  if (nombre === 'rgb' || nombre === 'rgba') {
    const canal = (t) => (t.endsWith('%') ? (Number.parseFloat(t) * 255) / 100 : Number(t))
    const [r, g, b] = args.slice(0, 3).map(canal)
    return [r, g, b].every(Number.isFinite) ? rgbAOklch(r, g, b) : null
  }
  const [lRaw, cRaw, hRaw] = args
  const L = lRaw?.endsWith('%') ? Number.parseFloat(lRaw) / 100 : Number(lRaw)
  const C = Number.parseFloat(cRaw)
  const H = Number.parseFloat(hRaw)
  return [L, C, H].every(Number.isFinite) ? { L, C, H } : null
}

const anclas = ANCLAS.map(([nombre, hex]) => ({ nombre, hex, ...hexAOklch(hex) }))
const neutras = anclas.filter((a) => NEUTRAS.includes(a.nombre))
const ARCO_NEUTRO = [Math.min(...neutras.map((a) => a.H)), Math.max(...neutras.map((a) => a.H))]

function distanciaHue(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** Nombre del ancla a la que pertenece el color, o `null` si es ajeno. */
function pertenece(color) {
  if (color.C < 0.005) return color.L > 0.98 ? 'surface' : null
  for (const a of anclas) if (distanciaHue(color.H, a.H) <= TOLERANCIA_HUE) return a.nombre
  for (const [nombre, hue] of HUES_SEMANTICOS) {
    if (distanciaHue(color.H, hue) <= TOLERANCIA_HUE) return 'semantico:' + nombre
  }
  if (color.C <= CROMA_NEUTRO_MAX && color.H >= ARCO_NEUTRO[0] && color.H <= ARCO_NEUTRO[1]) {
    return 'rampa neutra interpolada'
  }
  return null
}

/** `statSync` lanza si no existe; aquí la ausencia es un dato, no un error. */
function existe(ruta) {
  try {
    statSync(ruta)
    return true
  } catch {
    return false
  }
}

function recorrer(dir, salida = []) {
  for (const entrada of readdirSync(dir)) {
    const completo = path.join(dir, entrada)
    if (statSync(completo).isDirectory()) recorrer(completo, salida)
    else if (/\.(css|vue|ts)$/.test(entrada)) salida.push(completo)
  }
  return salida
}

/** Blanquea conservando los saltos de línea, para no desplazar las líneas. */
const blanquear = (texto, re) => texto.replace(re, (m) => m.replace(/[^\n]/g, ' '))

/**
 * Un `#164` en un comentario es un número de issue, no un color, y el árbol
 * está lleno de ellos. Los comentarios se blanquean antes de buscar: sin eso
 * el gate viviría de falsos positivos y acabaría desactivado. El `//` solo se
 * blanquea dentro de `<script>`, porque en una plantilla `href="//algo"` no es
 * un comentario.
 *
 * Y una máscara tampoco pinta: en `mask-image: linear-gradient(#000, transparent)`
 * el negro es «opaco», no un color, y exigirle pertenecer a la marca no
 * significa nada.
 */
function sinRuido(texto, extension) {
  let s = blanquear(texto, /<!--[\s\S]*?-->/g)
  s = blanquear(s, /\/\*[\s\S]*?\*\//g)
  s = blanquear(s, /(-webkit-)?mask(-image)?\s*:[^;}]*/gi)
  if (extension === '.ts') return blanquear(s, /(^|[^:\w])\/\/[^\n]*/gm)
  if (extension !== '.vue') return s
  return s.replace(/<script[\s\S]*?<\/script>/gi, (bloque) =>
    blanquear(bloque, /(^|[^:\w])\/\/[^\n]*/gm),
  )
}

const HEX_RE = /(?<![&\w])#[0-9a-fA-F]{3,8}\b/g
const FUNCION_RE = /\b(?:rgba?|oklch)\(/gi
const NOMBRE_RE = /(?<=[:,\s(])(white|transparent|currentcolor|inherit)(?![\w-])/gi

/** `oklch(58% 0.2 var(--hue) / 25%)` lleva paréntesis dentro: hay que contar. */
function cerrarParentesis(texto, desde) {
  let nivel = 0
  for (let i = desde; i < texto.length; i++) {
    if (texto[i] === '(') nivel++
    else if (texto[i] === ')' && --nivel === 0) return i
  }
  return -1
}

function literales(texto) {
  const salida = []
  for (const m of texto.matchAll(HEX_RE)) salida.push({ indice: m.index, literal: m[0] })
  for (const m of texto.matchAll(NOMBRE_RE)) salida.push({ indice: m.index, literal: m[0] })
  for (const m of texto.matchAll(FUNCION_RE)) {
    const fin = cerrarParentesis(texto, m.index + m[0].length - 1)
    if (fin !== -1) salida.push({ indice: m.index, literal: texto.slice(m.index, fin + 1) })
  }
  return salida
}

const clave = (texto) => texto.toLowerCase().replace(/\s+/g, ' ')

/** Cada sitio exento se indexa por `archivo|color` para resolverlo en O(1). */
const indiceExento = new Map()
for (const e of EXENCIONES) {
  for (const sitio of e.sitios) {
    for (const color of sitio.colores) indiceExento.set(sitio.archivo + '|' + clave(color), e)
  }
}

const archivos = recorrer(SRC)
const infracciones = []
const aplicadas = new Set()
let medidos = 0
let compuestas = 0

for (const completo of archivos) {
  const relativo = path.relative(ROOT, completo).split(path.sep).join('/')
  const extension = path.extname(completo)
  const texto = sinRuido(readFileSync(completo, 'utf8'), extension)
  const cortes = [...texto.matchAll(/\n/g)].map((m) => m.index)
  const linea = (i) => {
    const n = cortes.findIndex((c) => c > i)
    return n === -1 ? cortes.length + 1 : n + 1
  }

  for (const { indice, literal } of literales(texto)) {
    const normalizado = clave(literal)
    let color
    if (normalizado.startsWith('#')) color = hexAOklch(normalizado)
    else if (NOMBRES.has(normalizado)) {
      const hex = NOMBRES.get(normalizado)
      if (hex === null) continue
      color = hexAOklch(hex)
    } else color = funcionAOklch(normalizado)

    if (TIENE_ALFA.test(normalizado)) compuestas++

    const exencion = indiceExento.get(relativo + '|' + normalizado)
    if (color === null) {
      if (exencion === undefined) {
        infracciones.push({
          archivo: relativo,
          linea: linea(indice),
          literal,
          motivo: 'no se pudo interpretar',
        })
      }
      continue
    }
    medidos++
    const ancla = pertenece(color)
    if (exencion !== undefined) {
      if (ancla === null) aplicadas.add(exencion.issue)
      continue
    }
    if (ancla !== null) continue
    infracciones.push({
      archivo: relativo,
      linea: linea(indice),
      literal,
      motivo:
        'hue ' +
        color.H.toFixed(1) +
        'deg, croma ' +
        color.C.toFixed(4) +
        ' — ninguna ancla a menos de ' +
        TOLERANCIA_HUE +
        'deg',
    })
  }
}

/**
 * Una exención se da por gastada cuando ninguno de sus sitios sigue fuera de
 * marca. Dos cautelas, y las dos salen de que esta lista es un gemelo byte a
 * byte sobre dos árboles que no son iguales:
 *
 * - la unidad es el hallazgo entero, no cada literal, porque un hallazgo se
 *   cierra de una vez y su issue también;
 * - solo se juzga si TODOS sus sitios existen en este repo. `BaseChip.vue` es
 *   del tenant y `PublicLayout.vue` de la consola: sin esta condición, cada
 *   repo declararía sobrante la deuda del otro y el gate nacería en rojo.
 *
 * El precio, dicho: un arreglo a medias no reabre el gate, y un hallazgo que
 * cruza los dos repos solo se detecta como sobrante en el repo que tiene todos
 * sus archivos.
 */
const sobrantes = EXENCIONES.filter(
  (e) => !aplicadas.has(e.issue) && e.sitios.every((s) => existe(path.join(ROOT, s.archivo))),
)

const exentos = EXENCIONES.reduce(
  (n, e) => n + e.sitios.reduce((m, s) => m + s.colores.length, 0),
  0,
)
console.log(
  'brand:palette — ' +
    medidos +
    ' colores medidos en ' +
    archivos.length +
    ' archivos de src/; ' +
    anclas.length +
    ' anclas de marca (+-' +
    TOLERANCIA_HUE +
    'deg), ' +
    EXENCIONES.length +
    ' exenciones con issue (' +
    exentos +
    ' literales).',
)
console.log(
  'brand:palette — NO EVALUABLE: ' +
    compuestas +
    ' de esos colores llevan alfa y se ven como un píxel compuesto con lo que ' +
    'tengan debajo. Su tono sí queda medido; su contraste no lo mide este gate ' +
    'ni ninguna otra puerta del repo, ni el de las paradas de degradado ' +
    '(admin-web#247, public-web#334).',
)

if (sobrantes.length > 0) {
  console.error(
    '\nbrand:palette — ' + sobrantes.length + ' exencion(es) que ya no hace(n) falta:\n',
  )
  for (const s of sobrantes) console.error('  ' + s.issue + '  ' + s.motivo)
  console.error(
    '\nNinguno de sus sitios sigue fuera de marca. Borra la entrada de EXENCIONES en\n' +
      'los DOS repos (este script es gemelo TR-02) y cierra su issue.\n',
  )
}

if (infracciones.length > 0) {
  console.error(
    '\nbrand:palette — ' + infracciones.length + ' color(es) fuera de la paleta de marca:\n',
  )
  for (const i of infracciones) {
    console.error('  ' + i.archivo + ':' + i.linea + '  ' + i.literal + '  →  ' + i.motivo)
  }
  console.error('\nPaleta de marca (hue OKLCH):')
  for (const a of anclas) {
    const hue = a.C < 0.005 ? 'sin tono' : a.H.toFixed(1) + 'deg'
    console.error('  ' + a.hex + '  ' + hue.padStart(8) + '  ' + a.nombre)
  }
  for (const [nombre, hue] of HUES_SEMANTICOS) {
    console.error('  (exento)  ' + (hue.toFixed(1) + 'deg').padStart(8) + '  ' + nombre)
  }
  console.error(
    '\nUsa `var(--token)` de tokens.css, o declara el literal en EXENCIONES con su\n' +
      'motivo y su issue — en los DOS repos, que este script es gemelo TR-02.\n',
  )
}

if (infracciones.length > 0 || sobrantes.length > 0) process.exit(1)
