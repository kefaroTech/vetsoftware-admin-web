import { test, expect, type Page } from '@playwright/test'
import {
  abrirArmazon,
  bloquearFuentesRemotas,
  esperarFuentes,
  esperarVeloOculto,
  seedSession,
} from '../helpers/app-shell'
import { abrirGaleria, elementoConFoco, medirCampo } from '../helpers/galeria'

/**
 * El relleno vertical del campo vive en el CONTROL, no en el envoltorio.
 *
 * ── El defecto que caza ────────────────────────────────────────────────────
 * Mientras el `padding` vertical lo ponía `.ds-field` (el `<div>` envoltorio),
 * el `<input>` de dentro medía 21 px dentro de un control de 43: los 11 px de
 * arriba y los 11 de abajo eran zona muerta. Un clic ahí no enfoca nada — el
 * evento lo recibe el `<div>`, que no es enfocable, y el foco se queda donde
 * estuviera. Es el defecto de mayor alcance del repositorio: 1.042 campos, la
 * mitad de la superficie de cada uno.
 *
 * Y es peor de lo que suena en una consola que se usa a una mano y con prisa:
 * quien apunta al borde superior del campo cree haber fallado el control, no
 * que el control tenga un agujero.
 *
 * ── Por qué no puede ser una prueba unitaria ───────────────────────────────
 * En jsdom todo `getBoundingClientRect()` devuelve ceros y no hay reparto de
 * eventos por coordenadas: «el clic a 4 px del borde cae dentro del `<input>`»
 * no es una afirmación que jsdom pueda evaluar. Hace falta un navegador que
 * coloque el layout y un puntero real.
 *
 * ── Criterio ───────────────────────────────────────────────────────────────
 * WCAG 2.2 §2.5.8 Target Size (Minimum, AA) sobre el control REAL, no sobre la
 * caja que lo dibuja.
 */

/** 4 px por dentro del borde superior: la franja que antes era zona muerta. */
const MARGEN_DE_CLIC = 4

async function clicEnLaFranjaSuperior(page: Page, selectorDelControl: string) {
  const caja = await medirCampo(page, selectorDelControl)
  await page.mouse.click(
    caja.envoltorio.left + caja.envoltorio.width / 2,
    caja.envoltorio.top + MARGEN_DE_CLIC,
  )
  return caja
}

test.describe('el relleno del campo va en el control', () => {
  test.beforeEach(async ({ page }) => {
    await abrirGaleria(page)
    await page.getByTestId('campo-texto').scrollIntoViewIfNeeded()
  })

  test('un clic a 4 px del borde superior enfoca el <input>, no el envoltorio', async ({
    page,
  }) => {
    const caja = await clicEnLaFranjaSuperior(page, '[data-testid="campo-texto"] input')

    const foco = await elementoConFoco(page)
    expect(
      foco.tag,
      `clic a ${MARGEN_DE_CLIC} px del borde superior del campo (alto ${caja.envoltorio.height}px, ` +
        `control ${caja.control.height}px): el foco acabó en <${foco.tag.toLowerCase()}>`,
    ).toBe('INPUT')
  })

  test('el <input> ocupa el alto del control salvo por sus bordes', async ({ page }) => {
    const caja = await medirCampo(page, '[data-testid="campo-texto"] input')

    // El envoltorio solo puede quedarse con su borde de 1 px por lado. Con el
    // relleno en el envoltorio esta diferencia era de 22 px.
    expect(
      caja.envoltorio.height - caja.control.height,
      `envoltorio ${caja.envoltorio.height}px vs control ${caja.control.height}px: ` +
        'la diferencia es relleno del envoltorio, y eso es zona muerta',
    ).toBeLessThanOrEqual(4)

    // El mínimo de §2.5.8, medido sobre el control REAL y no sobre la caja que
    // lo dibuja: es la diferencia entre las dos que este arreglo cerró.
    expect(
      caja.control.height,
      `alto pulsable real del <input> (envoltorio ${caja.envoltorio.height}px)`,
    ).toBeGreaterThanOrEqual(24)
  })

  test('el área de texto tiene el mismo comportamiento', async ({ page }) => {
    const notas = page.getByRole('textbox', { name: 'Notas' })
    await notas.scrollIntoViewIfNeeded()

    const caja = await medirCampo(page, 'textarea')
    await page.mouse.click(
      caja.envoltorio.left + caja.envoltorio.width / 2,
      caja.envoltorio.top + MARGEN_DE_CLIC,
    )

    const foco = await elementoConFoco(page)
    expect(foco.tag, 'clic en la franja superior del área de texto').toBe('TEXTAREA')
  })
})

/**
 * El buscador de listados es el TERCER control de la familia y el único que la
 * galería no monta, así que se mide sobre una pantalla del producto. No es un
 * caso de más por simetría: encabeza las 17 listas de la consola y es el primer
 * control que toca quien entra a buscar algo con el animal delante.
 */
test.describe('el relleno del buscador de listados', () => {
  test('un clic a 4 px del borde superior enfoca el campo de búsqueda', async ({ page }) => {
    await abrirArmazon(page, '/empresas')
    const buscador = page.getByRole('searchbox', { name: 'Buscar empresas' })
    await expect(buscador).toBeVisible()

    const caja = await clicEnLaFranjaSuperior(page, 'input[type="search"]')

    const foco = await elementoConFoco(page)
    expect(
      foco.tag,
      `clic a ${MARGEN_DE_CLIC} px del borde superior del buscador (alto ${caja.envoltorio.height}px, ` +
        `control ${caja.control.height}px): el foco acabó en <${foco.tag.toLowerCase()}>`,
    ).toBe('INPUT')
    await expect(buscador).toBeFocused()
  })
})

/**
 * `/login` monta su PROPIA copia del campo en lugar de `AppInput`, así que
 * ninguna de las guardas de arriba lo cubre: es marcado de la vista, no de un
 * componente compartido. Y es la primera pantalla que ve todo el mundo y la
 * única que no se puede saltar, así que un agujero aquí lo pisa todo el mundo.
 *
 * No necesita sesión ni API: la ruta es pública y no hace una sola petición
 * para pintarse.
 */
test.describe('el relleno del campo de acceso', () => {
  test.beforeEach(async ({ page }) => {
    await bloquearFuentesRemotas(page)
    await page.goto('/login')
    await expect(page.getByLabel('Código de usuario')).toBeVisible()
    await esperarFuentes(page)
  })

  test('un clic a 4 px del borde superior enfoca el <input> del código', async ({ page }) => {
    const caja = await clicEnLaFranjaSuperior(page, '#login-code')

    const foco = await elementoConFoco(page)
    expect(
      foco.id,
      `clic a ${MARGEN_DE_CLIC} px del borde superior del campo (alto ${caja.envoltorio.height}px, ` +
        `control ${caja.control.height}px): el foco acabó en <${foco.tag.toLowerCase()}>`,
    ).toBe('login-code')
  })

  /**
   * La contraseña por separado porque su envoltorio lleva dentro OTRO objetivo
   * —el ojo— y es el hermano flex más alto quien decide el alto de la caja: el
   * campo puede crecer sin que crezca el control, que es justo la forma que
   * toma aquí la zona muerta.
   */
  test('el campo de contraseña reparte el relleno igual pese al botón del ojo', async ({
    page,
  }) => {
    const caja = await clicEnLaFranjaSuperior(page, '#login-password')

    const foco = await elementoConFoco(page)
    expect(foco.id, 'clic en la franja superior del campo de contraseña').toBe('login-password')

    expect(
      caja.envoltorio.height - caja.control.height,
      `envoltorio ${caja.envoltorio.height}px vs control ${caja.control.height}px: ` +
        'la diferencia es relleno del envoltorio, y eso es zona muerta',
    ).toBeLessThanOrEqual(4)
    expect(
      caja.control.height,
      `alto pulsable real del <input> (envoltorio ${caja.envoltorio.height}px)`,
    ).toBeGreaterThanOrEqual(24)
  })
})

/**
 * «Ver a fecha» es el QUINTO sitio que escribe el patrón de campo a mano —el
 * cuarto ya cubierto arriba es `/login`— y el único que no puede delegar en
 * `AppInput`: aquel emite en `input` y aquí el cambio se aplica al `change`,
 * porque un `<input type="date">` a medio teclear es otra fecha válida y
 * dispararía una consulta por dígito.
 *
 * Es además el control principal de la pantalla, no un filtro accesorio: si no
 * enfoca al primer clic, no se puede hacer la pregunta que la pantalla existe
 * para responder.
 *
 * No necesita backend: la ruta del expediente no declara `meta.permission`, así
 * que basta con la sesión sembrada y las cuatro respuestas de aquí abajo.
 */
const CONTRATO = {
  id: 1,
  subscriptionNumber: 'E2E-0001',
  companyId: 7,
  quoteId: null,
  priceListId: 1,
  billingCycle: 'MONTHLY',
  status: 'ACTIVE',
  current: true,
  startDate: '2026-01-01',
  trialEndDate: null,
  currentPeriodStart: '2026-01-01',
  currentPeriodEnd: '2026-01-31',
  nextBillingDate: '2026-02-01',
  commitmentEndDate: null,
  graceDays: 5,
  pastDueSince: null,
  autoRenew: true,
  cancelRequestedAt: null,
  cancelEffectiveDate: null,
  cancelReason: null,
  createdDate: '2026-01-01T10:00:00Z',
  enabled: true,
}

const PAGINA_SIN_LINEAS = { content: [], page: 0, pageSize: 200, totalElements: 0, totalPages: 0 }

async function abrirLoContratado(page: Page): Promise<void> {
  await bloquearFuentesRemotas(page)
  await page.route(/\/api\/v1\//, async (route) => {
    const ruta = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '')
    let cuerpo: unknown = PAGINA_SIN_LINEAS
    if (ruta === '/auth/me') cuerpo = { id: 1, name: 'Admin de pruebas', permissions: [] }
    else if (ruta === '/subscriptions/1') cuerpo = CONTRATO
    else if (ruta === '/companies/7')
      cuerpo = { id: 7, name: 'E2E Guarda Veterinaria', enabled: true }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cuerpo),
    })
  })
  await seedSession(page)
  await page.goto('/suscripciones/7/1/contratado')
  await expect(page.getByLabel('Ver a fecha')).toBeVisible()
  await esperarFuentes(page)
  await esperarVeloOculto(page)
}

test.describe('el relleno del campo de fecha de «Lo contratado»', () => {
  test('un clic a 4 px del borde superior enfoca el <input> de la fecha', async ({ page }) => {
    await abrirLoContratado(page)

    const caja = await clicEnLaFranjaSuperior(page, 'input[type="date"]')

    const foco = await elementoConFoco(page)
    expect(
      foco.tag,
      `clic a ${MARGEN_DE_CLIC} px del borde superior del campo (alto ${caja.envoltorio.height}px, ` +
        `control ${caja.control.height}px): el foco acabó en <${foco.tag.toLowerCase()}>`,
    ).toBe('INPUT')

    expect(
      caja.envoltorio.height - caja.control.height,
      `envoltorio ${caja.envoltorio.height}px vs control ${caja.control.height}px: ` +
        'la diferencia es relleno del envoltorio, y eso es zona muerta',
    ).toBeLessThanOrEqual(4)
    expect(
      caja.control.height,
      `alto pulsable real del <input> (envoltorio ${caja.envoltorio.height}px)`,
    ).toBeGreaterThanOrEqual(24)
  })
})
