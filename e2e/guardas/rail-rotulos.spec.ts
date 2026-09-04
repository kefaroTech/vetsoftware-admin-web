import { test, expect } from '@playwright/test'
import { abrirArmazon, navegacion } from '../helpers/app-shell'

/**
 * Ningún rótulo del raíl se recorta.
 *
 * ── El defecto que caza ────────────────────────────────────────────────────
 * «Facturación de plataforma» no cabía en el raíl y `.ds-truncate` lo cortaba
 * con elipsis. Quien no conoce la consola lee «Facturación de plat…» y no sabe
 * si va a la facturación de SU clínica o a la de la plataforma: son dos
 * pantallas distintas y una de ellas no es asunto suyo. Aparecía en las 316
 * capturas de la auditoría, o sea en toda pantalla con el raíl abierto.
 *
 * ── Por qué esta prueba y no el cálculo ────────────────────────────────────
 * El arreglo —bajar el relleno del raíl de `--space-16` a `--space-12`— se
 * justificó con 171 px de ancho de texto CALCULADOS a partir de las métricas de
 * Inter, no medidos en un navegador. Un cálculo así no distingue entre caber y
 * caber por poco, y no ve el `letter-spacing`, el `font-weight` real ni el
 * hueco del icono. Esto lo convierte en un hecho comprobado.
 *
 * ── Criterio ───────────────────────────────────────────────────────────────
 * WCAG 2.2 §1.4.4 y §2.4.6: el rótulo tiene que poder leerse entero. Y la
 * heurística 6 de Nielsen —reconocer antes que recordar—, que es lo que un
 * rótulo cortado destruye.
 */

/** El rótulo que el arreglo perseguía; si desaparece del menú, la guarda miente. */
const ROTULO_CRITICO = 'Facturación de plataforma'

interface Rotulo {
  texto: string
  scrollWidth: number
  clientWidth: number
}

test.describe('el raíl de navegación', () => {
  test.beforeEach(async ({ page }) => {
    await abrirArmazon(page, '/empresas')
    await expect(navegacion(page)).toBeVisible()

    // Los acordeones nacen cerrados y sus hijas —las más estrechas, porque van
    // sangradas— son las que más riesgo tienen. Sin abrirlos, la guarda cubre
    // media navegación.
    //
    // Siempre el PRIMERO que quede plegado, y no una lista resuelta de golpe:
    // abrir uno lo saca del conjunto, así que un `nth(i)` capturado antes del
    // primer clic apunta a un elemento que para entonces ya no coincide y la
    // espera se agota sin decir por qué.
    const plegados = navegacion(page).getByRole('button', { expanded: false })
    for (let quedan = await plegados.count(); quedan > 0; quedan = await plegados.count()) {
      await plegados.first().click()
    }
  })

  test('ningún rótulo visible se recorta con elipsis', async ({ page }) => {
    const medidas = await page.evaluate(() => {
      const filas = Array.from(
        document.querySelectorAll<HTMLElement>('nav#app-nav a[title], nav#app-nav button[title]'),
      ).filter((el) => el.getClientRects().length > 0)
      return filas.flatMap((fila) => {
        // El rótulo es el primer `<span>` de la fila: los iconos son `<svg>`.
        const span = fila.querySelector('span')
        if (!span) return []
        return [
          {
            texto: fila.getAttribute('title') ?? '',
            scrollWidth: span.scrollWidth,
            clientWidth: span.clientWidth,
          },
        ]
      })
    })

    expect(medidas.length, 'no se midió ningún rótulo del raíl').toBeGreaterThan(10)
    expect(
      medidas.map((m) => m.texto),
      `el menú ya no publica «${ROTULO_CRITICO}»: esta guarda dejaría de proteger nada`,
    ).toContain(ROTULO_CRITICO)

    const recortados = medidas
      .filter((m: Rotulo) => m.scrollWidth > m.clientWidth)
      .map((m: Rotulo) => `${m.texto}: necesita ${m.scrollWidth}px y tiene ${m.clientWidth}px`)

    const anchoDelRail = await page
      .locator('aside')
      .evaluate((el) => el.getBoundingClientRect().width)
    expect(recortados, `rótulos cortados con elipsis en un raíl de ${anchoDelRail}px`).toEqual([])
  })
})
