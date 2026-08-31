import { expect, test } from '@playwright/test'
import {
  abrirListado,
  botonConfirmarRetirada,
  botonRetirarDeLaFila,
  dialogoRetirada,
  elementoConFoco,
  fila,
  filas,
  pestanaActiva,
} from '../helpers/pistas'

/**
 * **Retirar una pista desde el listado**, y dónde queda el foco después.
 *
 * <p>Este es el flujo que se rompe siempre: al retirar, <b>la fila que invocó
 * el diálogo desaparece</b> y con ella el botón que lo abrió, así que la
 * devolución de foco por omisión —el disparador capturado al abrir— apunta a un
 * nodo que ya no está en el documento y el foco cae al `<body>`. Quien navega
 * con teclado reaparece al principio del documento sin saber qué pasó (WCAG 2.2
 * §2.4.3). La especificación lo resolvió pasando `return-focus-to` como
 * FUNCIÓN, para que se resuelva en el instante del cierre y distinga «retiré»
 * de «cancelé»: las dos mitades se cubren aquí.
 */
test.describe('Pistas del asistente · retirada y foco', () => {
  test('el diálogo nombra el sujeto, avisa de la consecuencia y desmiente lo que un DELETE promete', async ({
    page,
  }) => {
    await abrirListado(page)
    await botonRetirarDeLaFila(fila(page, 901)).click()

    const dialogo = dialogoRetirada(page)
    await expect(dialogo).toBeVisible()
    // `alertdialog` y no `dialog`: el cuerpo hay que oírlo sí o sí.
    await expect(dialogo).toHaveAttribute('aria-modal', 'true')
    await expect(dialogo).toContainText('Retirar la pista de E2E-GROOMING')
    // Con nombre Y código el paréntesis SÍ desambigua, y tiene que seguir ahí:
    // sin esta rama, un arreglo que lo borrara siempre pasaría en verde.
    await expect(dialogo).toContainText(
      '¿Retirar la pista vigente de «Peluquería E2E» (E2E-GROOMING)?',
    )

    // Lo que SÍ pasa, y que rige sin despliegue.
    await expect(dialogo).toContainText('dejará de proponer este artículo')
    await expect(dialogo).toContainText('no hay despliegue ni revisión de nadie')

    // Y la mitad del trabajo del diálogo: desmentir lo que un `DELETE` promete.
    // La numeración sale de la revisión vigente (4), así que la siguiente es 5.
    await expect(dialogo).toContainText('No se borra nada.')
    await expect(dialogo).toContainText('La revisión 4 se queda en el historial')
    await expect(dialogo).toContainText('la numeración sigue en 5')

    // Quién firma: es lo único que dirá quién apagó el artículo.
    await expect(dialogo).toContainText('tú (usuario #7)')
  })

  test('retirar borra la fila y deja el foco en la pestaña activa, nunca en el body', async ({
    page,
  }) => {
    const api = await abrirListado(page)
    await expect(filas(page)).toHaveCount(3)

    await botonRetirarDeLaFila(fila(page, 901)).click()
    await expect(dialogoRetirada(page)).toBeVisible()
    await botonConfirmarRetirada(page).click()

    // ⚠️ El identificador del recurso es el `catalogItemId` (901), NUNCA el `id`
    // de la revisión (5104). Pasar el segundo compila y retira otra cosa.
    await expect
      .poll(() => api.escrituras.map((e) => `${e.metodo} ${e.ruta}`))
      .toEqual(['DELETE /catalog-item-ai-hints/901'])

    // La fila que invocó el diálogo ya no existe.
    await expect(fila(page, 901)).toHaveCount(0)
    await expect(filas(page)).toHaveCount(2)
    await expect(dialogoRetirada(page)).toHaveCount(0)

    // Y el foco está en la pestaña activa, que es el ancla estable del panel
    // donde acaba de aparecer el listado ya sin la fila.
    await expect(pestanaActiva(page)).toBeFocused()
    expect(
      await page.evaluate(() => document.activeElement === document.body),
      `El foco cayó al <body> tras retirar. Tiene el foco → ${await elementoConFoco(page)}`,
    ).toBe(false)
  })

  test('cancelar no llama al servidor y devuelve el foco al botón que abrió el diálogo', async ({
    page,
  }) => {
    const api = await abrirListado(page)

    const disparador = botonRetirarDeLaFila(fila(page, 902))
    await disparador.click()
    await expect(dialogoRetirada(page)).toBeVisible()
    await dialogoRetirada(page).getByRole('button', { name: 'Cancelar' }).click()

    await expect(dialogoRetirada(page)).toHaveCount(0)
    // Cancelar no ha borrado nada, así que el disparador SIGUE en el documento:
    // aquí la devolución de foco correcta es la cadena de respaldo de
    // `ModalShell`, no la pestaña. Por eso `return-focus-to` es una función.
    await expect(disparador).toBeFocused()
    await expect(fila(page, 902)).toHaveCount(1)

    // Afirmación de ausencia: sin control positivo no distingue «no se llamó»
    // de «mi prueba no mira las llamadas».
    expect(api.escrituras).toHaveLength(0)

    // El control positivo, con el MISMO instrumento: si el arnés dejara de
    // contar, esta línea se pondría roja en el acto.
    await botonRetirarDeLaFila(fila(page, 902)).click()
    await botonConfirmarRetirada(page).click()
    await expect.poll(() => api.escrituras.length).toBe(1)
  })

  test('si el servidor rechaza la retirada, el diálogo se queda abierto y lo dice dentro', async ({
    page,
  }) => {
    const api = await abrirListado(page)
    api.responderAEscrituraCon({
      clase: 'problema',
      status: 409,
      code: 'CATALOG_ITEM_AI_HINT_NOT_FOUND',
      detail: 'Los datos enviados no son válidos.',
      traceId: 'e2e-traza-retirada',
    })

    // La huérfana: pista viva sobre un artículo que ya no está en el catálogo,
    // que es justo la que más papeletas tiene de que otro la haya retirado ya.
    await botonRetirarDeLaFila(fila(page, 903)).click()
    await botonConfirmarRetirada(page).click()

    const dialogo = dialogoRetirada(page)
    await expect(dialogo).toBeVisible()
    // Sin nombre no hay nada que entrecomillar, y la preposición contrae: la
    // pregunta dice «del artículo #903», no «de «el artículo #903»».
    await expect(dialogo).toContainText('¿Retirar la pista vigente del artículo #903?')
    await expect(dialogo).not.toContainText('de el artículo')
    // Y sin paréntesis: ahí el código ES el identificador que el sujeto ya dijo.
    await expect(dialogo).not.toContainText('#903 (#903)')
    // El texto lo pone el cliente a partir del `code`: el `detail` del servidor
    // para un 409 mapeado es una constante que no dice cuál es el problema.
    await expect(dialogo).toContainText('Este artículo ya no tiene pista vigente.')
    await expect(dialogo).toContainText('mientras tenías la pantalla abierta')

    // Nada se destruyó y no se reintentó solo.
    await expect(fila(page, 903)).toHaveCount(1)
    expect(api.escrituras).toHaveLength(1)
  })
})
