import { expect, type Page } from '@playwright/test'

/**
 * Arnés de la GALERÍA (`visual/gallery.html`) para las guardas de interacción.
 *
 * ── Por qué la galería y no una pantalla de la consola ─────────────────────
 * Lo que estas guardas miden —dónde empieza la caja pulsable de un campo, si
 * un `mousedown` sin `mouseup` cambia un valor— es geometría y protocolo de
 * puntero de las PRIMITIVAS, no de ninguna pantalla en concreto. La galería
 * monta esas primitivas reales con valores fijos y sin router ni sesión, así
 * que la medida no depende de qué haya sembrado en la base de datos ni de qué
 * ruta sobreviva a las guardas de permisos.
 *
 * ── Por qué hace falta un navegador de verdad ──────────────────────────────
 * jsdom no coloca nada: todo rectángulo mide 0×0, así que «el clic a 4 px del
 * borde superior cae dentro del `<input>`» es incomprobable ahí. Y su
 * `mousedown` sintético tampoco mueve el foco como lo mueve el navegador, que
 * es justo la mitad invisible de la corrección de `AppSelect`.
 */
export const GALERIA = '/visual/gallery.html'

/**
 * Abre la galería con las familias del producto ya cargadas.
 *
 * Esperar a `document.fonts.ready` no es cosmética: la altura de un campo la
 * fija la caja de línea del `<input>`, y con la fuente de respaldo del sistema
 * esa altura es otra — la medida saldría distinta en cada máquina.
 */
export async function abrirGaleria(page: Page): Promise<void> {
  await page.goto(GALERIA)
  await expect(page.getByRole('heading', { name: 'Campos de formulario' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

/**
 * Geometría de un control de la familia de campos, medida en el navegador.
 *
 * `medirCampo` y `elementoConFoco` no dependen de la galería: sirven igual
 * sobre una pantalla del producto, y por eso los usa también la guarda del
 * buscador de listados.
 */
export interface CajaDeCampo {
  /** El envoltorio `.ds-field`, que es lo que el usuario percibe como el campo. */
  envoltorio: { top: number; left: number; width: number; height: number }
  /** El control nativo de dentro, que es lo único que recibe el foco al pulsar. */
  control: { top: number; left: number; width: number; height: number }
}

/**
 * Mide el envoltorio y el control nativo de un campo.
 *
 * Se llega al envoltorio por `parentElement` y no por su clase: la clase es
 * estilo y podría renombrarse, mientras que «el padre del control» es la
 * estructura que la guarda afirma.
 */
export async function medirCampo(page: Page, selectorDelControl: string): Promise<CajaDeCampo> {
  const caja = await page.evaluate((selector) => {
    const control = document.querySelector<HTMLElement>(selector)
    if (!control) throw new Error(`no se encontró el control «${selector}»`)
    const envoltorio = control.parentElement
    if (!envoltorio) throw new Error(`el control «${selector}» no tiene envoltorio`)
    const r = (el: Element) => {
      const b = el.getBoundingClientRect()
      return { top: b.top, left: b.left, width: b.width, height: b.height }
    }
    return { envoltorio: r(envoltorio), control: r(control) }
  }, selectorDelControl)
  return caja
}

/** Qué elemento tiene el foco ahora mismo, en términos comprobables. */
export async function elementoConFoco(page: Page): Promise<{ tag: string; id: string }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return { tag: el?.tagName ?? 'NINGUNO', id: el?.id ?? '' }
  })
}
