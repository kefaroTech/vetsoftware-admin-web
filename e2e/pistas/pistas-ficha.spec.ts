import { expect, test } from '@playwright/test'
import {
  abrirFicha,
  botonEnviarDelCompositor,
  compositor,
  estadoDeLaFicha,
  historial,
  PINTADA,
  revision,
  rutaFicha,
} from '../helpers/pistas'

/**
 * **Ficha de la pista de un artículo** — `/asistente/pistas/:catalogItemId`.
 *
 * <p>Es la pantalla que contesta con exactitud lo que el listado no puede: si
 * un artículo nunca tuvo pista o si se la retiraron, y con qué texto se generó
 * una propuesta de hace meses. Se cubren los tres estados de cabecera, las tres
 * etiquetas del historial —que se asignan por POSICIÓN, porque la API no
 * distingue «retirada» de «reemplazada»— y los cuatro pies de procedencia, que
 * es el punto de la pantalla donde más fácil es mentir.
 */
test.describe('Pistas del asistente · ficha del artículo', () => {
  test('cabecera de un artículo con pista vigente: dice qué revisión rige y ofrece corregir y retirar', async ({
    page,
  }) => {
    await abrirFicha(page, 901)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'E2E-GROOMING · Peluquería E2E',
    )
    // La frase dice la CONSECUENCIA COMERCIAL, no el estado de la fila.
    await expect(estadoDeLaFicha(page)).toHaveText(
      `El asistente propone este artículo con la revisión 4, publicada el ${PINTADA.GROOMING_V4}.`,
    )
    await expect(estadoDeLaFicha(page)).not.toContainText('Sin pista')

    await expect(page.getByRole('button', { name: 'Corregir la pista' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retirar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Escribir la pista' })).toHaveCount(0)
  })

  test('cabecera de un artículo al que le retiraron la pista: lo marca y ofrece escribir de nuevo', async ({
    page,
  }) => {
    await abrirFicha(page, 904)

    await expect(estadoDeLaFicha(page)).toContainText(
      `Este artículo no se propone. Su última pista se retiró el ${PINTADA.KARDEX_RETIRADA}.`,
    )
    await expect(estadoDeLaFicha(page)).toContainText('Sin pista')

    // No hay «revertir» —el índice único cubre todas las filas, así que
    // republicar un texto anterior responde 409—, así que lo único que se
    // ofrece es escribir una nueva.
    await expect(page.getByRole('button', { name: 'Escribir la pista' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retirar', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Corregir la pista' })).toHaveCount(0)
  })

  test('cabecera de un artículo que nunca tuvo pista: no es un error, y el título sale del respaldo', async ({
    page,
  }) => {
    await abrirFicha(page, 905)

    // `/revisions` responde 200 con página vacía; `GET /{id}` habría respondido
    // 404, que es el estado NORMAL de todo artículo sin pista. Una ficha que
    // enrutara ese 404 al banner se rompería justo para los artículos que más
    // necesitan esta pantalla.
    await expect(estadoDeLaFicha(page)).toHaveText(
      'Este artículo nunca ha tenido pista, así que el asistente no lo propone.',
    )
    await expect(page.getByText('Este artículo no tiene ninguna revisión publicada.')).toBeVisible()
    await expect(historial(page)).toHaveCount(0)
    // Y NO se dice como un fallo: el banner de error de la ficha es el único
    // sitio de esta pantalla con un «Reintentar», así que su ausencia es la
    // forma precisa de decir «esto no se pintó como error». `getByRole('alert')`
    // a secas no serviría: el velo global de carga también lo declara.
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0)

    // Con el historial vacío no hay de dónde sacar código ni nombre: el título
    // solo puede venir de la llamada de respaldo a `/catalog-items/{id}`.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'E2E-TRAZA · Trazabilidad E2E',
    )
  })

  test('las tres etiquetas del historial se asignan por posición, no por aritmética', async ({
    page,
  }) => {
    await abrirFicha(page, 901)

    await expect(historial(page).getByRole('listitem')).toHaveCount(4)

    // La de arriba con `current` es la vigente.
    await expect(revision(page, 0)).toContainText('Revisión 4')
    await expect(revision(page, 0)).toContainText('Vigente')
    await expect(revision(page, 0)).not.toContainText('Reemplazada')
    await expect(revision(page, 0)).not.toContainText('Retirada')

    // Cualquier otra con `supersededAt` puesto es un reemplazo: alguien publicó
    // encima. La API no distingue estos dos casos, solo la posición.
    await expect(revision(page, 1)).toContainText('Revisión 3')
    await expect(revision(page, 1)).toContainText('Reemplazada')
    await expect(revision(page, 1)).not.toContainText('Vigente')

    // La de arriba del todo SIN `current` es una retirada: nadie la sucedió, o
    // habría una más nueva encima.
    await page.goto(rutaFicha(904))
    await expect(historial(page).getByRole('listitem')).toHaveCount(2)
    await expect(revision(page, 0)).toContainText('Revisión 2')
    await expect(revision(page, 0)).toContainText('Retirada')
    await expect(revision(page, 0)).not.toContainText('Vigente')
    await expect(revision(page, 0)).not.toContainText('Reemplazada')
    await expect(revision(page, 1)).toContainText('Reemplazada')
  })

  test('los cuatro pies de procedencia, incluido el que dice que no consta quién', async ({
    page,
  }) => {
    await abrirFicha(page, 901)

    // 1 · Vigente.
    await expect(revision(page, 0)).toContainText(
      `Publicada el ${PINTADA.GROOMING_V4} por tú (usuario #7). Vigente.`,
    )

    // 2 · Sucedida, con firmante.
    await expect(revision(page, 1)).toContainText(
      `Publicada el ${PINTADA.GROOMING_V3} por usuario #12 · retirada el ${PINTADA.GROOMING_V4} por tú (usuario #7).`,
    )

    // 3 · Sucedida SIN firmante. `null` significa «no consta», que no es lo
    // mismo que «no se retiró»: la firma la añadió el changeset 393 y las
    // sucesiones anteriores no la tienen. Pintar `usuario #null`, esconder la
    // línea o caer al firmante de publicación convertiría una laguna conocida
    // en un dato falso.
    await expect(revision(page, 2)).toContainText(
      `Publicada el ${PINTADA.GROOMING_V2} por usuario #12 · retirada el ${PINTADA.GROOMING_V3}. No consta quién: la firma de retirada no existía cuando ocurrió.`,
    )

    // 4 · Fila contradictoria: firmante de retirada sin fecha de retirada. Se
    // dice que el dato es incoherente en vez de inventar una fecha.
    await expect(revision(page, 3)).toContainText(
      'Dato incoherente: figura firmante de retirada sin fecha.',
    )
  })

  test('«Usar como base» carga esa revisión y el botón nombra la que se va a publicar', async ({
    page,
  }) => {
    await abrirFicha(page, 901)

    // La revisión 3, que está reemplazada: partir de ella es el único «revertir»
    // posible, y el producto lo nombra por lo que de verdad ocurre.
    await revision(page, 1).getByRole('button').click()

    const modal = compositor(page)
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Estás partiendo de la revisión 3.')
    await expect(modal).toContainText('No se puede republicar un texto idéntico')

    // El texto de la revisión 3 tiene tres bloques exactos, así que se reparte
    // en los tres campos en vez de caer al editor de texto plano.
    await expect(modal.getByRole('textbox')).toHaveCount(3)
    await expect(modal.getByRole('textbox').first()).toHaveValue(
      'E2E · Peluquería canina y felina.',
    )

    // El texto vigente se queda a la vista mientras se escribe el nuevo: es lo
    // único honesto que puede hacer una pantalla que no ve el efecto de lo que
    // publica.
    await expect(modal).toContainText('Texto vigente · revisión 4')
    await expect(modal).toContainText('Servicio de peluquería y baño')

    // Y el botón dice qué número va a nacer: 4 vigente → 5.
    await expect(botonEnviarDelCompositor(page)).toHaveAccessibleName('Publicar la revisión 5')
  })
})
