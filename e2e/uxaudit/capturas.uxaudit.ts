import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test, type Page } from '@playwright/test'
import {
  bloquearFuentesRemotas,
  concretarRuta,
  escalaEspaciado,
  esperarPantalla,
  interceptarApi,
  inventariarEndpoints,
  PARAMETROS,
  PERMISOS_SIMULADOS,
  sembrarSesion,
  seguirTraficoApi,
  slugDeRuta,
  VIEWPORTS,
  type Control,
  type Modo,
} from './arnes'
import { medir, type Metricas } from './medidas'

/**
 * Fotografía y mide TODAS las pantallas de la consola, sin backend.
 *
 * Se ejecuta con `playwright.uxaudit.config.ts`, que es configuración propia:
 * ni `playwright.config.ts` ni `playwright.visual.config.ts` la ven, y este
 * fichero no acaba en `.spec.ts` justamente para que la suite de flujo no lo
 * recoja.
 */

const SCRATCH =
  process.env.UXA_SCRATCH ??
  'C:/Users/ORLAND~1/AppData/Local/Temp/claude/C--Users-Orlando-Velasquez-Documents-Proyectos-MainVetSoftware/f56969b5-ac11-4b7e-87fc-3e60aee284b8/scratchpad'

const MODOS: Modo[] = ['vacio', 'lleno']

/** Sufijo de los ficheros de salida, para no pisar los de una pasada anterior. */
const SUFIJO = process.env.UXA_SUFIJO ?? ''

const salida = (base: string) => join(SCRATCH, `uxa-${base}-admin${SUFIJO}.json`)

/**
 * Con qué severidad debe leerse un defecto en cada ancho.
 *
 * `docs/ux/armazon-tablet-especificacion.md` §3 declara que la consola solo
 * promete 768 px hacia arriba, así que un defecto por debajo de ese ancho no es
 * el mismo hallazgo que uno a 1024: se fotografía para ver si algo se rompe de
 * forma catastrófica, no para reportarlo como grave.
 */
const CALIBRACION = {
  soportePrometido:
    'La consola promete 768 px hacia arriba (docs/ux/armazon-tablet-especificacion.md §3)',
  severidadPorViewport: {
    escritorio: 'normal',
    portatil: 'normal',
    'tablet-h': 'normal — 1024 px es COMPACT_MAX_WIDTH (viewport.store.ts:15)',
    'tablet-v': 'normal — mínimo prometido',
    'estrecho-760': 'nota — por debajo de los 768 px prometidos',
    'estrecho-680': 'nota — por debajo de los 768 px prometidos',
    movil: 'nota — por debajo de los 768 px prometidos; un defecto aquí NO es grave',
  },
  avisos: [
    'portatil (1280 px) NO dispara el @media (width <= 1279px) de DashboardView.vue:473: /dashboard se fotografía en su estado ancho, no en el estrecho.',
    'Los avisos «Invalid prop … label=undefined» y los pageerror de `toLowerCase` los provoca la fila genérica del arnés, que no trae el campo exacto que esa vista lee. Son una pista de que la pantalla no se defiende de un campo ausente, no la prueba de un defecto con datos reales.',
    '`peticionesAbortadas` recoge los net::ERR_ABORTED que deja la navegación a la ruta siguiente. No son fallos: los de verdad van en `peticionesFallidas`.',
    'Los elementos de menos de 3 px de lado no se miden: es el patrón .ds-sr-only, y contarlo falseaba texto truncado, alineación y objetivos táctiles.',
    'Cada pantalla se espera a que no queden peticiones a /api/v1 en vuelo y a que no quede ningún .ds-skeleton: sin eso se fotografiaba el esqueleto de carga. `conteos.elementosPintados` es la señal para descartar una captura fina: por debajo de 30 la pantalla no llegó a pintarse.',
    'Tipografía verificada (uxa-verificacion-admin.json): /visual/fonts.css declara 10 caras y las 5 que la pantalla pinta cargan de verdad. El ancho de una cadena en Inter es 297,01 px contra 257,36 px de la familia de respaldo, así que las capturas NO están hechas con la fuente del sistema.',
    'objetivosPequenos filtra por el rect del elemento y añade `envoltorio` (la caja visible) y `exencionInline` (§2.5.8, objetivo dentro de texto corrido). El envoltorio de campo NO es el objetivo: un clic sobre su relleno deja el foco en el landmark, no en el input (verificado).',
  ],
} as const

/** Rutas públicas que esperan un token en la cadena de consulta. */
const CONSULTA_EXTRA: Record<string, string> = {
  '/aprobar-acceso': 'token=UXA-TOKEN-DE-PRUEBA',
  '/aceptar-invitacion': 'token=UXA-TOKEN-DE-PRUEBA',
}

interface RegistroRouter {
  path: string
  name: string | null
  permission: string | null
  isPublic: boolean
  hasComponent: boolean
  hasRedirect: boolean
}

interface Objetivo {
  patron: string
  ruta: string
  url: string
  slug: string
  nombre: string | null
  permission: string | null
  isPublic: boolean
  parametros: Record<string, string>
  datosSimulados: boolean
}

interface Incidencia {
  tipo: string
  texto: string
}

interface ResultadoPantalla {
  slug: string
  ruta: string
  viewport: string
  modo: Modo
  estado: 'ok' | 'redirigida' | 'fallo'
  urlFinal: string
  captura: string | null
  error: string | null
  consola: Incidencia[]
  peticionesFallidas: string[]
  peticionesAbortadas: string[]
  metricas: Metricas | null
}

interface ResultadoModal {
  slug: string
  ruta: string
  disparador: string
  captura: string | null
  error: string | null
}

/**
 * El armazón fija `height: 100dvh` y hace de `main.app-content` el único
 * contenedor de scroll (`AppLayout.vue`), así que `fullPage` a secas devolvería
 * siempre un recorte del alto del viewport y todo lo que hay bajo la línea de
 * flotación quedaría sin fotografiar. Se desclava SOLO para la captura, después
 * de medir: las medidas tienen que ser las de la pantalla real.
 */
const CSS_EXPANDIR = `
  html, body, #app { height: auto !important; overflow: visible !important; }
  .app-shell { height: auto !important; min-height: 100dvh !important; overflow: visible !important; }
  .app-main { overflow: visible !important; }
  .app-content { overflow: visible !important; }
`

async function capturaExpandida(page: Page, destino: string): Promise<void> {
  const marca = await page.addStyleTag({ content: CSS_EXPANDIR })
  try {
    await page.screenshot({ path: destino, fullPage: true, animations: 'disabled', scale: 'css' })
  } finally {
    await marca.evaluate((el) => {
      ;(el as Element).remove()
    })
  }
}

test('captura y mide todas las pantallas de la consola', async ({ browser }, testInfo) => {
  test.setTimeout(0)

  // La raíz del repo es la del fichero de configuración: `config.rootDir` es el
  // ancestro común de los `testDir`, que aquí es `e2e/uxaudit`.
  const configuracion = testInfo.config.configFile
  const raiz = configuracion === undefined ? process.cwd() : dirname(configuracion)
  // `UXA_DESTINO` permite fotografiar el árbol arreglado sin pisar la tanda del
  // «antes», que es la línea de partida contra la que se compara.
  const destinoCapturas = resolve(raiz, '..', '_capturas', process.env.UXA_DESTINO ?? 'admin')
  const formas = inventariarEndpoints(raiz)
  const escala = escalaEspaciado(raiz)
  const control: Control = { modo: 'lleno' }

  /* ── Inventario de rutas, leído del router YA MONTADO ──────────────────
   * Un parseo estático de `router/routes/*.ts` se deja fuera las pestañas de
   * los expedientes: las descubre `import.meta.glob` en tiempo de ejecución. */
  const contextoDescubrimiento = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  })
  const paginaDescubrimiento = await contextoDescubrimiento.newPage()
  await bloquearFuentesRemotas(paginaDescubrimiento)
  await interceptarApi(paginaDescubrimiento, formas, control)
  await sembrarSesion(paginaDescubrimiento)
  const traficoDescubrimiento = seguirTraficoApi(paginaDescubrimiento)
  await paginaDescubrimiento.goto('/dashboard')
  await esperarPantalla(paginaDescubrimiento, traficoDescubrimiento)

  const registros: RegistroRouter[] = await paginaDescubrimiento.evaluate(() => {
    interface RutaVue {
      path: string
      name?: string | symbol | null
      meta?: Record<string, unknown>
      components?: Record<string, unknown> | null
      redirect?: unknown
    }
    interface AppVue {
      config: { globalProperties: { $router: { getRoutes: () => RutaVue[] } } }
    }
    const contenedor = document.querySelector('#app') as (Element & { __vue_app__?: AppVue }) | null
    const app = contenedor?.__vue_app__
    if (app === undefined) return []
    return app.config.globalProperties.$router.getRoutes().map((r) => ({
      path: r.path,
      name: typeof r.name === 'string' ? r.name : null,
      permission: typeof r.meta?.permission === 'string' ? r.meta.permission : null,
      isPublic: r.meta?.public === true,
      hasComponent: Object.keys(r.components ?? {}).length > 0,
      hasRedirect: r.redirect !== undefined && r.redirect !== null,
    }))
  })
  await contextoDescubrimiento.close()

  const objetivos: Objetivo[] = registros
    .filter((r) => r.hasComponent && !r.hasRedirect)
    .map((r) => {
      const { ruta, parametros } = concretarRuta(r.path)
      const consulta = CONSULTA_EXTRA[ruta]
      return {
        patron: r.path,
        ruta,
        url: consulta === undefined ? ruta : `${ruta}?${consulta}`,
        slug: slugDeRuta(ruta),
        nombre: r.name,
        permission: r.permission,
        isPublic: r.isPublic,
        parametros,
        datosSimulados: Object.keys(parametros).length > 0,
      }
    })
    .sort((a, b) => a.ruta.localeCompare(b.ruta))
    // `UXA_LIMITE` existe para la pasada de humo: la tanda completa cuesta media
    // hora y llegar hasta el final para descubrir que el arnés no montaba es el
    // error caro de esta tarea.
    .slice(0, Number(process.env.UXA_LIMITE ?? Number.MAX_SAFE_INTEGER))

  mkdirSync(SCRATCH, { recursive: true })
  writeFileSync(
    salida('rutas'),
    JSON.stringify(
      {
        repo: 'admin-web',
        generado: 'arnés uxaudit, router en tiempo de ejecución',
        valoresDeParametro: PARAMETROS,
        permisosSimulados: PERMISOS_SIMULADOS,
        totalRegistrosDelRouter: registros.length,
        totalPantallas: objetivos.length,
        descartadas: registros
          .filter((r) => !r.hasComponent || r.hasRedirect)
          .map((r) => ({
            path: r.path,
            motivo: r.hasRedirect ? 'redirección' : 'sin componente',
          })),
        pantallas: objetivos,
      },
      null,
      2,
    ),
    'utf8',
  )

  const resultados: ResultadoPantalla[] = []
  const modales: ResultadoModal[] = []
  const volcarMetricas = () => {
    writeFileSync(
      salida('metricas'),
      JSON.stringify(
        {
          repo: 'admin-web',
          calibracion: CALIBRACION,
          escalaEspaciado: escala,
          pantallas: resultados,
        },
        null,
        2,
      ),
      'utf8',
    )
  }

  // `UXA_VIEWPORTS` deja repetir solo los anchos que falten sin volver a
  // fotografiar los que ya están en disco.
  const pedidos = (process.env.UXA_VIEWPORTS ?? '').split(',').filter((v) => v.trim() !== '')
  const elegidos =
    pedidos.length === 0 ? [...VIEWPORTS] : VIEWPORTS.filter((v) => pedidos.includes(v.nombre))

  for (const viewport of elegidos) {
    const contexto = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
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

    let consola: Incidencia[] = []
    let fallidas: string[] = []
    let abortadas: string[] = []
    page.on('console', (mensaje) => {
      const tipo = mensaje.type()
      if (tipo === 'error' || tipo === 'warning') {
        consola.push({ tipo, texto: mensaje.text().slice(0, 400) })
      }
    })
    page.on('pageerror', (error) => {
      consola.push({ tipo: 'pageerror', texto: String(error.message).slice(0, 400) })
    })
    page.on('requestfailed', (peticion) => {
      const motivo = peticion.failure()?.errorText ?? ''
      const linea = `${peticion.method()} ${peticion.url()} — ${motivo}`
      // `ERR_ABORTED` lo deja la navegación a la ruta siguiente, que se lleva
      // por delante lo que estuviera en vuelo, y también el `AbortSignal` con
      // el que las búsquedas servidas cancelan la petición anterior. Mezclarlo
      // con los fallos de verdad esconde a estos últimos.
      if (motivo.includes('ERR_ABORTED')) abortadas.push(linea)
      else fallidas.push(linea)
    })

    for (const objetivo of objetivos) {
      for (const modo of MODOS) {
        control.modo = modo
        consola = []
        fallidas = []
        abortadas = []
        const captura = join(destinoCapturas, viewport.nombre, `${objetivo.slug}__${modo}.png`)
        const registro: ResultadoPantalla = {
          slug: objetivo.slug,
          ruta: objetivo.ruta,
          viewport: viewport.nombre,
          modo,
          estado: 'ok',
          urlFinal: '',
          captura: null,
          error: null,
          consola: [],
          peticionesFallidas: [],
          peticionesAbortadas: [],
          metricas: null,
        }
        try {
          await page.goto(objetivo.url, { waitUntil: 'load', timeout: 45_000 })
          await esperarPantalla(page, trafico)
          registro.urlFinal = new URL(page.url()).pathname
          if (registro.urlFinal !== objetivo.ruta) registro.estado = 'redirigida'
          registro.metricas = await medir(page, escala)
          await capturaExpandida(page, captura)
          registro.captura = captura
        } catch (error) {
          registro.estado = 'fallo'
          registro.error = error instanceof Error ? error.message.slice(0, 500) : String(error)
          registro.urlFinal = registro.urlFinal === '' ? page.url() : registro.urlFinal
          try {
            await page.screenshot({ path: captura, animations: 'disabled', scale: 'css' })
            registro.captura = captura
          } catch {
            registro.captura = null
          }
        }
        registro.consola = consola.slice(0, 20)
        registro.peticionesFallidas = fallidas.slice(0, 20)
        registro.peticionesAbortadas = abortadas.slice(0, 20)
        resultados.push(registro)

        /* ── Diálogos ────────────────────────────────────────────────────
         * Solo en escritorio y con datos: un modal no cambia con el ancho
         * tanto como para pagar cuatro pasadas, y muchos formularios solo
         * ofrecen su botón cuando hay algo listado. */
        if (viewport.nombre !== 'escritorio' || modo !== 'lleno' || registro.estado === 'fallo') {
          continue
        }
        // Dentro de `main` y sin los `submit`: el botón «Nueva empresa» del
        // armazón está en TODAS las pantallas y no abre el diálogo de ninguna,
        // y un `submit` envía el formulario en vez de abrir nada.
        const disparador = page
          .locator('main#contenido')
          .getByRole('button', { name: /crear|nuev[ao]|añadir|agregar|registrar/i })
          .and(page.locator('button:not([type="submit"])'))
          .first()
        if ((await disparador.count()) === 0) continue
        const resultadoModal: ResultadoModal = {
          slug: objetivo.slug,
          ruta: objetivo.ruta,
          disparador: '',
          captura: null,
          error: null,
        }
        try {
          resultadoModal.disparador = (await disparador.textContent())?.trim() ?? '(sin texto)'
          await disparador.click({ timeout: 5_000 })
          const dialogo = page.locator('[role="dialog"], [role="alertdialog"]').first()
          await dialogo.waitFor({ state: 'visible', timeout: 5_000 })
          const destinoModal = join(destinoCapturas, viewport.nombre, `${objetivo.slug}__modal.png`)
          await page.screenshot({ path: destinoModal, animations: 'disabled', scale: 'css' })
          resultadoModal.captura = destinoModal
        } catch (error) {
          resultadoModal.error =
            error instanceof Error ? error.message.slice(0, 300) : String(error)
        }
        modales.push(resultadoModal)
      }
    }

    volcarMetricas()
    await contexto.close()
  }

  const porEstado = (estado: ResultadoPantalla['estado']) =>
    resultados.filter((r) => r.estado === estado)
  writeFileSync(
    salida('resultado'),
    JSON.stringify(
      {
        repo: 'admin-web',
        calibracion: CALIBRACION,
        viewports: elegidos.map((v) => v.nombre),
        modos: MODOS,
        directorioCapturas: destinoCapturas,
        totalPantallas: objetivos.length,
        totalCapturas: resultados.filter((r) => r.captura !== null).length,
        ok: porEstado('ok').length,
        redirigidas: porEstado('redirigida').map((r) => ({
          slug: r.slug,
          viewport: r.viewport,
          modo: r.modo,
          urlFinal: r.urlFinal,
        })),
        fallidas: porEstado('fallo').map((r) => ({
          slug: r.slug,
          viewport: r.viewport,
          modo: r.modo,
          error: r.error,
        })),
        modales,
      },
      null,
      2,
    ),
    'utf8',
  )
  volcarMetricas()
})
