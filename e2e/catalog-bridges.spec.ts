import { test, expect, type Page } from '@playwright/test'

/**
 * <b>Los dos comportamientos de los editores de puentes que se verificaron a
 * mano una vez</b> (`/catalogo-comercial/articulos/:id`, §4.1, W3-A).
 *
 * <p>Los dos se eligieron porque <b>no se ven sin abrir el navegador</b>: uno
 * depende de una propiedad estructurada del error que el servidor solo manda en
 * el caso de rechazo, y el otro de una fila que el `GET` no devuelve porque está
 * dada de baja. Un test de unidad sobre el composable pasaría con el servidor
 * apagado; estos no.
 *
 * <h3>Los dos casos se limpian solos, y es deliberado</h3>
 *
 * <ul>
 *   <li><b>El ciclo</b> lo <i>rechaza</i> el servidor: al terminar no hay nada
 *       creado que borrar, y el propio test comprueba que la tabla quedó como
 *       estaba.</li>
 *   <li><b>La reactivación</b> da de baja un vínculo y lo vuelve a activar. El
 *       backend revive la MISMA fila (`UPDATE … SET enabled = TRUE`, issue #432),
 *       conservando `id` y `createdDate`, así que el estado final es idéntico al
 *       inicial. El `afterEach` restituye si el test muere a medias.</li>
 * </ul>
 *
 * <p><b>El artículo que se toca aquí no lo toca ningún otro spec.</b> Este usa
 * `CORE`; `accessibility.spec.ts` usa `CLINICAL_HISTORY`. Dos specs que dieran de
 * baja el mismo vínculo se contaminarían entre sí en cuanto uno fallara a mitad,
 * y el segundo fallaría por un motivo que no es el suyo.
 */

/** Artículos de la semilla de laboratorio (contexto Liquibase `local,e2e`). */
const CORE = {
  id: 13,
  /** Etiqueta de la FILA de la tabla. */
  screenRow: 'Agenda',
  /** Etiqueta de la OPCIÓN del selector: lleva delante el módulo («General · …»). */
  screenOption: 'General · Agenda',
} as const

const CASH_REGISTER = { id: 16, code: 'CASH_REGISTER' } as const
const ELECTRONIC_INVOICING = { code: 'ELECTRONIC_INVOICING' } as const

async function abrirArticulo(page: Page, id: number) {
  await page.goto(`/catalogo-comercial/articulos/${id}`)
  await expect(page.getByRole('heading', { name: 'Qué pantallas abre' })).toBeVisible()
  // El encabezado se pinta ANTES de que lleguen los puentes: sin esperar a que
  // la red calle, un `count()` —que no reintenta— leería la tabla vacía y
  // concluiría que no hay vínculo. Ese fue el fallo que se llevó por delante
  // dos casos: el `afterEach` intentaba entonces vincular una pantalla que ya
  // estaba vinculada, cuya opción por eso no aparece en el selector, y se
  // quedaba esperándola hasta agotar el tiempo.
  await page.waitForLoadState('networkidle')
}

/** La fila de una pantalla dentro de la tabla «Qué pantallas abre». */
function filaPantalla(page: Page, nombre: string) {
  return page
    .getByRole('table')
    .filter({ hasText: 'Pantalla' })
    .getByRole('row')
    .filter({ hasText: nombre })
}

/** Vuelve a vincular la pantalla si no está. Idempotente. */
async function asegurarVinculo(page: Page, item: typeof CORE) {
  await abrirArticulo(page, item.id)
  if ((await filaPantalla(page, item.screenRow).count()) > 0) return
  await page.getByRole('combobox', { name: /Pantalla que abre este artículo/ }).click()
  await page.getByRole('option', { name: item.screenOption, exact: true }).click()
  await page.getByRole('button', { name: 'Vincular' }).click()
  await expect(filaPantalla(page, item.screenRow)).toHaveCount(1)
}

test.describe('editores de puentes del artículo', () => {
  test('el ciclo de dependencias se pinta con su ruta completa, no con un «hay un ciclo»', async ({
    page,
  }) => {
    await abrirArticulo(page, CASH_REGISTER.id)

    const reglas = page.getByRole('table').filter({ hasText: 'El otro artículo' })
    const reglasAntes = await reglas.getByRole('row').count()

    await page.getByRole('button', { name: 'Nueva regla' }).click()

    // El formulario vive en un diálogo: se acota ahí para no capturar por error
    // los controles del panel que queda debajo.
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()

    // `CASH_REGISTER` requiere `ELECTRONIC_INVOICING`, que ya requiere
    // `CASH_REGISTER`: bucle de longitud 2.
    await dialogo.getByRole('combobox', { name: /El otro artículo de la regla/ }).click()
    await page.getByRole('option', { name: new RegExp(ELECTRONIC_INVOICING.code) }).click()

    await dialogo.getByRole('combobox', { name: /Tipo de regla/ }).click()
    await page.getByRole('option', { name: 'Requiere', exact: true }).click()

    await dialogo
      .getByLabel(/Mensaje para el cliente/)
      .fill('Regla de prueba E2E — el servidor debe rechazarla.')

    await dialogo.getByRole('button', { name: 'Crear regla' }).click()

    const aviso = page.getByRole('alert').filter({ hasText: 'cerraría un bucle' })
    await expect(aviso).toBeVisible()

    // Lo que se fija NO es que avise, sino que diga POR DÓNDE va el bucle: la
    // ruta sale de la propiedad estructurada `cycle` del ProblemDetail, y sin
    // ella el operador no sabe qué arco sobra.
    const texto = (await aviso.textContent()) ?? ''
    expect(texto, 'la ruta del bucle debe venir encadenada con flechas').toContain('→')
    expect(texto).toContain(CASH_REGISTER.code)
    expect(texto).toContain(ELECTRONIC_INVOICING.code)

    // El formulario se conserva abierto a propósito tras el rechazo
    // (`CatalogItemDependenciesPanel.submit()`: «El modal se conserva»), así que
    // el banner queda DETRÁS del diálogo. Hay que cerrarlo para poder actuar
    // sobre él: es el comportamiento real de la pantalla, no un rodeo del test.
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo).toBeHidden()

    // Y que el rechazo no dejó nada creado.
    await page.getByRole('button', { name: 'Entendido' }).click()
    await expect(reglas.getByRole('row')).toHaveCount(reglasAntes)
  })

  test('dar de baja un vínculo y volver a crearlo dice que se reactivó, no que se creó', async ({
    page,
  }) => {
    await abrirArticulo(page, CORE.id)
    await expect(filaPantalla(page, CORE.screenRow)).toHaveCount(1)

    // ── Baja ────────────────────────────────────────────────────────────────
    await page.getByRole('button', { name: `Quitar ${CORE.screenRow}` }).click()
    await page.getByRole('button', { name: 'Quitar pantalla' }).click()
    await expect(filaPantalla(page, CORE.screenRow)).toHaveCount(0)

    // ── Alta del MISMO par ──────────────────────────────────────────────────
    await page.getByRole('combobox', { name: /Pantalla que abre este artículo/ }).click()
    await page.getByRole('option', { name: CORE.screenOption, exact: true }).click()
    await page.getByRole('button', { name: 'Vincular' }).click()

    // El backend responde 201 en los dos casos y el DTO no trae bandera: que la
    // pantalla acierte a decir «ya existía» es justo lo que falló la primera vez
    // que se probó a mano.
    await expect(
      page.getByRole('status').filter({ hasText: 'Ya existía dado de baja' }),
    ).toBeVisible()

    // Y la fila vuelve, que es lo que deja el sistema como estaba.
    await expect(filaPantalla(page, CORE.screenRow)).toHaveCount(1)
  })

  // Red de seguridad SOLO para el caso que da de baja un vínculo: si muere entre
  // la baja y el alta, se queda dado de baja y la siguiente tirada partiría de
  // otro estado. El caso del ciclo no toca ningún puente de submódulo —el
  // servidor rechaza su alta— así que restituirlo ahí sería una navegación
  // entera de puro gasto, y era además lo que le hacía agotar el tiempo.
  test.afterEach(async ({ page }, testInfo) => {
    if (!testInfo.title.includes('reactivó')) return
    await asegurarVinculo(page, CORE)
  })
})
