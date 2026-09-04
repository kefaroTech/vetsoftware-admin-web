import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import { AUTH_STORAGE_KEY } from '@/services/storage/storage.service'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Arnés de CAPTURA Y MEDIDA de todas las pantallas de la consola.
 *
 * No es una suite de regresión: no compara contra ninguna línea base ni toca
 * `visual/__screenshots__`. Fotografía cada ruta del router en cuatro anchos y
 * mide su geometría para que otra persona audite maquetación y accesibilidad.
 *
 * Reutiliza el patrón sin backend de `e2e/helpers/app-shell.ts` y lo amplía en
 * los dos puntos que impedían usarlo para esto: el perfil simulado trae todos
 * los permisos, y el cuerpo que devuelve cada endpoint depende de la FORMA que
 * su llamador declara en TypeScript, no de un comodín único.
 */

/**
 * Los tres últimos anchos salen de los puntos de ruptura que el código declara,
 * no de una tabla de dispositivos: `COMPACT_MAX_WIDTH = 1024`
 * (`viewport.store.ts:15`) es el único corte que el proyecto decidió y es quien
 * convierte el `<aside>` en cajón; `760` y `680` son los dos siguientes más
 * usados en `primitives.css` y en los SFC.
 */
export const VIEWPORTS = [
  { nombre: 'escritorio', width: 1440, height: 900 },
  { nombre: 'portatil', width: 1280, height: 800 },
  { nombre: 'tablet-v', width: 768, height: 1024 },
  { nombre: 'movil', width: 390, height: 844 },
  { nombre: 'tablet-h', width: 1024, height: 768 },
  { nombre: 'estrecho-760', width: 760, height: 1024 },
  { nombre: 'estrecho-680', width: 680, height: 900 },
] as const

export type Modo = 'vacio' | 'lleno'

/** Forma del cuerpo que espera cada endpoint, deducida de su tipo genérico. */
export type Forma = 'pagina' | 'lista' | 'objeto'

export interface FormaEndpoint {
  patron: string
  forma: Forma
  origen: string
}

function base64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** JWT sin firma con `exp` en 2099. No sale del navegador: toda la API va interceptada. */
export const TOKEN_SIMULADO = [
  base64url({ alg: 'none', typ: 'JWT' }),
  base64url({ sub: '1', type: 'SYSTEM_USER', iat: 1_700_000_000, exp: 4_070_908_800 }),
  'sin-firma',
].join('.')

export const PERMISOS_SIMULADOS: string[] = Object.values(PERMISSIONS)

const FILAS = 25

/**
 * Existe para provocar el desbordamiento y la elipsis: una tabla solo enseña su
 * defecto de maquetación cuando una celda no cabe.
 */
const TEXTO_LARGO = 'UXA Nombre de prueba deliberadamente larguisimo para forzar elipsis y recorte'

const FECHA_FIJA = '2026-01-15T10:00:00Z'
const FECHA_FIJA_2 = '2026-03-01T08:30:00Z'

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Fila genérica y determinista. Lleva a la vez los nombres de campo de varias
 * familias porque un solo comodín sirve a todos los listados: la vista lee los
 * suyos e ignora el resto.
 */
export function filaGenerica(i: number): Record<string, unknown> {
  const n = i + 1
  const largo = n === 3
  const nombre = largo ? TEXTO_LARGO : `UXA Registro de prueba ${dosDigitos(n)}`
  const monto = largo ? 9_876_543_210.55 : 1_234_567.89 + n
  return {
    id: n,
    code: `UXA-${dosDigitos(n)}`,
    sku: `UXA-SKU-${dosDigitos(n)}`,
    name: nombre,
    displayName: nombre,
    label: nombre,
    title: nombre,
    description: largo ? TEXTO_LARGO : `Descripcion de prueba ${dosDigitos(n)}`,
    notes: largo ? TEXTO_LARGO : null,
    identifier: `900${100000 + n}-${n % 10}`,
    documentNumber: `UXA-DOC-${dosDigitos(n)}`,
    number: `UXA-${dosDigitos(n)}`,
    email: `uxa.prueba.${dosDigitos(n)}@ejemplo.invalid`,
    contactNumber: `+57 300 000 ${1000 + n}`,
    phone: `+57 300 000 ${1000 + n}`,
    address: largo ? TEXTO_LARGO : `Calle ${n} # ${n}-${n}`,
    enabled: n % 5 !== 0,
    active: n % 5 !== 0,
    status: n % 3 === 0 ? 'ACTIVE' : n % 3 === 1 ? 'PENDING' : 'CANCELLED',
    // `type` es de lista cerrada en 14 esquemas del contrato y el único que la
    // consola lista es `DocumentWithholdingResponse` (INCOME_TAX|VAT|ICA). Un
    // valor inventado deja la celda sin rótulo y eso se lee como un defecto de
    // la pantalla; `category` no es enum en ningún esquema y sí admite texto.
    type: 'VAT',
    category: 'UXA_CATEGORIA',
    currency: 'COP',
    amount: monto,
    total: monto,
    subtotal: monto,
    balance: monto,
    unitPrice: monto,
    price: monto,
    quantity: n,
    used: n,
    limit: 100,
    percentage: n * 4,
    createdDate: FECHA_FIJA,
    updatedDate: FECHA_FIJA_2,
    startDate: FECHA_FIJA,
    endDate: FECHA_FIJA_2,
    dueDate: FECHA_FIJA_2,
    issueDate: FECHA_FIJA,
    companyId: 7,
    company: { id: 7, name: 'UXA Empresa de prueba', identifier: '900123456-7' },
    city: { id: 1, name: 'Bogota D.C.' },
    state: { id: 1, name: 'Cundinamarca' },
    country: { id: 1, name: 'Colombia' },
    specie: { id: 1, name: 'UXA Especie de prueba' },
    catalogItem: { id: n, code: `UXA-${dosDigitos(n)}`, name: nombre },
    subscriptionId: 184,
    items: [],
    permissions: [],
    children: [],
  }
}

export function paginaGenerica(): Record<string, unknown> {
  return {
    content: Array.from({ length: FILAS }, (_, i) => filaGenerica(i)),
    page: 0,
    pageSize: FILAS,
    totalElements: 137,
    totalPages: Math.ceil(137 / FILAS),
  }
}

const PAGINA_VACIA = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 }

function ficherosApi(directorio: string, acumulado: string[]): string[] {
  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada)
    if (statSync(ruta).isDirectory()) ficherosApi(ruta, acumulado)
    else if (entrada.endsWith('.api.ts')) acumulado.push(ruta)
  }
  return acumulado
}

/** Las constantes de módulo cuyo valor es una URL literal. */
function constantesDeRuta(fuente: string): Map<string, string> {
  const constantes = new Map<string, string>()
  for (const c of fuente.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])([^'"`\\]*)\2/gm)) {
    constantes.set(c[1] ?? '', c[3] ?? '')
  }
  return constantes
}

/**
 * La URL de una llamada, con las constantes del propio fichero sustituidas.
 *
 * Media docena de clientes declaran la ruta arriba (`const DIMENSIONS =
 * '/limit-dimensions'`) y la llamada solo la nombra, entera o interpolada. Sin
 * resolverla no hay literal que inventariar, y una constante interpolada
 * tampoco es un solo segmento: `${SYSTEM_OVERRIDES}` vale tres.
 */
function resolverRuta(expresion: string, constantes: Map<string, string>): string {
  const constante = constantes.get(expresion)
  if (constante !== undefined) return constante
  return expresion.replace(
    /\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g,
    (todo, nombre: string) => constantes.get(nombre) ?? todo,
  )
}

function aPatron(literal: string): string {
  const escapado = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Un `${expr}` que sobrevive a `resolverRuta` es un parámetro de ruta, no una
  // constante: casa con cualquier cosa que no sea una barra.
  return `^${escapado.replace(/\\\$\\\{[^}]*\\\}/g, '[^/]+')}$`
}

/**
 * Qué forma tiene el cuerpo de cada GET, leída del propio código de los
 * servicios: `PageResponse<T>` es una página, `T[]` una lista y el resto un
 * objeto. Sin esto, un comodín que devuelve siempre una página rompe las
 * pantallas de catálogo, que esperan un array (`species.api.ts:10`).
 */
export function inventariarEndpoints(raizRepo: string): FormaEndpoint[] {
  const encontrados: FormaEndpoint[] = []
  // El tipo genérico no admite `(`, acento grave ni llave —ningún tipo del repo
  // los lleva— y esa restricción es la que impide que una llamada sin literal se
  // empareje con la URL de la SIGUIENTE del fichero, o que un `http.get<…>`
  // citado en un comentario se coma la llamada de verdad que viene detrás.
  const patronLlamada = /http\.get<([^()`;{}]*?)>\(\s*(?:(['"`])([^'"`]*)\2|([A-Za-z_$][\w$]*))/g
  for (const fichero of ficherosApi(join(raizRepo, 'src'), [])) {
    const fuente = readFileSync(fichero, 'utf8')
    const constantes = constantesDeRuta(fuente)
    for (const coincidencia of fuente.matchAll(patronLlamada)) {
      const tipo = coincidencia[1] ?? ''
      const ruta = resolverRuta(coincidencia[3] ?? coincidencia[4] ?? '', constantes)
      if (!ruta.startsWith('/')) continue
      const forma: Forma = tipo.trim().endsWith('[]')
        ? 'lista'
        : tipo.includes('PageResponse<')
          ? 'pagina'
          : 'objeto'
      encontrados.push({ patron: aPatron(ruta), forma, origen: fichero })
    }
  }
  // Lo más específico primero: `/species/{id}/breeds` antes que `/species/{id}`.
  return encontrados.sort((a, b) => b.patron.length - a.patron.length)
}

/** La escala de espaciado del propio `tokens.css`, no una inventada. */
export function escalaEspaciado(raizRepo: string): number[] {
  const fuente = readFileSync(join(raizRepo, 'src/assets/styles/tokens.css'), 'utf8')
  const valores = new Set<number>([0])
  for (const coincidencia of fuente.matchAll(/--space-[\w-]+:\s*(\d+(?:\.\d+)?)px/g)) {
    valores.add(Number(coincidencia[1]))
  }
  return [...valores].sort((a, b) => a - b)
}

export interface Control {
  modo: Modo
  /**
   * Ruta de API que debe responder 500, para fotografiar el banner de error.
   *
   * Es el único camino: el banner compuesto —icono, texto, identificador de
   * traza y «Reintentar»— solo existe cuando la carga falla, y con la API
   * interceptada no hay servidor al que tumbar.
   */
  fallar?: string
}

/** `ProblemDetail` de `api.types.ts`, que es lo que lee `errorFrom()`. */
const PROBLEMA = {
  type: 'about:blank',
  title: 'Error interno',
  status: 500,
  detail: 'No se pudo cargar el registro. Vuelve a intentarlo en unos segundos.',
  code: 'UXA_ERROR_SIMULADO',
  traceId: 'uxa-0000000000000000',
}

export async function interceptarApi(
  page: Page,
  formas: FormaEndpoint[],
  control: Control,
): Promise<void> {
  const compilados = formas.map((f) => ({ regex: new RegExp(f.patron), forma: f.forma }))
  await page.route(/\/api\/v1\//, async (route) => {
    const ruta = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '')
    if (control.fallar !== undefined && new RegExp(control.fallar).test(ruta)) {
      await route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify(PROBLEMA),
      })
      return
    }
    let cuerpo: unknown
    if (ruta === '/auth/me') {
      cuerpo = {
        id: 1,
        name: 'UXA Operador de prueba',
        email: 'uxa.operador@ejemplo.invalid',
        permissions: PERMISOS_SIMULADOS,
      }
    } else if (route.request().method() !== 'GET') {
      cuerpo = filaGenerica(0)
    } else {
      const forma = compilados.find((c) => c.regex.test(ruta))?.forma ?? formaPorDefecto(ruta)
      cuerpo = cuerpoDe(forma, control.modo)
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cuerpo),
    })
  })
}

function formaPorDefecto(ruta: string): Forma {
  return /\/\d+$/.test(ruta) || ruta.endsWith('/current') ? 'objeto' : 'pagina'
}

/**
 * En `vacio` una ficha sigue devolviendo su objeto: una pantalla de detalle sin
 * datos no es un estado vacío, es una pantalla rota, y fotografiarla no dice
 * nada de la maquetación. El estado vacío que sí se audita es el de los
 * listados.
 */
function cuerpoDe(forma: Forma, modo: Modo): unknown {
  if (forma === 'objeto') return filaGenerica(modo === 'lleno' ? 2 : 0)
  if (modo === 'vacio') return forma === 'lista' ? [] : PAGINA_VACIA
  return forma === 'lista'
    ? Array.from({ length: FILAS }, (_, i) => filaGenerica(i))
    : paginaGenerica()
}

export async function sembrarSesion(page: Page): Promise<void> {
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

export async function bloquearFuentesRemotas(page: Page): Promise<void> {
  // Se responde una hoja vacía en vez de abortar: un `abort()` deja en la
  // consola un `Failed to load resource: net::ERR_FAILED` por pantalla, y ese
  // ruido es indistinguible de un error real de la aplicación en el informe.
  // Sin `@font-face` no se pide ningún fichero a `gstatic`.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  )
}

/**
 * Las familias del producto desde disco. No es cosmética: si un rótulo cabe o
 * no en su caja depende de la fuente con la que se pinte, y con Google Fonts
 * bloqueado la medida sería la de la fuente de respaldo del sistema.
 */
export async function reponerFuentes(page: Page): Promise<void> {
  await page.addStyleTag({ url: '/visual/fonts.css' })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

export const velo = (page: Page) => page.locator('[role="alert"][aria-busy="true"]')

/** Peticiones a la API en vuelo, contadas desde Node. */
export interface Trafico {
  enVuelo: number
}

/**
 * Cuenta cuántas peticiones a `/api/v1/` hay pendientes.
 *
 * Es la señal de «la pantalla ya tiene sus datos», y se cuenta aquí y no con
 * `networkidle` porque Vite en desarrollo transforma módulos a demanda y la red
 * nunca llega a quedarse quieta: esa espera costaba cinco segundos por pantalla
 * sin comprobar nada que este contador no compruebe.
 */
export function seguirTraficoApi(page: Page): Trafico {
  const trafico: Trafico = { enVuelo: 0 }
  const esApi = (url: string) => url.includes('/api/v1/')
  page.on('request', (peticion) => {
    if (esApi(peticion.url())) trafico.enVuelo += 1
  })
  const cerrar = (peticion: { url: () => string }) => {
    if (esApi(peticion.url())) trafico.enVuelo -= 1
  }
  page.on('requestfinished', cerrar)
  page.on('requestfailed', cerrar)
  return trafico
}

/**
 * Espera a que la pantalla esté pintada, CON SUS DATOS y sin velo.
 *
 * Las cuatro esperas hacen falta y ninguna sustituye a otra:
 *
 * · `#app` con hijos solo dice que el armazón montó. La vista pide sus datos
 *   DESPUÉS, así que quedarse aquí fotografía el esqueleto de carga.
 * · Tres lecturas seguidas del contador a cero, y no una: la primera podría
 *   caer en el hueco entre que el armazón monta y que la vista pide lo suyo.
 * · El esqueleto (`.ds-skeleton`) es la segunda red, para lo que pinta antes de
 *   que su petición salga.
 * · El velo (`loader.store.ts`) se muestra a los 200 ms y se mantiene 300 ms
 *   más allá de la última respuesta, así que hay una ventana en la que el
 *   contenido ya está y la pantalla sigue tapada. Va el ÚLTIMO por eso mismo.
 */
export async function esperarPantalla(page: Page, trafico?: Trafico): Promise<void> {
  await page.waitForFunction(
    () => {
      const app = document.querySelector('#app')
      return app !== null && app.children.length > 0
    },
    undefined,
    { timeout: 20_000 },
  )
  if (trafico !== undefined) {
    let cerosSeguidos = 0
    await expect
      .poll(
        () => {
          cerosSeguidos = trafico.enVuelo <= 0 ? cerosSeguidos + 1 : 0
          return cerosSeguidos
        },
        { timeout: 15_000, intervals: [60] },
      )
      .toBeGreaterThanOrEqual(3)
  }
  // Blando: una pantalla que dejara un esqueleto puesto para siempre no debe
  // tumbar la pasada, y `conteos.elementosPintados` ya delata una captura fina.
  await page
    .locator('.ds-skeleton')
    .first()
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => undefined)
  await reponerFuentes(page)
  await expect(velo(page)).toBeHidden({ timeout: 20_000 })
}

export function slugDeRuta(ruta: string): string {
  const limpio = ruta
    .split('?')[0]
    ?.replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toLowerCase()
  return limpio !== undefined && limpio.length > 0 ? limpio : 'raiz'
}

/** Valor con el que se sustituye cada parámetro de ruta, declarado en el JSON. */
export const PARAMETROS: Record<string, string> = {
  id: '1',
  companyId: '7',
  catalogItemId: '1',
  specieId: '1',
  subscriptionId: '184',
}

export function concretarRuta(patron: string): {
  ruta: string
  parametros: Record<string, string>
} {
  const usados: Record<string, string> = {}
  const ruta = patron.replace(/:(\w+)(\([^)]*\))?/g, (_todo, nombre: string) => {
    const valor = PARAMETROS[nombre] ?? '1'
    usados[nombre] = valor
    return valor
  })
  return { ruta, parametros: usados }
}
