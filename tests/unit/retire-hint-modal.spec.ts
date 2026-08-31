import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ModalShell from '@/components/ui/ModalShell.vue'
import RetireHintModal from '@/features/catalog-ai-hints/components/RetireHintModal.vue'
import type { CatalogItemAiHintResponse } from '@/features/catalog-ai-hints/types/catalog-ai-hints.types'

/**
 * La retirada apaga comercialmente un artículo: el asistente deja de proponerlo
 * en la siguiente cotización, rige de inmediato y <b>no se puede deshacer</b>
 * —el índice único sobre `(catalog_item_id, hint_hash)` cubre todas las filas,
 * así que republicar el texto retirado responde 409—. El diálogo es lo único que
 * hay entre el operador y esa consecuencia.
 *
 * <p>Lo que se afirma aquí es lo que se rompe siempre:
 *
 * <ul>
 *   <li><b>`role="alertdialog"`</b>: el cuerpo hay que oírlo sí o sí.</li>
 *   <li><b>El botón nombra la acción</b> (WCAG 2.2 §3.3.4), nunca «Aceptar».</li>
 *   <li><b>`return-focus-to` viaja como FUNCIÓN</b>, no como elemento: al
 *       retirar desde el listado la fila que invocó el diálogo ya no existe, y
 *       solo una función puede contestar distinto según por dónde se cerró.</li>
 *   <li><b>El «qué NO pasa»</b>, que es el antídoto contra un `DELETE` que
 *       engaña: la revisión se queda entera en el historial.</li>
 * </ul>
 */

const HINT: CatalogItemAiHintResponse = {
  id: 1,
  catalogItemId: 42,
  catalogItemCode: 'GROOMING',
  catalogItemName: 'Peluquería y estética',
  hintRevision: 3,
  hintText: 'qué es\n\nseñales\n\nno aplica',
  publishedAt: '2026-03-03T10:00:00',
  publishedBySystemUserId: 7,
  supersededAt: null,
  supersededBySystemUserId: null,
  current: true,
  createdDate: '2026-03-03T10:00:00',
}

function montar(props: Record<string, unknown> = {}) {
  return mount(RetireHintModal, {
    props: { open: true, saving: false, hint: HINT, meId: 7, serverError: null, ...props },
    global: { stubs: { teleport: true } },
  })
}

function boton(wrapper: VueWrapper, rotulo: string) {
  return wrapper.findAll('button').find((b) => b.text() === rotulo)
}

describe('el diálogo de retirada', () => {
  it('es un `alertdialog`, no un `dialog`', () => {
    const wrapper = montar()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
  })

  it('el botón nombra la acción y no dice «Aceptar» ni «Eliminar»', () => {
    const wrapper = montar()
    expect(boton(wrapper, 'Retirar la pista')).toBeDefined()
    expect(boton(wrapper, 'Aceptar')).toBeUndefined()
    expect(boton(wrapper, 'Eliminar')).toBeUndefined()
  })

  it('pone el sujeto delante, con nombre y código', () => {
    const wrapper = montar()
    expect(wrapper.text()).toContain('Peluquería y estética')
    expect(wrapper.text()).toContain('GROOMING')
  })

  it('dice la consecuencia comercial y que rige de inmediato', () => {
    const wrapper = montar()
    expect(wrapper.text()).toContain('dejará de proponer este artículo')
    expect(wrapper.text()).toContain('Rige de inmediato')
  })

  it('desmiente lo que un `DELETE` promete: no se borra nada', () => {
    const wrapper = montar()
    expect(wrapper.text()).toContain('No se borra nada.')
    expect(wrapper.text()).toContain('La revisión 3 se queda en el historial')
    expect(wrapper.text()).toContain('la numeración sigue en 4')
  })

  it('enseña la firma, que es lo único que dirá quién apagó el artículo', () => {
    const wrapper = montar()
    expect(wrapper.text()).toContain('tú (usuario #7)')
  })

  it('sin sesión identificada NO se confirma', () => {
    // Sin firmante la retirada no quedaría firmada, y la firma es todo el
    // control que hay en una consola con un solo rol.
    const wrapper = montar({ meId: null })
    expect(boton(wrapper, 'Retirar la pista')?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('No se pudo identificar la sesión')
  })

  it('no pide un motivo, porque el `DELETE` no lleva cuerpo donde meterlo', () => {
    // Pedirlo sería teatro de auditoría: el operador creería estar firmando algo
    // y el texto se tiraría al enviar.
    const wrapper = montar()
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('emite `confirm` al pulsar y `close` al cancelar', async () => {
    const wrapper = montar()
    await boton(wrapper, 'Retirar la pista')?.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)

    await boton(wrapper, 'Cancelar')?.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('A11Y-08 · la devolución del foco', () => {
  it('`return-focus-to` llega a `ModalShell` como FUNCIÓN, no como elemento', () => {
    // Si se pasara un elemento, se resolvería al abrir — y al cerrar tras una
    // retirada exitosa ese elemento (el botón de la fila) ya no existe: el foco
    // caería al `body` y quien navega con teclado reaparecería al principio del
    // documento sin saber qué pasó.
    const destino = () => null
    const wrapper = montar({ returnFocusTo: destino })
    expect(wrapper.getComponent(ModalShell).props('returnFocusTo')).toBe(destino)
    expect(typeof wrapper.getComponent(ModalShell).props('returnFocusTo')).toBe('function')
  })
})
