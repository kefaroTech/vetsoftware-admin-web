import { test, expect } from '@playwright/test'
import { abrirGaleria, elementoConFoco } from '../helpers/galeria'

/**
 * `AppSelect` no completa la elección en el evento de BAJADA del puntero.
 *
 * ── El defecto que caza ────────────────────────────────────────────────────
 * Las opciones se activaban con `@mousedown.prevent`. WCAG 2.2 §2.5.2
 * (Pointer Cancellation, A) exige que la función no se ejecute en el evento de
 * bajada: quien aprieta sobre la opción equivocada tiene que poder arrastrar
 * fuera y soltar sin que pase nada. Con `mousedown` no había marcha atrás, y
 * en una consola que se usa con el animal delante eso es un plan cambiado por
 * un dedo mal apoyado.
 *
 * ── Por qué también se mira el foco ────────────────────────────────────────
 * La corrección tiene una mitad invisible. Al pasar a `@click`, el `mousedown`
 * previo sí mueve el foco fuera del disparador —el panel se teletransporta a
 * `<body>` y sus `<li>` no son enfocables—, así que sin `close(true)` el foco
 * cae a `<body>` y se cambia §2.5.2 por §2.4.3. La versión de jsdom de esta
 * guarda (`tests/unit/app-select-activacion.spec.ts`) NO puede verlo: su
 * `mousedown` sintético no reproduce el traslado de foco que hace el
 * navegador. Por eso esta existe además de aquella, y no en su lugar.
 */

const SELECCIONADO = 'Plan Pro'
const OTRO = 'Plan Básico'

test.describe('AppSelect · cancelación del puntero', () => {
  test.beforeEach(async ({ page }) => {
    await abrirGaleria(page)
    await page.getByTestId('campo-select').scrollIntoViewIfNeeded()
  })

  test('§2.5.2 · un mousedown sobre la opción, sin soltar, no cambia el valor', async ({
    page,
  }) => {
    const disparador = page.getByRole('combobox', { name: 'Plan contratado' })
    await expect(disparador).toContainText(SELECCIONADO)
    await disparador.click()

    const opcion = page.getByRole('option', { name: OTRO })
    await expect(opcion).toBeVisible()
    const caja = await opcion.boundingBox()
    if (!caja) throw new Error(`la opción «${OTRO}» no tiene caja`)

    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
    await page.mouse.down()

    await expect(
      disparador,
      'el valor cambió en el mousedown: la activación volvió al evento de bajada',
    ).toContainText(SELECCIONADO)

    // Arrastrar fuera y soltar: la salida que §2.5.2 exige que exista.
    await page.mouse.move(caja.x + caja.width / 2, caja.y - 120)
    await page.mouse.up()

    await expect(disparador, 'soltar fuera de la opción cambió el valor igualmente').toContainText(
      SELECCIONADO,
    )
  })

  test('un clic completo sí elige, y devuelve el foco al disparador', async ({ page }) => {
    const disparador = page.getByRole('combobox', { name: 'Plan contratado' })
    await disparador.click()
    await page.getByRole('option', { name: OTRO }).click()

    await expect(disparador).toContainText(OTRO)
    await expect(disparador).toHaveAttribute('aria-expanded', 'false')

    const foco = await elementoConFoco(page)
    expect(
      foco.tag,
      `tras elegir con el ratón el foco quedó en <${foco.tag.toLowerCase()}>: ` +
        'el siguiente Tab empezaría desde el principio del documento',
    ).toBe('BUTTON')
    await expect(disparador).toBeFocused()
  })
})
