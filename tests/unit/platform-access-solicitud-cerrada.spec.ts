import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AxiosError, type AxiosResponse } from 'axios'
import SolicitarAccesoView from '@/features/platform-access/views/SolicitarAccesoView.vue'
import { platformAccessApi } from '@/features/platform-access/api/platform-access.api'
import { useToastStore } from '@/stores/toast.store'
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * El 404 del `POST` de solicitud es el estado **cerrado**, no un error.
 *
 * Este es el punto de fuga de toda la pantalla. El backend sabe por qué está
 * cerrado —«ya existe un superadministrador»— y ese motivo confirma el estado
 * interno del sistema a un desconocido que solo tuvo que rellenar un
 * formulario público. La regla es doble y las dos mitades se prueban aquí:
 *
 *  1. El front **ignora el cuerpo de la respuesta** en este estado y pinta su
 *     propio texto. Si algún día alguien «mejora» el mensaje mostrando el
 *     `ProblemDetail.detail`, esta prueba falla.
 *  2. El tono es **neutro**: no hay banner rojo ni toast de error, porque el
 *     sistema sí hizo lo que se le pidió. Un 404 aquí es una respuesta
 *     esperada.
 *
 * También se prueba lo contrario —un 500 sí es un error— para que la prueba no
 * pase por el simple hecho de que la pantalla nunca muestre nada.
 */

const DETALLE_QUE_FILTRA = 'Ya existe un superadministrador en la plataforma.'

/** Lo que el estado cerrado NUNCA puede decir, en ninguna de sus formas. */
const FUGAS = /superadministrador|ya existe|configurad|alta inicial/i

function respuestaDeError(status: number, detail: string): AxiosError {
  const error = new AxiosError('fallo')
  error.response = {
    status,
    data: { title: 'No disponible', status, detail, code: 'X' },
    statusText: '',
    headers: {},
    config: { headers: {} },
  } as unknown as AxiosResponse
  return error
}

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/solicitar-acceso',
        name: ROUTE_NAMES.ACCESS_REQUEST,
        component: { template: '<div />' },
      },
      { path: '/login', name: ROUTE_NAMES.LOGIN, component: { template: '<div />' } },
    ],
  })
}

async function montarYEnviar() {
  const router = crearRouter()
  await router.push('/solicitar-acceso')
  await router.isReady()

  const wrapper = mount(SolicitarAccesoView, { global: { plugins: [router] } })

  await wrapper.get('#acceso-nombre').setValue('Ada Lovelace')
  await wrapper.get('#acceso-email').setValue('ada@empresa.com')
  await wrapper
    .get('#acceso-motivo')
    .setValue('Voy a administrar los catálogos clínicos y las membresías.')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  return wrapper
}

describe('solicitud de acceso · el 404 es «cerrado», no un error', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('pinta el estado cerrado con su propio texto', async () => {
    vi.spyOn(platformAccessApi, 'create').mockRejectedValue(
      respuestaDeError(404, DETALLE_QUE_FILTRA),
    )

    const wrapper = await montarYEnviar()
    const texto = wrapper.text()

    expect(texto).toContain('Las solicitudes de acceso están cerradas')
    expect(texto).toContain('Esta consola no está aceptando solicitudes de acceso ahora mismo.')
    expect(texto).toContain(
      'Si necesitas una cuenta de plataforma, pídesela a quien ya administra VetSoftware en tu organización.',
    )
    // Sigue habiendo un `<h1>`: una pantalla sin él deja al lector de pantalla
    // sin punto de referencia tras el cambio de estado.
    expect(wrapper.get('h1').text()).toBe('Las solicitudes de acceso están cerradas')
    // Y el formulario desaparece: no se puede reenviar lo que ya está cerrado.
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('no filtra el motivo que devuelve el servidor', async () => {
    vi.spyOn(platformAccessApi, 'create').mockRejectedValue(
      respuestaDeError(404, DETALLE_QUE_FILTRA),
    )

    const texto = (await montarYEnviar()).text()

    expect(texto).not.toContain(DETALLE_QUE_FILTRA)
    expect(texto).not.toMatch(FUGAS)
  })

  it('no lo trata como un fallo: ni banner rojo ni aviso de error', async () => {
    vi.spyOn(platformAccessApi, 'create').mockRejectedValue(
      respuestaDeError(404, DETALLE_QUE_FILTRA),
    )

    const wrapper = await montarYEnviar()

    expect(wrapper.find('.ds-banner--error').exists()).toBe(false)
    expect(useToastStore().toasts).toHaveLength(0)
  })

  it('un 500, en cambio, sí es un fallo y deja el formulario en pie', async () => {
    vi.spyOn(platformAccessApi, 'create').mockRejectedValue(respuestaDeError(500, 'Boom'))

    const wrapper = await montarYEnviar()

    expect(wrapper.text()).not.toContain('Las solicitudes de acceso están cerradas')
    expect(wrapper.find('.ds-banner--error').exists()).toBe(true)
    expect(useToastStore().toasts).toHaveLength(1)
    // Lo escrito no se pierde.
    expect((wrapper.get('#acceso-nombre').element as HTMLInputElement).value).toBe('Ada Lovelace')
  })
})
