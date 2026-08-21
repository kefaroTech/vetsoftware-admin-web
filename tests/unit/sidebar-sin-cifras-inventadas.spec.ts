import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'

/**
 * Guarda de EST-12 — el sidebar no inventa datos.
 *
 * La navegación llevaba siete contadores escritos a mano en el array `navGroups`
 * —«Empresas 128», «Empleados 1.8k», «Membresías 6», «Módulos 14»,
 * «Submódulos 52», «Permisos base 38», «Roles base 9»— heredados tal cual del
 * prototipo en JSX (`docs/design/project/app-shell.jsx`). No venían de ninguna
 * consulta: eran constantes. La consola mostraba «128 empresas» a un
 * administrador que acababa de crear la número 4.
 *
 * Esto no es un defecto estético. Es la interfaz afirmando un hecho falso sobre
 * el estado del sistema, en el único sitio que el usuario mira para orientarse,
 * y sin ninguna señal de que sea un adorno. La reacción correcta a un número en
 * un menú es creérselo.
 *
 * ── Por qué la prueba mira la FORMA del dato y no el marcado ───────────────
 * El arreglo borró la clase `.nav-count` y el campo `count` del tipo `NavLeaf`.
 * Una prueba que dijera «no existe `.nav-count`» pasaría para siempre en cuanto
 * alguien reintrodujera las cifras con otro nombre de clase, que es exactamente
 * como volvería: copiando otra vez del prototipo, o "provisionalmente, hasta
 * que el endpoint esté". Por eso lo que se afirma es que NINGÚN nodo de texto
 * del `<nav>` tiene forma de cifra, sea cual sea el marcado que lo envuelva.
 *
 * Cuando existan contadores REALES, esta prueba fallará — y debe fallar: es la
 * conversación de «¿de dónde sale ese número?» ocurriendo en el momento
 * correcto. Se relaja entonces, no antes.
 */

/** Un texto que el usuario leería como una cifra: `128`, `1.8k`, `1.234`, `9`. */
const FORMA_DE_CIFRA = /^\d[\d.,]*k?$/

/** Los siete contadores que EST-12 retiró, literales. */
const CIFRAS_RETIRADAS = ['128', '1.8k', '6', '14', '52', '38', '9']

const router = createRouter({
  history: createMemoryHistory(),
  // Comodín: al sidebar solo le importa `route.path` para marcar el activo y
  // decidir qué grupo va desplegado. Declarar las 19 rutas reales aquí sería
  // duplicar el router de producción para nada.
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
})

async function montarSidebar() {
  await router.push('/empresas')
  await router.isReady()

  return mount(AppSidebar, {
    global: {
      plugins: [router],
      // El pie de sesión queda fuera del `<nav>` y arrastra `useAuth`. No es lo
      // que se está probando.
      stubs: { SidebarUserCard: true },
    },
  })
}

/** Los textos visibles del `<nav>`, nodo a nodo y ya recortados. */
function textosDeLaNavegacion(nav: Element): string[] {
  const walker = nav.ownerDocument.createTreeWalker(nav, NodeFilter.SHOW_TEXT)
  const textos: string[] = []
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const texto = (node.textContent ?? '').trim()
    if (texto !== '') textos.push(texto)
  }
  return textos
}

describe('sidebar sin cifras inventadas (EST-12)', () => {
  it('ningún nodo de la navegación tiene forma de cifra', async () => {
    const wrapper = await montarSidebar()
    const nav = wrapper.find('nav')
    expect(nav.exists(), 'el sidebar dejó de tener un <nav>').toBe(true)

    const cifras = textosDeLaNavegacion(nav.element).filter((texto) => FORMA_DE_CIFRA.test(texto))

    expect(
      cifras,
      `el sidebar volvió a mostrar cifras que no vienen de ninguna consulta: ${cifras.join(', ')}`,
    ).toEqual([])
  })

  it('recorre de verdad los enlaces del menú', async () => {
    // Contrapartida: sin esto, un `<nav>` vacío —porque el montaje falló en
    // silencio o el marcado cambió— haría pasar la prueba de arriba sin mirar
    // nada. Los submenús usan `v-show`, así que sus hijos están en el DOM.
    const wrapper = await montarSidebar()
    const textos = textosDeLaNavegacion(wrapper.find('nav').element)

    expect(textos).toContain('Empresas')
    expect(textos).toContain('Permisos base')
    expect(textos).toContain('Especies') // hijo de un grupo desplegable
    expect(textos.length).toBeGreaterThan(15)
  })

  it.each(CIFRAS_RETIRADAS)('«%s» sería detectado si volviera', (cifra) => {
    // Y la contrapartida del matcher: que reconozca los siete literales que se
    // retiraron. Una expresión regular mal escrita dejaría la prueba de arriba
    // en verde permanente sin proteger nada.
    expect(FORMA_DE_CIFRA.test(cifra)).toBe(true)
  })

  it.each(['Empresas', 'Roles base', 'Membresías · Submódulos', 'Tipos de spa'])(
    '«%s» no se confunde con una cifra',
    (etiqueta) => {
      // Y que no sea tan ancho como para prohibir las etiquetas legítimas.
      expect(FORMA_DE_CIFRA.test(etiqueta)).toBe(false)
    },
  )
})
