import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test } from '@playwright/test'
import {
  bloquearFuentesRemotas,
  esperarPantalla,
  interceptarApi,
  inventariarEndpoints,
  sembrarSesion,
  seguirTraficoApi,
  type Control,
  type Modo,
} from './arnes'

/**
 * Las dos pantallas que el arnés tumbaba por servirles una página donde su
 * cliente declara un array.
 *
 * No comprueba maquetación: comprueba que el cuerpo simulado tiene la forma que
 * el contrato promete y que la vista, con él, no revienta.
 */

const SCRATCH =
  process.env.UXA_SCRATCH ??
  'C:/Users/ORLAND~1/AppData/Local/Temp/claude/C--Users-Orlando-Velasquez-Documents-Proyectos-MainVetSoftware/f56969b5-ac11-4b7e-87fc-3e60aee284b8/scratchpad'

interface Caso {
  slug: string
  ruta: string
  /** Endpoint cuyo cuerpo se inspecciona; el contrato lo declara array. */
  endpoint: RegExp
  sintoma: string
}

const CASOS: Caso[] = [
  {
    slug: 'limites-ejes',
    ruta: '/limites/ejes',
    endpoint: /\/api\/v1\/limit-dimensions(\?|$)/,
    sintoma: 'LimitDimensionsListView.vue:35 — dimensions.value.filter',
  },
  {
    slug: 'catalogo-articulo-puentes',
    ruta: '/catalogo-comercial/articulos/1',
    endpoint: /\/api\/v1\/limit-dimensions(\?|$)/,
    sintoma: 'useCatalogItemLimits.ts:50 — dimensions.value.map',
  },
]

const MODOS: Modo[] = ['vacio', 'lleno']

test('las dos pantallas del arnés roto pintan con la forma del contrato', async ({
  browser,
}, testInfo) => {
  test.setTimeout(0)
  const configuracion = testInfo.config.configFile
  const raiz = configuracion === undefined ? process.cwd() : dirname(configuracion)
  const formas = inventariarEndpoints(raiz)
  const control: Control = { modo: 'lleno' }
  const informe: unknown[] = []

  const contexto = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  })
  const page = await contexto.newPage()
  await bloquearFuentesRemotas(page)
  await interceptarApi(page, formas, control)
  await sembrarSesion(page)
  const trafico = seguirTraficoApi(page)

  let errores: string[] = []
  page.on('pageerror', (error) => errores.push(String(error.message).slice(0, 300)))
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') errores.push(mensaje.text().slice(0, 300))
  })

  for (const caso of CASOS) {
    for (const modo of MODOS) {
      control.modo = modo
      errores = []
      let cuerpo: unknown = null
      const capturar = async (respuesta: { url: () => string; json: () => Promise<unknown> }) => {
        if (caso.endpoint.test(respuesta.url())) cuerpo = await respuesta.json()
      }
      page.on('response', capturar)
      await page.goto(caso.ruta, { waitUntil: 'load', timeout: 45_000 })
      await esperarPantalla(page, trafico)
      page.off('response', capturar)

      const pintado = await page.evaluate(() => ({
        elementos: document.querySelectorAll('main#contenido *').length,
        filas: document.querySelectorAll('main#contenido tbody tr').length,
        titulo: (document.querySelector('main#contenido h1, main#contenido h2')?.textContent ?? '')
          .trim()
          .slice(0, 60),
      }))

      // Solo los del síntoma: la fila genérica del arnés provoca ruido de
      // consola ajeno a la forma del cuerpo, y meterlo aquí convertiría en rojo
      // algo que esta comprobación no mide.
      const deForma = errores.filter((e) => /is not a function|is not iterable/.test(e))

      const donde = `${caso.ruta} [${modo}]`
      informe.push({
        slug: caso.slug,
        ruta: caso.ruta,
        modo,
        sintoma: caso.sintoma,
        cuerpoEsArray: Array.isArray(cuerpo),
        elementosDelCuerpo: Array.isArray(cuerpo) ? cuerpo.length : null,
        pintado,
        erroresDeForma: deForma,
        otrosErrores: errores.filter((e) => !deForma.includes(e)),
      })

      expect(Array.isArray(cuerpo), `${donde}: /limit-dimensions no devolvió un array`).toBe(true)
      expect(deForma, `${donde}: ${caso.sintoma}`).toEqual([])
      expect(pintado.elementos, `${donde}: la pantalla no llegó a pintarse`).toBeGreaterThan(30)
      if (modo === 'lleno') {
        expect(pintado.filas, `${donde}: ninguna fila pintada`).toBeGreaterThan(0)
      }
    }
  }

  await contexto.close()
  mkdirSync(SCRATCH, { recursive: true })
  writeFileSync(
    join(SCRATCH, 'uxa-verificacion-formas-admin.json'),
    JSON.stringify({ repo: 'admin-web', pantallas: informe }, null, 2),
    'utf8',
  )
})
