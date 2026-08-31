import { expect, test } from '@playwright/test'
import {
  abrirListado,
  botonCorregirDeLaFila,
  celda,
  fila,
  filas,
  PINTADA,
  pestanaActiva,
  pestanas,
  botonRetirarDeLaFila,
} from '../helpers/pistas'

/**
 * **Listado de pistas del asistente** — `/asistente/pistas`.
 *
 * <p>Lo que se escribe en esta pantalla cambia lo que se le vende a
 * desconocidos, al instante y sin que lo revise nadie. Estas pruebas cubren lo
 * que solo se ve abriendo el navegador: el patrón de pestañas completo, la fila
 * del artículo que ya no está en el catálogo, y la derivación de «Sin pista»,
 * que ningún endpoint contesta y se calcula en el cliente.
 *
 * <p>API interceptada y sin backend: el porqué está escrito entero en
 * `helpers/pistas.ts`.
 */
test.describe('Pistas del asistente · listado', () => {
  test('las pestañas implementan el patrón APG: una sola tabulable y las flechas mueven y seleccionan', async ({
    page,
  }) => {
    await abrirListado(page)

    await expect(pestanas(page)).toHaveCount(2)
    // Un `tabindex="0"` por pestaña convertiría un grupo de dos opciones en dos
    // paradas de tabulación. Tab entra y sale; las flechas se mueven dentro.
    await expect(pestanas(page).nth(0)).toHaveAttribute('tabindex', '0')
    await expect(pestanas(page).nth(1)).toHaveAttribute('tabindex', '-1')
    await expect(pestanas(page).nth(0)).toHaveAttribute('aria-selected', 'true')

    await pestanas(page).nth(0).focus()
    await page.keyboard.press('ArrowRight')

    // Activación automática: la flecha mueve el foco Y selecciona.
    await expect(pestanas(page).nth(1)).toBeFocused()
    await expect(pestanas(page).nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(pestanas(page).nth(1)).toHaveAttribute('tabindex', '0')
    await expect(pestanas(page).nth(0)).toHaveAttribute('tabindex', '-1')

    // El panel vive FUERA del componente de pestañas, así que los dos extremos
    // del patrón se calculan por separado y pueden desincronizarse en silencio.
    const idDeLaActiva = await pestanas(page).nth(1).getAttribute('id')
    const panel = page.locator('[role="tabpanel"]')
    await expect(panel).toHaveAttribute('aria-labelledby', idDeLaActiva ?? '(sin id)')
    await expect(pestanas(page).nth(1)).toHaveAttribute(
      'aria-controls',
      (await panel.getAttribute('id')) ?? '(sin id)',
    )

    // Vuelta circular hacia atrás, que es la otra mitad del patrón.
    await page.keyboard.press('ArrowRight')
    await expect(pestanas(page).nth(0)).toBeFocused()
  })

  test('cada pista vigente ocupa una fila con su código, su revisión y quién la firmó', async ({
    page,
  }) => {
    await abrirListado(page)

    await expect(page.getByRole('columnheader')).toHaveCount(6)
    await expect(filas(page)).toHaveCount(3)

    const grooming = fila(page, 901)
    await expect(celda(grooming, 0)).toHaveText('E2E-GROOMING')
    await expect(celda(grooming, 1)).toContainText('Peluquería E2E')
    // La columna se llama «Primer bloque» y eso es lo que pinta: el primero de
    // los tres, no el texto entero.
    await expect(celda(grooming, 2)).toContainText('Servicio de peluquería y baño')
    await expect(celda(grooming, 2)).not.toContainText('NO aplica')
    await expect(celda(grooming, 3)).toHaveText('4')
    await expect(celda(grooming, 4)).toContainText(PINTADA.GROOMING_V4)
    // La firma dice «tú» solo cuando el firmante es quien mira.
    await expect(celda(grooming, 4)).toContainText('tú (usuario #7)')

    const agenda = fila(page, 902)
    await expect(celda(agenda, 4)).toContainText(PINTADA.AGENDA_V1)
    await expect(celda(agenda, 4)).toContainText('usuario #12')
    await expect(celda(agenda, 4)).not.toContainText('tú')
  })

  test('la pista de un artículo que ya no está en el catálogo se marca, no se esconde', async ({
    page,
  }) => {
    await abrirListado(page)

    // `catalogItemCode` y `catalogItemName` son dos de los cuatro campos que el
    // contrato NO declara `required`: este nulo es real, no hipotético.
    const huerfana = fila(page, 903)
    await expect(huerfana).toHaveCount(1)
    await expect(celda(huerfana, 0)).toHaveText('—')
    await expect(celda(huerfana, 1)).toContainText('Artículo #903')
    await expect(celda(huerfana, 1)).toContainText('Artículo no disponible')
    // Una pista viva sobre algo que ya no se vende sigue teniendo revisión y
    // fecha: es candidata a retirar, no un registro roto que haya que ocultar.
    await expect(celda(huerfana, 3)).toHaveText('1')

    // Y los tres controles siguen nombrando a alguien, EN ESPAÑOL CORRECTO.
    // Sin el respaldo de `deSujeto()` anunciarían «Corregir la pista de null»;
    // sin su contracción, «Corregir la pista de el artículo #903». Son iconos
    // sin texto visible, así que el nombre accesible es todo lo que hay.
    await expect(huerfana.getByRole('link')).toHaveAccessibleName(
      'Historial de la pista del artículo #903',
    )
    await expect(botonCorregirDeLaFila(huerfana)).toHaveAccessibleName(
      'Corregir la pista del artículo #903',
    )
    await expect(botonRetirarDeLaFila(huerfana)).toHaveAccessibleName(
      'Retirar la pista del artículo #903',
    )
  })

  test('los tres botones de una fila llevan el sujeto en su nombre accesible', async ({ page }) => {
    await abrirListado(page)

    const grooming = fila(page, 901)
    // Tres iconos sin texto visible: sin el sujeto en el nombre, un lector de
    // pantalla anuncia tres veces «botón» en cada una de las filas.
    await expect(grooming.getByRole('link')).toHaveAccessibleName(
      'Historial de la pista de Peluquería E2E',
    )
    await expect(botonCorregirDeLaFila(grooming)).toHaveAccessibleName(
      'Corregir la pista de Peluquería E2E',
    )
    await expect(botonRetirarDeLaFila(grooming)).toHaveAccessibleName(
      'Retirar la pista de Peluquería E2E',
    )
    await expect(grooming.getByRole('link')).toHaveAttribute('href', '/asistente/pistas/901')
  })

  test('«Sin pista» cruza las dos colecciones y descarta el deshabilitado y el borrador', async ({
    page,
  }) => {
    await abrirListado(page, {}, '?tab=sin')

    // El enlace profundo `?tab=sin` manda: la segunda pestaña llega activa.
    await expect(pestanas(page).nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(pestanaActiva(page)).toHaveAttribute('tabindex', '0')

    // De los siete artículos del catálogo simulado, tres cumplen las tres
    // condiciones: a la venta, activo y sin pista VIGENTE.
    await expect(filas(page)).toHaveCount(3)
    await expect(page.getByText('E2E-CAJA')).toBeVisible()
    // 905 nunca tuvo pista; 904 la tuvo y se la retiraron. Esta pestaña **no
    // puede distinguirlos** —haría falta una llamada a `/revisions` por fila— y
    // los pinta igual a propósito. Quien necesite la diferencia va a la ficha.
    await expect(page.getByText('E2E-TRAZA')).toBeVisible()
    await expect(page.getByText('E2E-KARDEX')).toBeVisible()

    // El criterio `enabled && status === 'ACTIVE'` es exactamente la guarda de
    // publicación del backend: ofrecer aquí un borrador daría un botón que el
    // servidor rechaza con 404.
    await expect(page.getByText('E2E-BODEGA')).toHaveCount(0)
    await expect(page.getByText('E2E-LABORATORIO')).toHaveCount(0)
    // Y los que sí tienen pista vigente tampoco están.
    await expect(page.getByText('E2E-GROOMING')).toHaveCount(0)
    await expect(page.getByText('E2E-AGENDA')).toHaveCount(0)

    await expect(page.getByRole('button', { name: 'Escribir la pista' })).toHaveCount(3)
  })

  test('un fallo del servidor se dice con su traza y «Reintentar» vuelve a pedir', async ({
    page,
  }) => {
    const api = await abrirListado(page, {
      listado: {
        clase: 'problema',
        status: 500,
        detail: 'No se pudo leer el catálogo de pistas.',
        traceId: 'e2e-traza-listado-pistas',
      },
    })

    // R05 · el fallo va ANTES que el vacío: si no, un 500 se disfraza de
    // «ningún artículo tiene pista», que es exactamente lo contrario.
    const banner = page.getByRole('alert').filter({ hasText: 'No se pudo leer el catálogo' })
    await expect(banner).toBeVisible()
    await expect(page.getByText('Traza: e2e-traza-listado-pistas')).toBeVisible()
    await expect(page.getByText('Ningún artículo tiene pista')).toHaveCount(0)

    api.responderAlListadoCon({ clase: 'ok' })
    await page.getByRole('button', { name: 'Reintentar' }).click()

    await expect(fila(page, 901)).toHaveCount(1)
    await expect(banner).toHaveCount(0)
  })
})
