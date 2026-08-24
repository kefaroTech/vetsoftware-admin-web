import { test, expect, type Page } from '@playwright/test'

/**
 * <b>Accesibilidad de la consola, medida en ejecución.</b>
 *
 * <p>Las cuatro reglas que el design system dice cumplir no se habían
 * comprobado nunca sobre la pantalla renderizada: el foco al `<h2 tabindex="-1">`
 * tras cada escritura, el par `aria-describedby` + `aria-invalid` en los campos
 * con error, el `ErrorSummary` con el <b>mismo literal</b> que el error en línea,
 * y que ningún estado se comunique <b>solo</b> por color.
 *
 * <p>Se comprueban con el DOM real, no con una instantánea del componente: un
 * `aria-describedby` que apunta a un id que no existe pasa cualquier test de
 * unidad y no dice nada a un lector de pantalla. Aquí se resuelve el id.
 *
 * <p><b>El artículo que se toca aquí no lo toca ningún otro spec</b>
 * (`catalog-bridges.spec.ts` usa `CORE`). Ver la nota de aquel fichero.
 */

/** `CLINICAL_HISTORY` de la semilla de laboratorio. */
const ITEM = {
  id: 15,
  screenRow: 'Historia clínica',
  screenOption: 'General · Historia clínica',
} as const

async function abrirArticulo(page: Page) {
  await page.goto(`/catalogo-comercial/articulos/${ITEM.id}`)
  await expect(page.getByRole('heading', { name: 'Qué pantallas abre' })).toBeVisible()
  // El encabezado se pinta ANTES de que lleguen los puentes, y `count()` no
  // reintenta: sin esto, el `afterEach` puede leer la tabla vacía y tratar de
  // vincular una pantalla que ya está vinculada. Ver la nota gemela en
  // `catalog-bridges.spec.ts`.
  await page.waitForLoadState('networkidle')
}

function filaPantalla(page: Page) {
  return page
    .getByRole('table')
    .filter({ hasText: 'Pantalla' })
    .getByRole('row')
    .filter({ hasText: ITEM.screenRow })
}

test.describe('accesibilidad de los editores de puentes', () => {
  test('el foco vuelve al encabezado de la sección tras una escritura', async ({ page }) => {
    await abrirArticulo(page)
    await expect(filaPantalla(page)).toHaveCount(1)

    await page.getByRole('button', { name: `Quitar ${ITEM.screenRow}` }).click()
    await page.getByRole('button', { name: 'Quitar pantalla' }).click()

    // El foco se mueve DESPUÉS de que la escritura vuelva del servidor
    // (`unlink()` hace `await unlinkSubModule(...)` y luego
    // `moveFocusToHeading()`). Sin esperar al efecto observable, se leería
    // `document.activeElement` mientras la petición sigue en vuelo y saldría el
    // botón que se acaba de pulsar: sería una carrera del test, no un fallo del
    // producto.
    await expect(filaPantalla(page)).toHaveCount(0)

    const enfocado = await page.evaluate(() => {
      const el = document.activeElement
      return el
        ? {
            tag: el.tagName,
            text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
            tabindex: el.getAttribute('tabindex'),
          }
        : null
    })

    // Sin esto, quien navega con teclado vuelve al `<body>` y tiene que recorrer
    // la pantalla entera para saber qué pasó.
    expect(enfocado?.tag, 'el foco debe aterrizar en el encabezado de la sección').toBe('H2')
    expect(enfocado?.tabindex).toBe('-1')
    expect(enfocado?.text).toContain('Qué pantallas abre')
  })

  test('un campo con error lleva aria-invalid y un aria-describedby que resuelve', async ({
    page,
  }) => {
    await abrirArticulo(page)
    await page.getByRole('button', { name: 'Nueva regla' }).click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()

    // Enviar en vacío: el formulario tiene campos obligatorios.
    await dialogo.getByRole('button', { name: 'Crear regla' }).click()

    const combo = dialogo.getByRole('combobox', { name: /El otro artículo de la regla/ })
    await expect(combo).toHaveAttribute('aria-invalid', 'true')

    // El `aria-describedby` tiene que apuntar a algo que EXISTA y tenga texto.
    // Un id colgando es el fallo clásico que ningún test de unidad ve.
    const descrito = await combo.evaluate((el) => {
      const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
      return ids.map((id) => ({
        id,
        texto: document.getElementById(id)?.textContent?.trim() ?? null,
      }))
    })
    expect(descrito.length, 'un campo inválido debe describir su error').toBeGreaterThan(0)
    for (const d of descrito) {
      expect(d.texto, `aria-describedby apunta a #${d.id}, que no existe o está vacío`).toBeTruthy()
    }
  })

  test('el ErrorSummary repite el MISMO literal que el error en línea', async ({ page }) => {
    await abrirArticulo(page)
    await page.getByRole('button', { name: 'Nueva regla' }).click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await dialogo.getByRole('button', { name: 'Crear regla' }).click()

    const resumen = dialogo.locator('[data-error-anchor]')
    await expect(resumen).toBeVisible()

    // Cada entrada del resumen es un enlace al campo. El texto del enlace tiene
    // que coincidir con el error que se pinta junto al campo: si divergen, quien
    // usa un lector de pantalla oye un mensaje y ve otro.
    const enlaces = await resumen.getByRole('link').allTextContents()
    expect(enlaces.length, 'el resumen debería listar los campos inválidos').toBeGreaterThan(0)

    const normaliza = (s: string) => s.replace(/\s+/g, ' ').trim()
    const enLinea = (await dialogo.locator('p.error').allTextContents())
      .map(normaliza)
      .filter(Boolean)
    expect(enLinea.length, 'los campos deberían pintar su error en línea').toBeGreaterThan(0)

    for (const enlace of enlaces.map(normaliza)) {
      expect(
        enLinea.some((t) => t.includes(enlace)),
        `«${enlace}» está en el resumen pero no aparece igual junto al campo. En línea: ${JSON.stringify(enLinea)}`,
      ).toBe(true)
    }
  })

  test('ningún estado se comunica solo por color', async ({ page }) => {
    await abrirArticulo(page)

    // Cada insignia de estado debe llevar texto (o `aria-label`) además del
    // color: un badge que solo cambia de tono no dice nada a quien no lo
    // distingue.
    const insignias = page.locator('[class*="badge"]')
    const total = await insignias.count()
    expect(total, 'la pantalla debería pintar al menos una insignia de estado').toBeGreaterThan(0)

    for (let i = 0; i < total; i++) {
      const texto = (await insignias.nth(i).textContent())?.trim() ?? ''
      const etiqueta = (await insignias.nth(i).getAttribute('aria-label')) ?? ''
      expect(
        texto.length > 0 || etiqueta.length > 0,
        `la insignia #${i} no tiene texto ni aria-label: solo comunica por color`,
      ).toBe(true)
    }
  })

  test.afterEach(async ({ page }) => {
    // Restituye el vínculo que el primer caso da de baja.
    await abrirArticulo(page)
    if ((await filaPantalla(page).count()) === 0) {
      await page.getByRole('combobox', { name: /Pantalla que abre este artículo/ }).click()
      await page.getByRole('option', { name: ITEM.screenOption, exact: true }).click()
      await page.getByRole('button', { name: 'Vincular' }).click()
      await expect(filaPantalla(page)).toHaveCount(1)
    }
  })
})
