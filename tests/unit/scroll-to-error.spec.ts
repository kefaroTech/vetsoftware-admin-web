import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrollToFirstError } from '@/composables/scrollToError'

const scrollIntoView = vi.fn<(opciones?: boolean | ScrollIntoViewOptions) => void>()
const scrollIntoViewOriginal = Element.prototype.scrollIntoView
const getClientRectsOriginal = Element.prototype.getClientRects

/** Todo elemento cuenta como visible salvo que el test lo marque oculto explícitamente. */
function declararVisibles(): void {
  Element.prototype.getClientRects = function (this: Element) {
    return [{}] as unknown as DOMRectList
  }
}

/** Fija el `top` que usa `scrollToFirstError` para elegir "el más arriba". */
function conTop(el: HTMLElement, top: number): void {
  el.getBoundingClientRect = () => ({ top }) as DOMRect
}

beforeEach(() => {
  scrollIntoView.mockReset()
  Element.prototype.scrollIntoView = scrollIntoView
  declararVisibles()
  document.body.innerHTML = ''
})

afterEach(() => {
  Element.prototype.scrollIntoView = scrollIntoViewOriginal
  Element.prototype.getClientRects = getClientRectsOriginal
  document.body.innerHTML = ''
})

describe('scrollToFirstError', () => {
  it('sin campos inválidos, no desplaza y devuelve false', async () => {
    document.body.innerHTML = '<input />'

    const result = await scrollToFirstError()

    expect(result).toBe(false)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('centra el campo inválido más arriba en la pantalla, no el primero en el DOM', async () => {
    document.body.innerHTML = `
      <input id="abajo" aria-invalid="true" />
      <input id="arriba" aria-invalid="true" />
    `
    const abajo = document.getElementById('abajo') as HTMLElement
    const arriba = document.getElementById('arriba') as HTMLElement
    conTop(abajo, 400)
    conTop(arriba, 100)

    const result = await scrollToFirstError()

    expect(result).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(arriba)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('da el foco al campo desplazado, sin repetir el scroll (WCAG 2.4.3)', async () => {
    document.body.innerHTML = '<input id="campo" aria-invalid="true" />'
    const campo = document.getElementById('campo') as HTMLElement
    conTop(campo, 0)
    const focus = vi.fn<(opciones?: FocusOptions) => void>()
    campo.focus = focus

    await scrollToFirstError()

    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('un mensaje `p.error` dentro de `.field` centra el campo completo y enfoca su input', async () => {
    document.body.innerHTML = `
      <div class="field">
        <input id="input-de-campo" />
        <p class="error">Campo requerido</p>
      </div>
    `
    const field = document.querySelector('.field') as HTMLElement
    const input = document.getElementById('input-de-campo') as HTMLElement
    conTop(field, 0)
    const focus = vi.fn<(opciones?: FocusOptions) => void>()
    input.focus = focus

    const result = await scrollToFirstError()

    expect(result).toBe(true)
    expect(scrollIntoView.mock.instances[0]).toBe(field)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('un mensaje `p.error` de AppCheckbox centra `.checkfield`, no solo el párrafo', async () => {
    document.body.innerHTML = `
      <div class="checkfield">
        <label class="check"><input type="checkbox" id="chk" /></label>
        <p class="error">Marca esta casilla</p>
      </div>
    `
    const checkfield = document.querySelector('.checkfield') as HTMLElement
    conTop(checkfield, 0)

    const result = await scrollToFirstError()

    expect(result).toBe(true)
    expect(scrollIntoView.mock.instances[0]).toBe(checkfield)
  })

  it('sin `root`, se acota al último `.overlay` abierto (el modal superior)', async () => {
    document.body.innerHTML = `
      <div class="overlay">
        <input id="del-fondo" aria-invalid="true" />
      </div>
      <div class="overlay">
        <input id="del-tope" aria-invalid="true" />
      </div>
    `
    const delFondo = document.getElementById('del-fondo') as HTMLElement
    const delTope = document.getElementById('del-tope') as HTMLElement
    conTop(delFondo, 0)
    conTop(delTope, 0)

    await scrollToFirstError()

    expect(scrollIntoView.mock.instances[0]).toBe(delTope)
  })

  it('con `root` explícito, ignora el `.overlay` y busca dentro del contenedor recibido', async () => {
    document.body.innerHTML = `
      <div class="overlay"><input id="del-modal" aria-invalid="true" /></div>
      <section id="propio"><input id="del-otro" aria-invalid="true" /></section>
    `
    const delOtro = document.getElementById('del-otro') as HTMLElement
    conTop(delOtro, 0)
    const propio = document.getElementById('propio') as HTMLElement

    await scrollToFirstError(propio)

    expect(scrollIntoView.mock.instances[0]).toBe(delOtro)
  })
})
