import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProvenanceLine, {
  PROVENANCE_ICON,
  PROVENANCE_LABEL,
  PROVENANCE_MEANING,
  PROVENANCE_SOURCES,
  type ProvenanceSource,
} from '@/components/ui/ProvenanceLine.vue'

/**
 * <b>La línea de procedencia</b> — la consumen tres pantallas de dos lotes.
 *
 * <p>Lo que se afirma aquí es que el origen <b>se lee</b>, no que se vea bonito.
 * Un origen comunicado solo por icono o por tono es un origen que no se puede
 * decir por teléfono ni pegar en un correo, que es exactamente lo que se hace con
 * él (§5.2 · nada se comunica solo por forma o color). Y un origen que promete un
 * enlace donde no hay pantalla detrás es R14: un dato inventado.
 */

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/contrato/:id', name: 'contrato', component: { template: '<div />' } }],
})

function montar(props: Record<string, unknown>) {
  return mount(ProvenanceLine, {
    props: { source: 'PLAN' as ProvenanceSource, ...props },
    global: { plugins: [router] },
  })
}

describe('los cuatro orígenes están completos', () => {
  it.each(PROVENANCE_SOURCES)('%s tiene rótulo, significado e icono', (source) => {
    expect(PROVENANCE_LABEL[source]?.trim()).toBeTruthy()
    expect(PROVENANCE_MEANING[source]?.trim()).toBeTruthy()
    expect(PROVENANCE_ICON[source]).toBeTruthy()
  })

  it('no hay dos orígenes con el mismo rótulo: distinguirlos es el trabajo', () => {
    const labels = PROVENANCE_SOURCES.map((s) => PROVENANCE_LABEL[s])
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('la excepción negociada dice que un recálculo NO la repone', () => {
    // Es la única de las cuatro que se pierde al revocarla, y creer lo contrario
    // es lo que hace que alguien la revoque «para volver a ponerla luego».
    expect(PROVENANCE_MEANING.NEGOTIATED_EXCEPTION).toContain('No lo repone un recálculo')
  })
})

describe('el origen se lee, no se deduce', () => {
  it.each(PROVENANCE_SOURCES)('%s pinta su rótulo en texto', (source) => {
    expect(montar({ source }).text()).toContain(PROVENANCE_LABEL[source])
  })

  it('el icono es decorativo y no sustituye al texto', () => {
    const svg = montar({ source: 'PLAN' }).find('svg')

    expect(svg.exists()).toBe(true)
    expect(svg.attributes('aria-hidden')).toBe('true')
  })

  it('el detalle acompaña al rótulo, no lo reemplaza', () => {
    const text = montar({ source: 'CONTRACT', detail: 'Línea #482' }).text()

    expect(text).toContain(PROVENANCE_LABEL.CONTRACT)
    expect(text).toContain('Línea #482')
  })

  it('sin explain no se pinta la frase larga: en una tabla no cabe', () => {
    expect(montar({ source: 'PLAN' }).text()).not.toContain(PROVENANCE_MEANING.PLAN)
  })

  it('con explain sí, para las fichas donde hay sitio', () => {
    expect(montar({ source: 'PLAN', explain: true }).text()).toContain(PROVENANCE_MEANING.PLAN)
  })
})

describe('el enlace no se inventa', () => {
  it('sin `to` no hay enlace: prometería una pantalla que no existe (R14)', () => {
    expect(montar({ source: 'FACTORY' }).find('a').exists()).toBe(false)
  })

  it('con `to` hay enlace, y su nombre accesible lleva el sujeto (R04)', () => {
    const wrapper = montar({
      source: 'CONTRACT',
      detail: 'Línea #482',
      to: { name: 'contrato', params: { id: '482' } },
      linkLabel: 'Ver la línea #482 del contrato',
    })

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('aria-label')).toBe('Ver la línea #482 del contrato')
    expect(link.attributes('href')).toBe('/contrato/482')
  })
})
