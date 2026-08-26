import { describe, it, expect, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { COMPACT_MAX_WIDTH, useViewportStore } from '@/stores/viewport.store'

/**
 * Contrato ARIA del cajón de navegación — §6.4 de
 * `docs/ux/armazon-tablet-especificacion.md`.
 *
 * Lo que se sujeta aquí es el MARCADO, que es lo que decide si un lector de
 * pantalla y el recorrido de Tab se comportan como el diseño promete: el
 * landmark con nombre, las listas con su título, el `inert` del cajón cerrado
 * y el `aria-expanded` de la hamburguesa. Nada de esto necesita layout, así
 * que jsdom lo mide bien y la guarda sale barata.
 *
 * Lo que NO se puede afirmar aquí y por eso vive en
 * `e2e/tablet/armazon-tablet.spec.ts`: que el foco quede realmente atrapado,
 * que Tab no alcance la navegación oculta, y que un objetivo táctil mida 44 px.
 * jsdom no calcula cajas ni implementa el comportamiento de `inert`; afirmar
 * cualquiera de las tres cosas aquí sería afirmar la intención, no el hecho.
 *
 * ── Por qué pinia real y no `createTestingPinia` ───────────────────────────
 * `@pinia/testing` no es dependencia de este repositorio. `tests/unit/setup.ts`
 * instala una pinia NUEVA antes de cada prueba, así que el aislamiento —que es
 * lo que aporta el helper— ya está: ninguna prueba hereda el estado de otra ni
 * depende del orden. El estado del viewport se gobierna desde el propio
 * `matchMedia`, que es además el camino real del producto.
 */

/**
 * La banda la decide `useViewport` leyendo `matchMedia`, y jsdom devuelve
 * siempre `matches: false`. Sin este doble, todas las pruebas correrían en la
 * banda de escritorio y las de cajón pasarían sin ejercitar nada.
 */
function simularBanda(esCajon: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: esCajon,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

function crearRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    // Comodín, igual que en `sidebar-sin-cifras-inventadas.spec.ts`: al menú
    // solo le importa `route.path`, y declarar aquí las 37 rutas reales sería
    // duplicar el router de producción para nada.
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
}

const montados: VueWrapper[] = []

afterEach(() => {
  while (montados.length > 0) montados.pop()?.unmount()
  vi.unstubAllGlobals()
})

async function montarSidebar({ esCajon = true, abierto = false, ruta = '/empresas' } = {}) {
  simularBanda(esCajon)
  const router = crearRouter()
  await router.push(ruta)
  await router.isReady()

  const wrapper = mount(AppSidebar, {
    global: { plugins: [router] },
    // Al `<body>`: las pruebas de `aria-labelledby` resuelven el `id` contra el
    // documento, que es como lo resuelve un lector de pantalla.
    attachTo: document.body,
  })
  montados.push(wrapper)

  if (abierto) {
    useViewportStore().openNav()
    await nextTick()
  }
  return wrapper
}

async function montarCabecera({ esCajon = true } = {}) {
  simularBanda(esCajon)
  const router = crearRouter()
  await router.push('/empresas')
  await router.isReady()

  const wrapper = mount(AppHeader, { global: { plugins: [router] }, attachTo: document.body })
  montados.push(wrapper)
  return wrapper
}

describe('el <nav> es un landmark con nombre y listas anunciables (§1.3.1)', () => {
  it('la navegación se llama y es el ancla de aria-controls', async () => {
    const wrapper = await montarSidebar()
    const nav = wrapper.find('nav')

    expect(nav.exists()).toBe(true)
    expect(
      nav.attributes('aria-label'),
      'el landmark de navegación volvió a quedarse sin nombre',
    ).toBe('Navegación principal')
    expect(nav.attributes('id'), 'sin este id el aria-controls de la hamburguesa no resuelve').toBe(
      'app-nav',
    )
  })

  it('cada lista declara su título con un aria-labelledby que existe', async () => {
    const wrapper = await montarSidebar()
    const listas = wrapper.findAll('nav ul[aria-labelledby]')

    // Cuatro grupos: General, Suscripciones, Configuración y Sistema.
    expect(listas.length, 'los grupos del menú dejaron de ser listas nombradas').toBe(4)

    for (const lista of listas) {
      const id = lista.attributes('aria-labelledby') ?? ''
      const titulo = document.getElementById(id)
      expect(titulo, `aria-labelledby="${id}" no apunta a ningún elemento`).not.toBeNull()
      expect(titulo?.textContent?.trim(), 'el título del grupo está vacío').not.toBe('')
    }
  })

  it('las sublistas del acordeón también son listas', async () => {
    const wrapper = await montarSidebar()
    // `v-show`, así que están en el DOM aunque el grupo esté plegado.
    expect(wrapper.findAll('nav ul ul').length).toBeGreaterThanOrEqual(2)
    expect(wrapper.findAll('nav li').length).toBeGreaterThan(15)
  })

  it('ningún elemento de la navegación se oculta con .ds-sr-only (§8.8)', async () => {
    const wrapper = await montarSidebar()

    const ocultos = wrapper.findAll('nav .ds-sr-only')
    expect(
      ocultos.map((o) => o.text()),
      'volvió el apaño del raíl de iconos: un rótulo oculto es un rótulo que en táctil no aparece nunca',
    ).toEqual([])
  })

  it('la entrada de la ruta actual lleva aria-current="page"', async () => {
    const wrapper = await montarSidebar({ ruta: '/empresas' })
    const actuales = wrapper.findAll('[aria-current="page"]')

    expect(actuales.length, 'ninguna entrada se anuncia como la página actual').toBe(1)
    expect(actuales[0]?.text()).toBe('Empresas')
  })

  it('el padre de la rama activa se marca y se despliega', async () => {
    const wrapper = await montarSidebar({ ruta: '/catalogos-clinicos/tipos-vacuna' })

    const padre = wrapper.findAll('button').find((b) => b.text().includes('Catálogos clínicos'))
    expect(padre, 'se perdió el acordeón de Catálogos clínicos').toBeDefined()
    expect(padre?.attributes('aria-expanded'), 'la rama activa aparece plegada').toBe('true')

    const hija = wrapper.find('[aria-current="page"]')
    expect(hija.text()).toBe('Tipos de vacuna')
  })
})

describe('el <aside> cambia de naturaleza con la banda (§6.1)', () => {
  it('en la banda de cajón y cerrado: diálogo con nombre, e INERTE', async () => {
    const wrapper = await montarSidebar({ esCajon: true, abierto: false })
    const aside = wrapper.find('aside')

    expect(aside.attributes('role')).toBe('dialog')
    expect(aside.attributes('aria-modal')).toBe('true')
    expect(aside.attributes('aria-label')).toBe('Navegación principal')
    // `inert` es obligatorio, no una mejora: `transform: translateX(-100%)` deja
    // el panel en el flujo y sus 26 enlaces siguen recibiendo Tab fuera de
    // pantalla. En jsdom no existe la PROPIEDAD `inert`, así que Vue cae a
    // `setAttribute` y lo que se puede afirmar aquí es la presencia del
    // atributo; que el navegador lo respete se mide en el E2E.
    expect(
      aside.attributes('inert'),
      'el cajón cerrado dejó de ser inerte: Tab volvería a recorrer la navegación oculta',
    ).toBeDefined()
  })

  it('en la banda de cajón y abierto: deja de ser inerte', async () => {
    const wrapper = await montarSidebar({ esCajon: true, abierto: true })
    const aside = wrapper.find('aside')

    expect(
      aside.attributes('inert'),
      'el cajón abierto seguiría siendo inalcanzable',
    ).toBeUndefined()
    expect(aside.classes(), 'el cajón abierto no se desplaza a la vista').toContain('is-open')
    expect(aside.find('button[aria-label="Cerrar menú"]').exists()).toBe(true)
  })

  it('en escritorio NO es un diálogo ni es inerte', async () => {
    const wrapper = await montarSidebar({ esCajon: false })
    const aside = wrapper.find('aside')

    expect(aside.attributes('role'), 'un role="dialog" huérfano en escritorio').toBeUndefined()
    expect(aside.attributes('aria-modal')).toBeUndefined()
    expect(aside.attributes('inert')).toBeUndefined()
    expect(
      aside.find('button[aria-label="Cerrar menú"]').exists(),
      'el botón de cerrar el cajón no pinta nada en un menú persistente',
    ).toBe(false)
  })
})

describe('la hamburguesa sigue el patrón Disclosure del APG (§4.1.2)', () => {
  it('existe solo en la banda de cajón, apunta al <nav> y su nombre no cambia', async () => {
    const wrapper = await montarCabecera({ esCajon: true })
    const boton = wrapper.find('button[aria-label="Menú de navegación"]')

    expect(boton.exists()).toBe(true)
    expect(boton.attributes('aria-controls')).toBe('app-nav')
    expect(boton.attributes('aria-expanded')).toBe('false')

    await boton.trigger('click')
    expect(useViewportStore().navOpen).toBe(true)
    expect(
      boton.attributes('aria-expanded'),
      'el estado del cajón no llega al lector de pantalla',
    ).toBe('true')
    // La etiqueta NO alterna: el nombre describe el control, `aria-expanded`
    // describe el estado. Alternarla duplica la información y, en el instante
    // del cambio, algunos lectores anuncian las dos cosas.
    expect(boton.attributes('aria-label')).toBe('Menú de navegación')
  })

  it('en escritorio no se pinta', async () => {
    const wrapper = await montarCabecera({ esCajon: false })
    expect(wrapper.find('button[aria-label="Menú de navegación"]').exists()).toBe(false)
  })

  it('la banda que consulta es la misma constante que el CSS', () => {
    // Si `useViewport` consultara otro ancho que el `@media` de los SFC habría
    // una franja en la que el <aside> es un diálogo sin parecer un cajón.
    const consultadas: string[] = []
    vi.stubGlobal('matchMedia', (query: string) => {
      consultadas.push(query)
      return {
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }
    })

    const router = crearRouter()
    montados.push(mount(AppHeader, { global: { plugins: [router] } }))

    expect(consultadas).toContain(`(width <= ${COMPACT_MAX_WIDTH}px)`)
  })
})
