import { describe, it, expect, afterAll, afterEach, beforeAll } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { exigir } from '../helpers/exigir'

/**
 * R01 · el desplegable de la consola activaba sus opciones con
 * `@mousedown.prevent`, y §2.5.2 (Cancelación del puntero, A) exige que la
 * función no se complete en el evento de bajada: quien aprieta sobre la opción
 * equivocada tiene que poder arrastrar fuera para cancelar.
 *
 * La corrección tiene dos mitades y aquí se prueban las dos, porque la segunda
 * no se ve: al pasar a `@click`, el `mousedown` sí mueve el foco fuera del
 * disparador —el panel vive en `<body>` y sus `<li>` no son enfocables—, así
 * que sin `close(true)` el foco cae a `<body>` y se cambia R01 por R02.
 */

const OPCIONES = [
  { value: 'perro', label: 'Perro' },
  { value: 'gato', label: 'Gato' },
]

let wrapper: VueWrapper | null = null

/**
 * jsdom no implementa `scrollIntoView`, y el componente lo llama al abrir el
 * panel para traer la opción resaltada a la vista. Sin el apaño cada apertura
 * deja una promesa rechazada que vitest cuenta como error del fichero aunque
 * todos los asertos pasen.
 */
const sinScrollIntoView = Element.prototype.scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterAll(() => {
  Element.prototype.scrollIntoView = sinScrollIntoView
})

/**
 * Montado en el documento real: el componente escucha `mousedown` en
 * `document` para cerrarse al pulsar fuera, y el aserto invertido no valdría
 * nada si ese oyente no llegara a ejecutarse.
 */
function montar() {
  wrapper = mount(AppSelect, {
    attachTo: document.body,
    props: { options: OPCIONES, modelValue: null, label: 'Especie' },
    global: { stubs: { teleport: true } },
  })
  return wrapper
}

const disparador = (w: VueWrapper) => w.find('button.trigger')

const opcion = (w: VueWrapper, etiqueta: string) =>
  exigir(
    w.findAll('li.app-select-panel__item').find((li) => li.text().includes(etiqueta)),
    `una opción con la etiqueta «${etiqueta}»`,
  )

async function abrir(w: VueWrapper) {
  await disparador(w).trigger('click')
  await nextTick()
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('AppSelect — activación por click', () => {
  it('elegir una opción con click emite update:modelValue con su value', async () => {
    const w = montar()
    await abrir(w)

    await opcion(w, 'Gato').trigger('click')

    expect(w.emitted('update:modelValue')).toEqual([['gato']])
  })

  it('un mousedown sobre la opción NO emite nada por sí solo', async () => {
    // Con `@mousedown.prevent` de vuelta, aquí saldría ['gato'] y quien aprieta
    // sobre la opción equivocada ya no podría arrastrar fuera para cancelar.
    const w = montar()
    await abrir(w)

    await opcion(w, 'Gato').trigger('mousedown')

    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.findAll('li.app-select-panel__item')).toHaveLength(2)
  })

  it('tras elegir con el ratón el foco vuelve al disparador, no a <body>', async () => {
    const w = montar()
    await abrir(w)

    await opcion(w, 'Perro').trigger('click')
    await nextTick()

    expect(document.activeElement).toBe(disparador(w).element)
  })
})

describe('AppSelect — el combobox declara su listbox', () => {
  it('aria-controls del disparador resuelve a un nodo con role="listbox"', async () => {
    const w = montar()
    await abrir(w)

    const id = exigir(disparador(w).attributes('aria-controls'), 'aria-controls en el disparador')
    const listbox = exigir(document.getElementById(id), `un nodo con id «${id}»`)

    expect(listbox.getAttribute('role')).toBe('listbox')
  })

  it('aria-activedescendant resuelve a una opción DENTRO de ese listbox', async () => {
    const w = montar()
    await abrir(w)

    const boton = disparador(w)
    const listbox = exigir(
      document.getElementById(exigir(boton.attributes('aria-controls'), 'aria-controls')),
      'el listbox',
    )
    const activa = exigir(
      document.getElementById(
        exigir(boton.attributes('aria-activedescendant'), 'aria-activedescendant'),
      ),
      'la opción activa',
    )

    expect(activa.getAttribute('role')).toBe('option')
    expect(listbox.contains(activa)).toBe(true)
  })

  it('con el panel cerrado no hay aria-controls colgando de un nodo inexistente', () => {
    const w = montar()

    expect(disparador(w).attributes('aria-controls')).toBeUndefined()
  })
})
