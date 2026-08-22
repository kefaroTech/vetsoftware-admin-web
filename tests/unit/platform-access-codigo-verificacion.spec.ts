import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AprobarAccesoView from '@/features/platform-access/views/AprobarAccesoView.vue'
import { sanitizeCode } from '@/features/platform-access/composables/usePlatformAccess'
import { platformAccessApi } from '@/features/platform-access/api/platform-access.api'
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * El saneado del código de verificación.
 *
 * Es lo sutil de esta pantalla: el código llega por correo y **se pega**, así
 * que el valor que entra de verdad al campo trae guiones, espacios o el salto
 * de línea del cliente de correo. Si el saneado falla, lo que se manda al
 * backend no es el código y el usuario ve «El código no es correcto» sin
 * haberse equivocado — y con los intentos contados, eso le quema el enlace.
 *
 * Se prueban las DOS mitades, porque fallan por motivos distintos:
 *
 *  1. La función pura: qué caracteres sobreviven y dónde corta.
 *  2. La vista, que además **reescribe el DOM**. Sin esa reescritura, un
 *     carácter no numérico tecleado sobre un valor que ya estaba saneado deja
 *     el modelo igual, Vue no repinta, y la letra se queda en pantalla
 *     mientras el modelo dice otra cosa. Ese desajuste no lanza ningún error.
 */

describe('sanitizeCode', () => {
  it('deja solo dígitos', () => {
    expect(sanitizeCode('12-34 56')).toBe('123456')
    expect(sanitizeCode('123\n456')).toBe('123456')
    expect(sanitizeCode(' 123456 ')).toBe('123456')
  })

  it('corta a seis dígitos', () => {
    expect(sanitizeCode('1234567')).toBe('123456')
  })

  it('deja vacío lo que no tiene dígitos', () => {
    expect(sanitizeCode('abc')).toBe('')
    expect(sanitizeCode('')).toBe('')
  })
})

const SOLICITUD = {
  fullName: 'Ada Lovelace',
  email: 'ada@empresa.com',
  reason: 'Voy a administrar los catálogos clínicos.',
  requestedAt: '2026-08-21T14:32:00Z',
}

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/aprobar-acceso',
        name: ROUTE_NAMES.ACCESS_APPROVAL,
        component: { template: '<div />' },
      },
      { path: '/login', name: ROUTE_NAMES.LOGIN, component: { template: '<div />' } },
    ],
  })
}

async function montarConSolicitud() {
  vi.spyOn(platformAccessApi, 'validateAccessRequest').mockResolvedValue(SOLICITUD)

  const router = crearRouter()
  await router.push('/aprobar-acceso?token=t-123')
  await router.isReady()

  const wrapper = mount(AprobarAccesoView, {
    // `attachTo` es obligatorio: la vista localiza el campo por
    // `document.getElementById`, y sin montar en el documento no existe.
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('el campo del código de verificación', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('limpia los separadores de un código pegado', async () => {
    const wrapper = await montarConSolicitud()
    const input = wrapper.get('#aprobar-codigo')

    await input.setValue('12-34 56')

    expect((input.element as HTMLInputElement).value).toBe('123456')
  })

  it('borra del DOM un carácter no numérico aunque el modelo no cambie', async () => {
    // El caso que solo se ve con la reescritura: el valor saneado ('') coincide
    // con el que ya había, así que Vue no repintaría por su cuenta.
    const wrapper = await montarConSolicitud()
    const input = wrapper.get('#aprobar-codigo')

    await input.setValue('a')

    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('es un campo de texto con teclado numérico y autocompletado de un solo uso', async () => {
    // `type="number"` perdería los ceros a la izquierda y admitiría `e`, `+`,
    // `-` y `.`; con seis casillas no aparecería la sugerencia del sistema.
    const input = (await montarConSolicitud()).get('#aprobar-codigo')

    expect(input.attributes('type')).toBe('text')
    expect(input.attributes('inputmode')).toBe('numeric')
    expect(input.attributes('autocomplete')).toBe('one-time-code')
  })

  it('no autoenvía al sexto dígito: ninguna acción sale sin pulsar', async () => {
    const aprobar = vi.spyOn(platformAccessApi, 'approve').mockResolvedValue(undefined)
    const rechazar = vi.spyOn(platformAccessApi, 'reject').mockResolvedValue(undefined)

    const wrapper = await montarConSolicitud()
    await wrapper.get('#aprobar-codigo').setValue('123456')
    await flushPromises()

    // Dispararía una acción irreversible sin que el usuario haya declarado cuál
    // de las dos quiere — y con dos acciones posibles, ni siquiera se sabría
    // cuál enviar (WCAG 2.2 §3.3.4 Error Prevention).
    expect(aprobar).not.toHaveBeenCalled()
    expect(rechazar).not.toHaveBeenCalled()
  })

  it('con el código incompleto se valida al pulsar y no se llama al servidor', async () => {
    const aprobar = vi.spyOn(platformAccessApi, 'approve').mockResolvedValue(undefined)

    const wrapper = await montarConSolicitud()
    await wrapper.get('#aprobar-codigo').setValue('123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(aprobar).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('El código tiene 6 dígitos.')
  })
})
