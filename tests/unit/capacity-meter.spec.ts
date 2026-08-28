import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CapacityMeter, {
  CAPACITY_EXHAUSTED_DEFAULT,
  capacityMeterText,
  declaredLimit,
} from '@/components/ui/CapacityMeter.vue'

/**
 * <b>Un cupo.</b> Lo consumen las pantallas que enseñan cuánto se ha gastado de
 * lo contratado.
 *
 * <p>El caso que de verdad hay que sujetar no es «pinta una barra»: es el
 * <b>límite nulo</b>. Un contrato que no declara techo no es un contrato con
 * techo cero, y las dos formas de mentir sobre eso son gratis de escribir —una
 * barra al 100 % y un «7 de 0 usuarios»—. Las dos le dicen a un operador que la
 * empresa no puede crecer cuando sí puede, y de ahí sale una ampliación vendida
 * que nadie necesitaba.
 *
 * <p>La otra mitad es de accesibilidad y es igual de dura: <b>la barra nunca va
 * sola</b>. Una barra al 70 % no se lee por teléfono.
 */

describe('capacityMeterText · el texto que se lee por teléfono', () => {
  it('con techo dice cuánto de cuánto', () => {
    expect(capacityMeterText(7, 10, 'usuarios')).toBe('7 de 10 usuarios')
  })

  it('sin techo lo dice con palabras, no con un cero', () => {
    expect(capacityMeterText(7, null, 'usuarios')).toBe('7 usuarios · sin límite declarado')
  })

  it('no inventa un techo cuando el consumo es cero', () => {
    expect(capacityMeterText(0, null, 'sedes')).toBe('0 sedes · sin límite declarado')
  })

  it('un consumo por encima del techo se dice tal cual, no se maquilla', () => {
    // Pasa de verdad: se baja el contrato sin retirar lo que ya había.
    expect(capacityMeterText(12, 10, 'usuarios')).toBe('12 de 10 usuarios')
  })
})

describe('declaredLimit · qué cuenta como techo declarado', () => {
  it.each([
    [null, null],
    [undefined, null],
    [0, null],
    [-3, null],
    [10, 10],
  ])('%s → %s', (input, expected) => {
    expect(declaredLimit(input)).toBe(expected)
  })
})

describe('el límite nulo no se pinta como límite de cero', () => {
  it('sin techo no hay barra', () => {
    const wrapper = mount(CapacityMeter, { props: { label: 'Usuarios', used: 7, limit: null } })

    expect(wrapper.find('progress').exists()).toBe(false)
  })

  it('pero el texto sigue estando: el dato no desaparece con la barra', () => {
    const wrapper = mount(CapacityMeter, { props: { label: 'Usuarios', used: 7, limit: null } })

    expect(wrapper.text()).toContain('7 usuarios · sin límite declarado')
  })

  it('un techo de cero se trata como ausencia de techo, no como cupo agotado', () => {
    const wrapper = mount(CapacityMeter, { props: { label: 'Sedes', used: 3, limit: 0 } })

    expect(wrapper.find('progress').exists()).toBe(false)
    expect(wrapper.find('.ds-banner').exists()).toBe(false)
  })

  it('sin techo nunca está agotado, ni aunque se lo digan', () => {
    const wrapper = mount(CapacityMeter, {
      props: { label: 'Usuarios', used: 99, limit: null, exhausted: true },
    })

    expect(wrapper.find('.ds-banner').exists()).toBe(false)
  })
})

describe('la barra nunca va sola, y es un <progress> etiquetado', () => {
  const montar = () => mount(CapacityMeter, { props: { label: 'Usuarios', used: 7, limit: 10 } })

  it('pinta la barra con su máximo y su valor', () => {
    const bar = montar().find('progress')

    expect(bar.attributes('max')).toBe('10')
    expect(bar.attributes('value')).toBe('7')
  })

  it('el texto acompaña siempre a la barra', () => {
    expect(montar().text()).toContain('7 de 10 usuarios')
  })

  it('el <label> apunta al <progress>: el nombre accesible sale del marcado nativo', () => {
    const wrapper = montar()
    const id = wrapper.find('progress').attributes('id')

    expect(id).toBeTruthy()
    expect(wrapper.find('label').attributes('for')).toBe(id)
  })

  it('sin una sola ARIA a mano: un <progress> etiquetado ya expone rol, valor y máximo', () => {
    const html = montar().html()

    expect(html).not.toContain('role="progressbar"')
    expect(html).not.toContain('aria-valuenow')
    expect(html).not.toContain('aria-valuemax')
  })

  it('un consumo por encima del techo acota la barra pero no el texto', () => {
    const wrapper = mount(CapacityMeter, { props: { label: 'Usuarios', used: 12, limit: 10 } })

    expect(wrapper.find('progress').attributes('value')).toBe('10')
    expect(wrapper.text()).toContain('12 de 10 usuarios')
  })

  it('un consumo nulo se lee como cero y no rompe la barra', () => {
    const wrapper = mount(CapacityMeter, { props: { label: 'Sedes', used: null, limit: 4 } })

    expect(wrapper.find('progress').attributes('value')).toBe('0')
    expect(wrapper.text()).toContain('0 de 4 sedes')
  })

  it('el sustantivo se puede pasar a mano cuando no es el rótulo en minúscula', () => {
    const wrapper = mount(CapacityMeter, {
      props: { label: 'Terminales de caja', used: 2, limit: 3, unit: 'terminales' },
    })

    expect(wrapper.text()).toContain('2 de 3 terminales')
  })
})

describe('el aviso de agotado', () => {
  it('aparece al llegar al techo, con role status y sin interrumpir', () => {
    const wrapper = mount(CapacityMeter, { props: { label: 'Usuarios', used: 10, limit: 10 } })

    const banner = wrapper.find('.ds-banner')
    expect(banner.exists()).toBe(true)
    expect(banner.attributes('role')).toBe('status')
    expect(banner.classes()).toContain('ds-banner--warning')
    expect(banner.text()).toContain(CAPACITY_EXHAUSTED_DEFAULT)
  })

  it('no aparece mientras quede sitio', () => {
    const wrapper = mount(CapacityMeter, { props: { label: 'Usuarios', used: 9, limit: 10 } })

    expect(wrapper.find('.ds-banner').exists()).toBe(false)
  })

  it('manda lo que diga el servidor por encima de la resta', () => {
    const wrapper = mount(CapacityMeter, {
      props: { label: 'Usuarios', used: 10, limit: 10, exhausted: false },
    })

    expect(wrapper.find('.ds-banner').exists()).toBe(false)
  })

  it('y también cuando el servidor lo declara agotado por debajo del techo', () => {
    // Pasa con cupos que el backend calcula con reservas que la consola no ve.
    const wrapper = mount(CapacityMeter, {
      props: { label: 'Usuarios', used: 4, limit: 10, exhausted: true },
    })

    expect(wrapper.find('.ds-banner').exists()).toBe(true)
  })

  it('no pasar la prop NO equivale a decir «no está agotado»', () => {
    // Vue castea a `false` una prop `Boolean` ausente sin default, y con eso el
    // aviso desaparecía en silencio justo cuando hacía falta. Por eso `exhausted`
    // es `boolean | null` con default `null`, y esta prueba es su cerradura.
    const wrapper = mount(CapacityMeter, { props: { label: 'Usuarios', used: 10, limit: 10 } })

    expect(wrapper.find('.ds-banner').exists()).toBe(true)
  })

  it('la salida a mano la pone la pantalla por el slot: esta pieza no sabe de rutas', () => {
    const wrapper = mount(CapacityMeter, {
      props: { label: 'Usuarios', used: 10, limit: 10 },
      slots: { action: '<a href="/contratado">Ampliar en «Lo contratado»</a>' },
    })

    expect(wrapper.find('.ds-banner a').text()).toBe('Ampliar en «Lo contratado»')
  })

  it('el aviso se puede nombrar por cupo sin reescribir el componente', () => {
    const wrapper = mount(CapacityMeter, {
      props: {
        label: 'Sedes',
        used: 3,
        limit: 3,
        exhaustedMessage: 'Se agotaron las sedes contratadas. Las que ya existen siguen abiertas.',
      },
    })

    expect(wrapper.find('.ds-banner').text()).toContain('Las que ya existen siguen abiertas')
  })
})
