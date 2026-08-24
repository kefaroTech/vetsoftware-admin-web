import { test, expect, type Page } from '@playwright/test'

/**
 * <b>issue #142 — la línea base que le faltaba a `LoginView`.</b>
 *
 * <p>El refactor que sacó el armazón de la pantalla de acceso a `PublicLayout`
 * —barra superior, tarjeta, pie, blobs y sus 297 líneas de estilo— se declaró
 * <b>pixel-exacto</b>, y no había ninguna captura que lo demostrara ni que
 * impidiera que el siguiente cambio lo dejara de ser en silencio.
 *
 * <h3>Por qué ESTA pantalla sí, si la galería dice que las pantallas reales no</h3>
 *
 * <p>`gallery.visual.spec.ts` excluye las pantallas reales con un motivo
 * concreto: «piden backend, sesión y datos, así que su captura dependería de
 * qué hay en la base de datos ese día». <b>`/login` no cumple ninguna de las
 * tres.</b> Es una ruta pública, no hace una sola petición para pintarse y no
 * muestra ningún dato: es la única pantalla real del producto que se puede
 * fotografiar de forma reproducible. La exclusión era sobre la dependencia de
 * datos, no sobre las pantallas por serlo.
 *
 * <h3>Las fuentes, igual que en la galería</h3>
 *
 * <p>`index.html` pide las familias a Google Fonts. Aquí se bloquea ese dominio
 * —la red mete latencia y fallos intermitentes, y el contenedor de CI no tiene
 * por qué salir a internet— y se inyecta `visual/fonts.css`, que sirve los MISMOS
 * ficheros `.woff2` desde el repositorio. Se comprueba que cargaron ANTES de
 * comparar un píxel: sin esa guarda, que Geist no cargue se manifiesta como un
 * diff enigmático o, peor, como nada en absoluto.
 */

/** Las caras que usa esta pantalla. Menos que la galería: aquí no hay monoespaciada. */
const CARAS = [
  '400 16px Geist',
  '500 16px Geist',
  '600 16px Geist',
  '400 16px "Instrument Serif"',
  'italic 400 16px "Instrument Serif"',
] as const

async function estabilizar(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())

  await page.goto('/login')

  // Las familias del producto, desde disco y por la misma ruta que las sirve
  // Vite: así las `url()` relativas de `fonts.css` resuelven contra
  // `/visual/fonts/…` y no contra `/`.
  await page.addStyleTag({ url: '/visual/fonts.css' })
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
        caret-color: transparent !important;
      }
    `,
  })

  const fuentes = await page.evaluate(
    async (caras) => {
      const cargas = await Promise.allSettled(caras.map((cara) => document.fonts.load(cara)))
      await document.fonts.ready
      return {
        fallidas: caras.filter((_, i) => cargas[i]?.status === 'rejected'),
        ausentes: caras.filter((cara) => !document.fonts.check(cara)),
      }
    },
    [...CARAS],
  )

  expect(fuentes.fallidas, 'no se pudieron descargar de visual/fonts/').toEqual([])
  expect(
    fuentes.ausentes,
    'se estaría fotografiando la fuente de respaldo del sistema, no la del producto',
  ).toEqual([])

  // El formulario tiene que estar pintado antes de disparar.
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
}

test.describe('Pantalla de acceso sobre PublicLayout', () => {
  test.beforeEach(async ({ page }) => {
    await estabilizar(page)
  })

  test('el armazón público no cambia', async ({ page }) => {
    // Página entera: lo que #142 dice haber conservado es precisamente la
    // composición —barra, tarjeta centrada, pie y blobs—, y un recorte de la
    // tarjeta dejaría fuera justo lo que se refactorizó.
    await expect(page).toHaveScreenshot('login-publiclayout.png', { fullPage: true })
  })

  test('la tarjeta de acceso no cambia', async ({ page }) => {
    // Y el recorte de la tarjeta aparte: si un día cambia el alto de los blobs,
    // la captura de página entera se movería y reportaría una regresión que no
    // está en el formulario. Con las dos, el diff dice cuál de las dos cosas se
    // movió.
    await expect(page.locator('form')).toHaveScreenshot('login-tarjeta.png')
  })

  test('el estado de error del formulario no cambia', async ({ page }) => {
    // El banner de error se pinta con `.ds-banner--error`, que hasta el refactor
    // tenía CERO usos en la consola: es la parte del cambio con menos rodaje.
    // Se provoca sin tocar el servidor, con la validación de cliente.
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator('form')).toHaveScreenshot('login-tarjeta-error.png')
  })
})
