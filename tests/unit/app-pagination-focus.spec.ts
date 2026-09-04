import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { elemento } from '../helpers/exigir'

/**
 * R02 · al llegar al último borde, el botón pulsado se deshabilita bajo el
 * foco. El navegador lo suelta y el foco queda en `<body>`: el siguiente `Tab`
 * reinicia el recorrido desde el principio del documento y quien navega con
 * teclado tiene que atravesar la cabecera otra vez para volver a la tabla.
 *
 * `tests/unit/pagination.spec.ts` prueba el composable `useServerPaged`, no
 * este componente: sus casos son de rango y bordes numéricos y no verían nada
 * de esto.
 */

let wrapper: VueWrapper | null = null

/** El padre de verdad reacciona a `update:page` en el mismo tick que el emit. */
function montar(page: number, pageCount: number, total: number) {
  const w: VueWrapper = mount(AppPagination, {
    attachTo: document.body,
    props: {
      page,
      pageSize: 20,
      total,
      pageCount,
      'onUpdate:page': (valor: number) => {
        void w.setProps({ page: valor })
      },
    },
  })
  wrapper = w
  return w
}

const botones = (w: VueWrapper) => w.findAll('button')
const anterior = (w: VueWrapper) => elemento(botones(w), 0, 'los botones del paginador')
const siguiente = (w: VueWrapper) => elemento(botones(w), 1, 'los botones del paginador')

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('AppPagination — el foco no se cae al deshabilitarse el botón pulsado', () => {
  it('llegar a la última página deja el foco en «Anterior», no en <body>', async () => {
    const w = montar(1, 2, 25)
    siguiente(w).element.focus()

    await siguiente(w).trigger('click')
    await nextTick()

    expect(siguiente(w).attributes('disabled')).toBeDefined()
    expect(document.activeElement).toBe(anterior(w).element)
  })

  it('volver a la primera página deja el foco en «Siguiente», no en <body>', async () => {
    const w = montar(2, 2, 25)
    anterior(w).element.focus()

    await anterior(w).trigger('click')
    await nextTick()

    expect(anterior(w).attributes('disabled')).toBeDefined()
    expect(document.activeElement).toBe(siguiente(w).element)
  })

  it('sin foco en el paginador, paginar no lo roba', async () => {
    const w = montar(1, 2, 25)

    await siguiente(w).trigger('click')
    await nextTick()

    expect(document.activeElement).toBe(document.body)
  })
})

describe('AppPagination — el rango se anuncia al cambiar', () => {
  it('el rango visible es una región viva persistente', async () => {
    const w = montar(1, 2, 25)
    const rango = w.find('p.rango')

    expect(rango.attributes('role')).toBe('status')
    expect(rango.text()).toBe('Mostrando 1–20 de 25')

    await siguiente(w).trigger('click')
    await nextTick()

    // El mismo nodo, con otro texto: si se montara con `v-if` el lector no
    // anunciaría nada porque la región no existía cuando cambió.
    expect(w.find('p.rango').element).toBe(rango.element)
    expect(w.find('p.rango').text()).toBe('Mostrando 21–25 de 25')
  })
})
