import { expect, type Page } from '@playwright/test'
// La clave se toma de su FUENTE, `storage.service.ts`, y no del helper de
// sesión de al lado. No es preferencia de estilo: `visual/shell-tablet.visual
// .spec.ts` importa este módulo, y `visual/**` sí entra en `tsconfig.app.json`.
// Importar `./session` arrastraría su `process.env` al typecheck de la
// aplicación —que se compila con `types: ["vite/client"]`, sin los tipos de
// Node— y `vue-tsc -b` fallaría con «Cannot find name 'process'» en un fichero
// que nadie ha tocado. Por el mismo motivo aquí no se usa `Buffer`.
import { AUTH_STORAGE_KEY } from '@/services/storage/storage.service'

/**
 * Arnés del ARMAZÓN de la consola: sesión y API simuladas, sin backend.
 *
 * ── Por qué este arnés y no `helpers/session.ts` ───────────────────────────
 * `session.ts` autentica contra el backend real, y hace bien: los E2E de flujo
 * comprueban que el producto habla con su servidor. Lo que se verifica aquí no
 * es el flujo, es la GEOMETRÍA del armazón —cuántas barras de scroll hay, si
 * el documento desborda, si un objetivo táctil mide 44 px—, y para eso el
 * backend no aporta nada y sí quita: sin él la suite no corre, y con él las
 * medidas dependen de cuántas filas haya sembradas ese día.
 *
 * Todo el tráfico a `/api/v1/` se intercepta, así que el token de abajo NO
 * viaja a ningún servidor ni se valida contra nada: es el mínimo que hace que
 * `authGuard` deje pasar (`authStore.token`) y que `decodeJwt` lea un `exp`
 * lejano en vez de dar la sesión por vencida.
 *
 * ── Por qué el contenido es largo A PROPÓSITO ──────────────────────────────
 * El defecto que se está protegiendo —dos barras de scroll— NO se manifiesta
 * en una pantalla vacía: sin desbordamiento no hay barra que contar y la
 * prueba pasaría igual con el armazón roto. Por eso el listado se sirve con
 * 40 empresas: a 768×1024 y a 1024×768 el contenido excede el alto disponible
 * con holgura, y las medidas de scroll son significativas.
 */

export const TABLET_VERTICAL = { width: 768, height: 1024 } as const
export const TABLET_HORIZONTAL = { width: 1024, height: 768 } as const
export const ESCRITORIO = { width: 1280, height: 900 } as const

/** Las dos orientaciones de tablet que exige §8 de la especificación. */
export const VIEWPORTS_TABLET = [
  { nombre: '768x1024 vertical', viewport: TABLET_VERTICAL },
  { nombre: '1024x768 horizontal', viewport: TABLET_HORIZONTAL },
] as const

/** Filas del listado. Suficientes para desbordar el alto en las dos orientaciones. */
export const FILAS = 40

/** base64url sin `Buffer`: ver el comentario del import de arriba. */
function base64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * JWT sin firma, con `exp` en 2099. No se envía a ningún sitio: `stubApi()`
 * intercepta todas las peticiones antes de que salgan del navegador.
 */
export const TOKEN_SIMULADO = [
  base64url({ alg: 'none', typ: 'JWT' }),
  base64url({ sub: '1', type: 'SYSTEM_USER', iat: 1_700_000_000, exp: 4_070_908_800 }),
  'sin-firma',
].join('.')

/**
 * Empresas de mentira, marcadas como datos de prueba y con fecha FIJA: la
 * regresión visual fotografía esta tabla y una fecha calculada al vuelo haría
 * que la captura cambiara sola cada día.
 */
function paginaDeEmpresas(pageSize = FILAS) {
  return {
    content: Array.from({ length: pageSize }, (_, i) => ({
      id: i + 1,
      name: `E2E Armazon Veterinaria ${String(i + 1).padStart(2, '0')}`,
      identifier: `900${String(100000 + i)}-${i % 10}`,
      address: null,
      contactNumber: `+57 300 000 ${String(1000 + i)}`,
      city: { id: 1, name: 'Bogota D.C.' },
      createdDate: '2026-01-15T10:00:00Z',
      enabled: i % 5 !== 0,
    })),
    page: 0,
    pageSize,
    totalElements: 137,
    totalPages: Math.ceil(137 / pageSize),
  }
}

const PAGINA_VACIA = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 }

/**
 * Intercepta TODA la API. Un solo manejador en vez de varias rutas: Playwright
 * resuelve las rutas en orden inverso al de registro, y depender de ese orden
 * es la clase de detalle que se rompe al añadir un caso.
 */
export async function stubApi(page: Page): Promise<void> {
  await page.route(/\/api\/v1\//, async (route) => {
    const ruta = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '')
    let cuerpo: unknown = PAGINA_VACIA
    if (ruta === '/auth/me') cuerpo = { id: 1, name: 'Admin de pruebas', permissions: [] }
    else if (ruta === '/companies' || ruta === '/companies/search') cuerpo = paginaDeEmpresas()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cuerpo),
    })
  })
}

/** Deja la sesión en `localStorage` ANTES de que arranque la aplicación. */
export async function seedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ([clave, valor]) => {
      window.localStorage.setItem(clave, valor)
    },
    [AUTH_STORAGE_KEY, JSON.stringify({ token: TOKEN_SIMULADO, type: 'SYSTEM_USER' })] as [
      string,
      string,
    ],
  )
}

/**
 * Las familias del producto desde disco, igual que `visual/login.visual.spec.ts`.
 *
 * No es cosmética: el criterio 7 mide si el rótulo de una entrada cabe sin
 * elipsis, y eso depende de la fuente con la que se pinte. Con Google Fonts
 * bloqueado y sin reponer la familia local, la medida sería la de la fuente de
 * respaldo del sistema — otra métrica, y distinta en cada máquina.
 */
export async function bloquearFuentesRemotas(page: Page): Promise<void> {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
}

export async function esperarFuentes(page: Page): Promise<void> {
  await page.addStyleTag({ url: '/visual/fonts.css' })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

/** Abre una ruta de la consola con sesión y API simuladas, y espera al armazón. */
export async function abrirArmazon(page: Page, ruta = '/empresas'): Promise<void> {
  await bloquearFuentesRemotas(page)
  await stubApi(page)
  await seedSession(page)
  await page.goto(ruta)
  await expect(page.locator('main#contenido')).toBeVisible()
  await esperarFuentes(page)
}

/** Abre el listado de empresas y espera a que las 40 filas estén pintadas. */
export async function abrirListadoLargo(page: Page): Promise<void> {
  await abrirArmazon(page, '/empresas')
  await expect(page.getByRole('heading', { name: 'Empresas', level: 1 })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(FILAS)
}

/** El botón que abre el cajón. Por rol y nombre accesible, nunca por clase. */
export const hamburguesa = (page: Page) =>
  page.getByRole('button', { name: 'Menú de navegación', exact: true })

/** La X del cajón. */
export const cerrarCajon = (page: Page) =>
  page.getByRole('button', { name: 'Cerrar menú', exact: true })

/** El `<aside>`: en la banda de cajón es un `dialog`; en escritorio, una región. */
export const cajon = (page: Page) => page.locator('aside')

/** La navegación. `#app-nav` es el ancla de `aria-controls`, no una clase de estilo. */
export const navegacion = (page: Page) => page.locator('nav#app-nav')

/**
 * Contenedores del árbol que HOY desbordan verticalmente y ofrecen scroll.
 *
 * Se miden los dos hechos a la vez —`overflow-y` desplazable Y contenido que
 * excede la caja— porque el criterio es «cuántas barras ve el usuario», no
 * «cuántas declaraciones hay en el CSS»: un `overflow: auto` sobre contenido
 * que cabe no pinta ninguna barra y no debe contarse.
 *
 * ── Por qué se separan «visibles» y «fuera de pantalla» ────────────────────
 * A 1024×768 la lista del cajón NO cabe en 768 px de alto, así que
 * `.nav-groups` desborda y es un contenedor desplazable **incluso con el cajón
 * cerrado**. La lectura literal del criterio §8.3 —«exactamente un contenedor
 * de scroll en el árbol»— lo cuenta y lo da por incumplido; la lectura útil
 * —«cuántas barras ve y alcanza el usuario»— no, porque ese panel está en
 * x = −280 y marcado `inert`. Se devuelven las dos cifras para que el informe
 * pueda decir exactamente cuál de las dos cosas pasa, en vez de elegir una
 * lectura y esconder la otra.
 */
export async function scrollersVerticales(
  page: Page,
): Promise<{ visibles: string[]; fueraDePantalla: string[] }> {
  return page.evaluate(() => {
    const nombre = (el: Element) => {
      const clases = String((el as HTMLElement).className || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      const id = el.id ? `#${el.id}` : ''
      return `${el.tagName.toLowerCase()}${id}${clases.length ? `.${clases.join('.')}` : ''}`
    }
    const alcanzable = (el: Element) => {
      if (el.closest('[inert]') !== null) return false
      const r = el.getBoundingClientRect()
      return r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight
    }
    const desplazables = Array.from(document.querySelectorAll('*')).filter((el) => {
      const overflow = getComputedStyle(el).overflowY
      if (overflow !== 'auto' && overflow !== 'scroll') return false
      return el.scrollHeight - el.clientHeight > 1
    })
    return {
      visibles: desplazables.filter(alcanzable).map(nombre),
      fueraDePantalla: desplazables.filter((el) => !alcanzable(el)).map(nombre),
    }
  })
}

/** Medidas del documento: si desborda en vertical o en horizontal. */
export async function medidasDelDocumento(page: Page) {
  return page.evaluate(() => {
    const raiz = document.scrollingElement as HTMLElement
    return {
      scrollHeight: raiz.scrollHeight,
      clientHeight: raiz.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }
  })
}

/** Tamaño real de un objetivo táctil, medido con `getBoundingClientRect()`. */
export async function tamano(page: Page, selectorAria: string) {
  return page.evaluate((nombre) => {
    const el = document.querySelector<HTMLElement>(`[aria-label="${nombre}"]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  }, selectorAria)
}
