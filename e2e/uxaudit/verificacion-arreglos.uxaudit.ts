import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test, type Page } from '@playwright/test'
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
 * Muestra dirigida para comprobar seis arreglos concretos sobre la pantalla
 * real, que es lo que la suite visual no cubre: su galería fotografía
 * primitivas sueltas, no vistas montadas con datos.
 *
 * Escribe en `_capturas/admin-verificacion/` y NO en `_capturas/admin/`, que es
 * la fotografía del «antes» contra la que se compara.
 */

const SCRATCH =
  process.env.UXA_SCRATCH ??
  'C:/Users/ORLAND~1/AppData/Local/Temp/claude/C--Users-Orlando-Velasquez-Documents-Proyectos-MainVetSoftware/f56969b5-ac11-4b7e-87fc-3e60aee284b8/scratchpad'

const VIEWPORTS = [
  { nombre: 'escritorio', width: 1440, height: 900 },
  { nombre: 'tablet-h', width: 1024, height: 768 },
] as const

interface Caso {
  slug: string
  ruta: string
  modo: Modo
  /** Ruta de API que se hace fallar, para provocar el banner compuesto. */
  fallar?: string
  comprueba: string
}

const CASOS: Caso[] = [
  {
    slug: '01-login',
    ruta: '/login',
    modo: 'lleno',
    comprueba: 'Campos con el relleno movido al control (5)',
  },
  {
    slug: '02-dashboard',
    ruta: '/dashboard',
    modo: 'lleno',
    comprueba: 'Raíl, cabecera sin campana y tarjeta de sesión (1, 2, 3)',
  },
  {
    slug: '03-empresas-listado',
    ruta: '/empresas',
    modo: 'lleno',
    comprueba: 'Listado sin desplazamiento y buscador (1, 2, 5)',
  },
  {
    slug: '04-empresa-expediente',
    ruta: '/empresas/1/resumen',
    modo: 'lleno',
    comprueba: 'Pestaña activa distinguible (6)',
  },
  {
    slug: '05-contrato-expediente',
    ruta: '/suscripciones/7/1/resumen',
    modo: 'lleno',
    comprueba: 'Pestaña activa distinguible en la segunda barra (6)',
  },
  {
    slug: '06-cotizaciones',
    ruta: '/cotizaciones',
    modo: 'lleno',
    comprueba: 'Listado ancho (5)',
  },
  {
    slug: '07-ficha-catalogo',
    ruta: '/catalogos-clinicos/tipos-consulta/1',
    modo: 'lleno',
    comprueba: 'Formulario de ficha con campos (5)',
  },
  {
    slug: '08-banner-ficha-especie',
    ruta: '/animales/especies/1',
    modo: 'lleno',
    fallar: '^/species/\\d+$',
    comprueba: 'Banner compuesto capado a 66ch en contenedor ancho (4)',
  },
  {
    slug: '09-banner-ficha-modulo',
    ruta: '/modulos/1',
    modo: 'lleno',
    fallar: '^/modules/\\d+$',
    comprueba: 'Banner compuesto capado a 66ch en contenedor ancho (4)',
  },
  {
    slug: '10-banner-listado-modulos',
    ruta: '/modulos',
    modo: 'lleno',
    fallar: '^/modules$',
    comprueba: 'Banner de error de un listado, a ancho completo (4)',
  },
]

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

/** Las medidas que responden a las seis preguntas sin tener que ojear el PNG. */
async function medirArreglos(page: Page) {
  return page.evaluate(() => {
    const caja = (selector: string) => {
      const el = document.querySelector(selector)
      if (el === null) return null
      const r = el.getBoundingClientRect()
      return {
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
        left: Math.round(r.left * 10) / 10,
      }
    }

    const rotulosRecortados = Array.from(document.querySelectorAll('.nav-label')).flatMap((el) => {
      if (el.scrollWidth <= el.clientWidth + 1) return []
      return [
        {
          texto: (el.textContent ?? '').trim(),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        },
      ]
    })

    // Los bordes izquierdos del raíl: icono de entrada contra rótulo de grupo.
    const izquierdasDelRail = {
      iconos: [
        ...new Set(
          Array.from(document.querySelectorAll('nav#app-nav .nav-item svg, nav#app-nav svg')).map(
            (el) => Math.round(el.getBoundingClientRect().left * 10) / 10,
          ),
        ),
      ].slice(0, 6),
      titulosDeGrupo: [
        ...new Set(
          Array.from(document.querySelectorAll('nav#app-nav [class*="group"]')).map(
            (el) => Math.round(el.getBoundingClientRect().left * 10) / 10,
          ),
        ),
      ].slice(0, 6),
    }

    const banners = Array.from(document.querySelectorAll('.ds-banner')).map((el) => {
      const r = el.getBoundingClientRect()
      const padre = el.parentElement
      const rp = padre?.getBoundingClientRect()
      return {
        clases: String((el as HTMLElement).className),
        width: Math.round(r.width),
        anchoDelContenedor: rp === undefined ? null : Math.round(rp.width),
        // Cuánto del ancho disponible ocupa: un banner compuesto al 45 % deja
        // el botón «Reintentar» flotando en mitad de una fila vacía.
        porcentajeDelContenedor:
          rp === undefined || rp.width === 0 ? null : Math.round((r.width / rp.width) * 100),
        maxWidth: getComputedStyle(el).maxWidth,
        elementos: el.children.length,
        conBoton: el.querySelector('button') !== null,
        texto: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 90),
      }
    })

    const campos = Array.from(document.querySelectorAll('.ds-field'))
      .slice(0, 6)
      .map((el) => {
        const r = el.getBoundingClientRect()
        const control = el.querySelector('input, textarea, select')
        const rc = control?.getBoundingClientRect()
        return {
          selector: `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className)
            .split(/\s+/)
            .slice(0, 2)
            .join('.')}`,
          envoltorio: { width: Math.round(r.width), height: Math.round(r.height * 10) / 10 },
          control:
            rc === undefined
              ? null
              : { width: Math.round(rc.width), height: Math.round(rc.height * 10) / 10 },
          // Lo que decide §2.5.8: si el control llena la caja, el objetivo es el
          // control entero y no su interior.
          huecoVertical: rc === undefined ? null : Math.round((r.height - rc.height) * 10) / 10,
        }
      })

    const pestanas = Array.from(document.querySelectorAll('[role="tab"], .ds-tab, a[aria-current]'))
      .slice(0, 12)
      .map((el) => {
        const s = getComputedStyle(el)
        return {
          texto: (el.textContent ?? '').trim().slice(0, 30),
          activa:
            el.getAttribute('aria-selected') === 'true' ||
            el.getAttribute('aria-current') === 'page' ||
            el.className.includes('active'),
          color: s.color,
          fondo: s.backgroundColor,
          borderBottom: `${s.borderBottomWidth} ${s.borderBottomColor}`,
          peso: s.fontWeight,
        }
      })

    return {
      documento: {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        desborda: document.documentElement.scrollWidth > window.innerWidth,
      },
      rotulosRecortados,
      izquierdasDelRail,
      cabecera: caja('header, .app-header'),
      campana: document.querySelector('[aria-label*="otificacion" i]') !== null,
      tarjetaDeSesion: caja('.sidebar-user-card, [class*="user-card"]'),
      banners,
      campos,
      pestanas,
    }
  })
}

test('recaptura dirigida de los seis arreglos', async ({ browser }, testInfo) => {
  test.setTimeout(0)
  const configuracion = testInfo.config.configFile
  const raiz = configuracion === undefined ? process.cwd() : dirname(configuracion)
  const destino = resolve(raiz, '..', '_capturas', 'admin-verificacion')
  const formas = inventariarEndpoints(raiz)
  const control: Control = { modo: 'lleno' }
  const informe: unknown[] = []

  for (const viewport of VIEWPORTS) {
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
    let consola: string[] = []
    page.on('pageerror', (error) => consola.push(String(error.message).slice(0, 200)))

    for (const caso of CASOS) {
      control.modo = caso.modo
      control.fallar = caso.fallar
      consola = []
      const png = join(destino, viewport.nombre, `${caso.slug}.png`)
      const entrada: Record<string, unknown> = {
        slug: caso.slug,
        ruta: caso.ruta,
        viewport: viewport.nombre,
        comprueba: caso.comprueba,
        captura: png,
      }
      try {
        await page.goto(caso.ruta, { waitUntil: 'load', timeout: 45_000 })
        await esperarPantalla(page, trafico)
        entrada.medidas = await medirArreglos(page)
        await capturaExpandida(page, png)
      } catch (error) {
        entrada.error = error instanceof Error ? error.message.slice(0, 300) : String(error)
      }
      entrada.pageerror = consola.slice(0, 5)
      informe.push(entrada)
    }
    await contexto.close()
  }

  mkdirSync(SCRATCH, { recursive: true })
  writeFileSync(
    join(SCRATCH, 'uxa-verificacion-arreglos-admin.json'),
    JSON.stringify({ repo: 'admin-web', directorio: destino, pantallas: informe }, null, 2),
    'utf8',
  )
})
