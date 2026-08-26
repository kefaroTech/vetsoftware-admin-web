import { test, expect, type Page } from '@playwright/test'
import {
  TABLET_HORIZONTAL,
  TABLET_VERTICAL,
  abrirListadoLargo,
  cerrarCajon,
  hamburguesa,
} from '../e2e/helpers/app-shell'

/**
 * <b>Línea base del armazón en tablet</b> — §7.3 de
 * `docs/ux/armazon-tablet-especificacion.md`.
 *
 * <h3>Por qué esta pantalla sí, si la galería dice que las pantallas reales no</h3>
 *
 * <p>`gallery.visual.spec.ts` excluye las pantallas del producto con un motivo
 * concreto: «piden backend, sesión y datos, así que su captura dependería de
 * qué hay en la base de datos ese día». El motivo es la DEPENDENCIA DE DATOS,
 * no la pantalla por serlo — es el mismo razonamiento con el que entró
 * `/login`. Aquí la dependencia no existe: `e2e/helpers/app-shell.ts`
 * intercepta toda la API y sirve siempre las MISMAS 40 empresas, con fechas
 * fijas. La captura no depende de la base de datos porque no hay base de datos.
 *
 * <h3>Qué protege exactamente</h3>
 *
 * <p>El cambio del armazón en tablet no tiene ninguna captura que lo respalde:
 * el raíl de iconos de 72 px se convirtió en un cajón off-canvas y ni la
 * geometría del contenido a ancho completo ni el cajón desplegado están
 * fotografiados en ningún sitio. Son cuatro capturas —dos orientaciones × cajón
 * cerrado y abierto— y su valor está en las dos que nadie mira: el contenido a
 * 768 px de ancho, que es donde se vería un desbordamiento horizontal, y el
 * cajón sobre el velo, que es donde se vería que el indicador de página activa
 * volvió a recortarse.
 *
 * <p>Las capturas son de VIEWPORT y no `fullPage`, y eso es parte de la
 * afirmación: tras el arreglo el documento no scrollea, así que el viewport ES
 * la página entera. Si algún día vuelve el doble scroll, `fullPage` disimularía
 * el defecto alargando la imagen; el viewport lo deja a la vista.
 *
 * <h3>Las fuentes, igual que en la galería y en el login</h3>
 *
 * <p>`index.html` pide las familias a Google Fonts. Se bloquea ese dominio —la
 * red mete latencia y fallos intermitentes, y el contenedor de CI no tiene por
 * qué salir a internet— y se sirven los MISMOS `.woff2` desde el repositorio.
 * Se comprueba que cargaron antes de comparar un píxel.
 */

/** Las caras del armazón: la consola no usa la serif fuera de la portada. */
const CARAS = ['400 16px Geist', '500 16px Geist', '600 16px Geist'] as const

async function estabilizar(page: Page) {
  await abrirListadoLargo(page)

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
}

const ORIENTACIONES = [
  { etiqueta: '768x1024', viewport: TABLET_VERTICAL },
  { etiqueta: '1024x768', viewport: TABLET_HORIZONTAL },
] as const

for (const { etiqueta, viewport } of ORIENTACIONES) {
  test.describe(`Armazón en tablet ${etiqueta}`, () => {
    test.use({ viewport })

    test.beforeEach(async ({ page }) => {
      await estabilizar(page)
    })

    test('con el cajón cerrado', async ({ page }) => {
      // El contenido se lleva el ancho ENTERO: ya no hay columna reservada para
      // el raíl de iconos. Eso y la hamburguesa en la cabecera es lo que esta
      // captura sujeta.
      await expect(hamburguesa(page)).toBeVisible()
      await expect(page).toHaveScreenshot(`armazon-tablet-${etiqueta}-cerrado.png`)
    })

    test('con el cajón abierto', async ({ page }) => {
      await hamburguesa(page).click()
      // Estado observable, no `waitForTimeout`: la X recibe el foco cuando el
      // cajón ya está montado y fuera de `inert`.
      await expect(cerrarCajon(page)).toBeFocused()
      await expect(page).toHaveScreenshot(`armazon-tablet-${etiqueta}-abierto.png`)
    })
  })
}
