import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { COMPACT_MAX_WIDTH } from '@/stores/viewport.store'

/**
 * Guarda de §1.3 de `docs/ux/armazon-tablet-especificacion.md` — el armazón
 * tiene UNA sola barra de scroll.
 *
 * ── Qué se rompió y por qué una prueba de CSS lo sujeta ────────────────────
 * El usuario reportó dos barras a la vez en tablet. La causa eran tres
 * declaraciones, cada una inofensiva por separado:
 *
 *   1. `.app-shell` y `.app-main` declaraban `min-height: 100vh` — un MÍNIMO,
 *      no un tope. El armazón podía crecer todo lo que quisiera y el
 *      desbordamiento acababa en el `body`.
 *   2. `.app-content` llevaba `flex: 1` SIN `min-height: 0`, así que su mínima
 *      automática de ítem flex era la altura de su contenido y nunca encogía:
 *      su `overflow: auto` era una declaración inerte que aparentaba resolver
 *      el problema.
 *   3. El `<aside>` tenía su propio `overflow-y: auto`, que era la segunda
 *      barra visible y además recortaba el indicador de página activa.
 *
 * Se comprueba con la técnica de `app-table-scroll.spec.ts` —leer el
 * `<style scoped>` y afirmar sobre las reglas— porque jsdom no calcula ni una
 * sola de estas alturas: montar el componente aquí daría 0 px en todo y la
 * prueba pasaría con el armazón roto. La medida DE VERDAD, en navegador y con
 * contenido largo, está en `e2e/tablet/armazon-tablet.spec.ts`; esto es la
 * guarda barata que impide que una de las tres declaraciones vuelva sin que
 * nadie levante un navegador.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')

/** Contenido de `<style scoped>` de un SFC, sin comentarios. */
function scopedStyle(sfcRelativePath: string): string {
  const source = readFileSync(path.join(ROOT, sfcRelativePath), 'utf8')
  const match = /<style scoped>([\s\S]*?)<\/style>/.exec(source)
  if (match === null) throw new Error(`${sfcRelativePath} no declara <style scoped>`)
  const contenido = match[1]
  if (contenido === undefined)
    throw new Error(`${sfcRelativePath}: <style scoped> sin grupo capturado`)
  // Los comentarios de estos dos SFC explican precisamente las declaraciones
  // que se retiraron; dejarlos dentro haría que la búsqueda encontrara su
  // propia lápida.
  return contenido.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Cuerpo de una regla de PRIMER NIVEL. El ancla a principio de línea no es
 * cosmética: `.app-shell` y `.app-content` vuelven a aparecer, indentados,
 * dentro del `@media` de la banda de cajón, y lo que se afirma aquí es lo que
 * rige en las dos bandas.
 */
function ruleBlock(css: string, selector: string, where: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  if (match === null) throw new Error(`${where} no declara la regla ${selector}`)
  const cuerpo = match[1]
  if (cuerpo === undefined) throw new Error(`${where}: la regla ${selector} no capturó cuerpo`)
  return cuerpo
}

const LAYOUT = 'src/components/layout/AppLayout.vue'
const SIDEBAR = 'src/components/layout/AppSidebar.vue'
const HEADER = 'src/components/layout/AppHeader.vue'

const LAYOUT_CSS = scopedStyle(LAYOUT)
const SIDEBAR_CSS = scopedStyle(SIDEBAR)

describe('el armazón es el único tope de altura (§1.3)', () => {
  it('.app-shell recorta y NO declara min-height', () => {
    const shell = ruleBlock(LAYOUT_CSS, '.app-shell', LAYOUT)

    expect(
      shell,
      '`min-height` es un mínimo, no un tope: con él el armazón vuelve a crecer y el documento a scrollear',
    ).not.toMatch(/min-height\s*:/)
    expect(shell, '.app-shell dejó de recortar').toMatch(/overflow\s*:\s*hidden/)
    expect(shell, '.app-shell dejó de tener un tope de altura').toMatch(/height\s*:\s*100dvh/)
  })

  it('.app-shell usa dvh y no vh', () => {
    // En iPadOS Safari y Chrome Android `100vh` se resuelve contra el viewport
    // GRANDE: con la barra de herramientas visible el armazón ya sobresale y el
    // documento ofrece scroll aunque todo quepa. Es el criterio §8.6, que no se
    // puede ejecutar en el navegador de escritorio del CI.
    expect(LAYOUT_CSS, '`100vh` volvió al armazón').not.toMatch(/height\s*:\s*100vh/)
  })

  it('.app-main puede encoger (min-height: 0) y recorta', () => {
    const main = ruleBlock(LAYOUT_CSS, '.app-main', LAYOUT)
    expect(main).toMatch(/min-height\s*:\s*0/)
    expect(main).toMatch(/overflow\s*:\s*hidden/)
  })

  it('.app-content es el único scroller de contenido, y puede encoger', () => {
    const content = ruleBlock(LAYOUT_CSS, '.app-content', LAYOUT)

    expect(
      content,
      'sin `min-height: 0` su mínima automática de ítem flex es la altura del contenido: ' +
        'nunca encoge y su `overflow: auto` no recorta nada',
    ).toMatch(/min-height\s*:\s*0/)
    expect(content, '.app-content dejó de scrollear').toMatch(/overflow\s*:\s*auto/)
  })
})

describe('el menú ya no es el segundo scroller (§1.3)', () => {
  it('.sidebar NO declara overflow-y', () => {
    const sidebar = ruleBlock(SIDEBAR_CSS, '.sidebar', SIDEBAR)

    expect(
      sidebar,
      'el `overflow-y` del <aside> era la segunda barra Y lo que recortaba el indicador de página activa',
    ).not.toMatch(/overflow-y\s*:/)
  })

  it('.nav-groups sí, que es donde bajó el scroll del menú', () => {
    const grupos = ruleBlock(SIDEBAR_CSS, '.nav-groups', SIDEBAR)

    expect(
      grupos,
      'el menú dejó de poder desplazarse: con «Catálogos clínicos» abierto no cabe',
    ).toMatch(/overflow-y\s*:\s*auto/)
    expect(
      grupos,
      'sin `min-height: 0` la lista no encoge y el scroll se lo come el <aside>',
    ).toMatch(/min-height\s*:\s*0/)
    // Sin esto, el gesto de scroll al final de la lista se encadena al
    // contenido de detrás, que es justo lo que el velo dice que está inoperable.
    expect(grupos).toMatch(/overscroll-behavior\s*:\s*contain/)
  })

  it('el indicador de página activa se ancla DENTRO del ítem', () => {
    const barra = ruleBlock(SIDEBAR_CSS, '.nav-item.is-active::before', SIDEBAR)

    expect(
      barra,
      'volvió a `left: -16px`: en compacto aterriza en x ≈ −2,5 px y el recorte se la lleva entera',
    ).not.toMatch(/left\s*:\s*-/)
    expect(barra).toMatch(/inset-inline-start\s*:\s*0/)
  })
})

describe('el punto de corte del CSS y el del store no pueden separarse', () => {
  // `COMPACT_MAX_WIDTH` decide `role`/`aria-modal`/`inert` (marcado) y el
  // `@media` decide la geometría (CSS). Si se separan, hay una franja de anchos
  // en la que el <aside> es un diálogo que no parece un cajón, o al revés.
  it.each([
    ['AppLayout.vue', LAYOUT_CSS],
    ['AppSidebar.vue', SIDEBAR_CSS],
    ['AppHeader.vue', scopedStyle(HEADER)],
  ])('%s usa el mismo ancho que COMPACT_MAX_WIDTH', (_nombre, css) => {
    const anchos = [...css.matchAll(/@media\s*\(width\s*<=\s*(\d+)px\)/g)].map((m) => Number(m[1]))

    expect(anchos.length, 'el SFC dejó de declarar la banda de cajón').toBeGreaterThan(0)
    expect(new Set(anchos)).toEqual(new Set([COMPACT_MAX_WIDTH]))
  })
})
