import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import HintComposerModal from '@/features/catalog-ai-hints/components/HintComposerModal.vue'

/**
 * El compositor de la pista.
 *
 * <p>Dos propiedades justifican esta prueba, y las dos son de pérdida de datos:
 *
 * <ol>
 *   <li><b>Un texto que no tiene tres bloques exactos NO se reparte en tres
 *       campos.</b> Repartir uno de cuatro perdería el cuarto en silencio, y lo
 *       que se perdería es texto que se le está diciendo al modelo. La caída al
 *       campo único es obligatoria, no una comodidad.</li>
 *   <li><b>Confirmar con un campo vacío no emite `submit`.</b> El botón no se
 *       deshabilita a propósito —un botón apagado no dice qué falta—, así que lo
 *       único que separa al operador de un 400 es que el evento no salga y que
 *       aparezca el resumen de errores con el texto exacto.</li>
 * </ol>
 *
 * <p>`teleport: true` porque `ModalShell` teletransporta a `body`: sin eso el
 * marcado queda fuera del wrapper y las búsquedas devuelven vacío, que se leería
 * como «no hay error» justo donde el error es el sujeto de la prueba.
 */

const TRES = 'Qué es esto\n\nSeñales literales\n\nCuándo NO aplica'
const CUATRO = `${TRES}\n\nUn cuarto bloque que no se puede perder`

function montar(props: Record<string, unknown> = {}) {
  return mount(HintComposerModal, {
    props: {
      open: true,
      saving: false,
      mode: 'revise',
      codigo: 'GROOMING',
      currentText: null,
      currentRevision: 3,
      baseText: null,
      baseRevision: null,
      serverError: null,
      ...props,
    },
    global: { stubs: { teleport: true } },
  })
}

function textareas(wrapper: VueWrapper) {
  return wrapper.findAll('textarea')
}

function boton(wrapper: VueWrapper, rotulo: string) {
  return wrapper.findAll('button').find((b) => b.text() === rotulo)
}

describe('el compositor reparte el texto guardado sin perder nada', () => {
  it('con tres bloques exactos abre en modo campos, uno por bloque', () => {
    const wrapper = montar({ currentText: TRES })
    const campos = textareas(wrapper)

    expect(campos).toHaveLength(3)
    expect((campos[0]?.element as HTMLTextAreaElement).value).toBe('Qué es esto')
    expect((campos[1]?.element as HTMLTextAreaElement).value).toBe('Señales literales')
    expect((campos[2]?.element as HTMLTextAreaElement).value).toBe('Cuándo NO aplica')
  })

  it('con cuatro bloques abre en modo texto y NO pierde el cuarto', () => {
    const wrapper = montar({ currentText: CUATRO })
    const campos = textareas(wrapper)

    expect(campos).toHaveLength(1)
    const valor = (campos[0]?.element as HTMLTextAreaElement).value
    expect(valor).toBe(CUATRO)
    expect(valor).toContain('Un cuarto bloque que no se puede perder')
  })

  it('y lo dice: el aviso explica por qué se edita como texto', () => {
    const wrapper = montar({ currentText: CUATRO })
    expect(wrapper.text()).toContain('Esta pista no tiene tres bloques exactos')
  })

  it('con dos bloques también cae a texto: la caída no es solo para los que sobran', () => {
    const wrapper = montar({ currentText: 'uno\n\ndos' })
    expect(textareas(wrapper)).toHaveLength(1)
  })

  it('no se puede volver a bloques desde un texto que no tiene tres', () => {
    const wrapper = montar({ currentText: CUATRO })
    const volver = boton(wrapper, 'Editar por bloques')
    expect(volver?.attributes('disabled')).toBeDefined()
  })
})

describe('confirmar con un campo vacío no envía nada', () => {
  it('no emite `submit` y pinta el error exacto del bloque que falta', async () => {
    const wrapper = montar({ currentText: 'uno\n\ndos\n\ntres' })
    await textareas(wrapper)[1]?.setValue('   ')

    await boton(wrapper, 'Publicar la revisión 4')?.trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Faltan las señales. Los tres bloques son obligatorios.')
    // El resumen de errores es lo que recibe el foco, así que tiene que existir.
    expect(wrapper.find('[data-error-anchor]').exists()).toBe(true)
  })

  it('con los tres bloques llenos sí emite, y emite el texto UNIDO con `\\n\\n`', async () => {
    const wrapper = montar({ currentText: TRES })
    await textareas(wrapper)[0]?.setValue('Otra definición')

    await boton(wrapper, 'Publicar la revisión 4')?.trigger('click')

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      'Otra definición\n\nSeñales literales\n\nCuándo NO aplica',
    ])
  })
})

describe('el botón nombra la acción y no dice «Guardar»', () => {
  it('al publicar la primera', () => {
    const wrapper = montar({ mode: 'publish', currentText: null, currentRevision: null })
    expect(boton(wrapper, 'Publicar la pista')).toBeDefined()
    expect(boton(wrapper, 'Guardar')).toBeUndefined()
  })

  it('al corregir, con el número de la revisión que se va a publicar', () => {
    const wrapper = montar({ mode: 'revise', currentText: TRES, currentRevision: 7 })
    expect(boton(wrapper, 'Publicar la revisión 8')).toBeDefined()
  })

  it('solo se apaga mientras hay envío en curso, nunca por formulario incompleto', () => {
    const vacio = montar({ mode: 'publish', currentText: null, currentRevision: null })
    expect(boton(vacio, 'Publicar la pista')?.attributes('disabled')).toBeUndefined()

    const enviando = montar({
      mode: 'publish',
      currentText: null,
      currentRevision: null,
      saving: true,
    })
    expect(boton(enviando, 'Publicando…')?.attributes('disabled')).toBeDefined()
  })
})

describe('el 409 se pinta en el formulario y no en un toast', () => {
  it('el mensaje del servidor encabeza el resumen de errores', () => {
    const wrapper = montar({
      currentText: TRES,
      serverError: {
        code: 'CATALOG_ITEM_AI_HINT_TEXT_ALREADY_PUBLISHED',
        message: 'Ese texto exacto ya se publicó antes para este artículo.',
        traceId: 'abc123',
      },
    })

    const resumen = wrapper.find('[data-error-anchor]')
    expect(resumen.exists()).toBe(true)
    expect(resumen.text()).toContain('Ese texto exacto ya se publicó antes para este artículo.')
    expect(resumen.text()).toContain('abc123')
  })
})

describe('«Usar como base» avisa de que republicar idéntico no se puede', () => {
  it('el aviso nombra la revisión de la que se parte', () => {
    const wrapper = montar({ currentText: TRES, baseText: TRES, baseRevision: 2 })
    expect(wrapper.text()).toContain('Estás partiendo de la revisión 2')
    expect(wrapper.text()).toContain('No se puede republicar un texto idéntico')
  })
})

describe('el aviso de inmediatez está en el punto de compromiso', () => {
  it('dice que rige ya y que no lo revisa nadie', () => {
    const wrapper = montar({ currentText: TRES })
    expect(wrapper.text()).toContain(
      'el asistente empieza a usar este texto en la siguiente propuesta',
    )
    expect(wrapper.text()).toContain('No hay despliegue y no lo revisa nadie más.')
  })
})
