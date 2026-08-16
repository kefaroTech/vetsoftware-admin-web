import { test, expect, type Page } from '@playwright/test'

/**
 * Regresión visual del design system.
 *
 * Existe por FE-08: la deuda de ese hallazgo se paga borrando CSS, y borrar CSS
 * sin una red que compare el antes y el después obliga a revisar la aplicación
 * pantalla por pantalla en cada tanda. Esto convierte esa revisión manual en un
 * `npm run visual`.
 *
 * ── Por qué una galería y no las pantallas reales ──────────────────────────
 * Las pantallas piden backend, sesión y datos, así que su captura dependería de
 * qué hay en la base de datos ese día: fallaría por motivos que no son un
 * cambio de CSS, y una prueba que falla por ruido se acaba desactivando. La
 * galería monta los componentes REALES y las hojas REALES con datos fijos, que
 * es lo que hace la comparación repetible.
 *
 * Cubre lo que FE-08 toca —primitivas y patrones compartidos— y NO cubre la
 * composición de cada pantalla. Es una red bajo el refactor, no bajo el diseño.
 */

const GALLERY = '/visual/gallery.html'

/** Bloques de la galería; cada uno lleva `data-shot` en `Gallery.vue`. */
const SHOTS = [
  'botones',
  'icon-btn',
  'banners',
  'tarjetas',
  'tipografia',
  'vacios',
  'rejillas',
] as const

/**
 * Todo lo que haría que dos ejecuciones idénticas produjeran píxeles distintos.
 *
 * Las fuentes se sirven desde Google Fonts: si se dejaran pasar, la captura
 * dependería de la red y de la caché del runner. Se bloquean y se fija una pila
 * local; lo que se compara es la MISMA fuente en ambos lados, que es lo único
 * que la prueba necesita para detectar un cambio de CSS.
 */
async function estabilizar(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
      :root { --font-sans: 'DejaVu Sans', sans-serif;
              --font-serif: 'DejaVu Serif', serif;
              --font-mono: 'DejaVu Sans Mono', monospace; }
    `,
  })
  await page.evaluate(() => document.fonts.ready)
}

test.describe('Galería del design system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GALLERY)
    await estabilizar(page)
    await expect(page.locator('[data-shot="botones"]')).toBeVisible()
  })

  // Un caso por bloque, no una captura de la página entera: si el primer bloque
  // cambia de alto, una captura global desplazaría todo lo de abajo y una sola
  // regresión se reportaría como quince, sin decir cuál es la de verdad.
  for (const shot of SHOTS) {
    test(`bloque «${shot}» sin cambios`, async ({ page }) => {
      await expect(page.locator(`[data-shot="${shot}"]`)).toHaveScreenshot(`${shot}.png`)
    })
  }

  test('los estados de hover del botón de icono no cambian', async ({ page }) => {
    // El hover no se captura en el bloque general porque exige interacción, y es
    // justo donde vivían las variantes que FE-08 unificó: merece su propia red.
    const bloque = page.locator('[data-shot="icon-btn"]')
    await bloque.getByRole('button', { name: 'Eliminar' }).hover()
    await expect(bloque).toHaveScreenshot('icon-btn-hover-danger.png')
  })
})
