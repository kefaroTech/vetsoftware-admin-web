import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import { AxiosError, type AxiosResponse } from 'axios'
import AprobarAccesoView from '@/features/platform-access/views/AprobarAccesoView.vue'
import AceptarInvitacionView from '@/features/platform-access/views/AceptarInvitacionView.vue'
import { platformAccessApi } from '@/features/platform-access/api/platform-access.api'
import { PASSWORD_MIN } from '@/components/ui/PasswordChecklist.vue'
import { useConfirmDialogStore } from '@/stores/confirmDialog.store'
import { ROUTE_NAMES } from '@/constants/routes'

/**
 * EL TOKEN DEL CORREO NO SE QUEDA EN LA BARRA DE DIRECCIONES.
 *
 * Las dos pantallas que llegan por enlace reciben en `?token=` la única cosa
 * que las autoriza, y la de invitación es la grave: ese token CREA la
 * credencial de una cuenta con control total de la plataforma. Si nadie lo
 * quita, se queda en el historial del navegador —para siempre, y visible para
 * el siguiente que use el equipo—, en cualquier captura de esa pestaña y en el
 * `Referer` de las navegaciones posteriores.
 *
 * ── Por qué un router de verdad y no un doble ──────────────────────────────
 * Con un `router` simulado lo único afirmable es «se llamó a `replace`», que es
 * afirmar la implementación y no el efecto. Aquí el router escribe en la
 * historia de jsdom, así que se puede leer la URL de verdad (`window.location`)
 * y la longitud real del historial (`window.history.length`). Y tiene que ser
 * la historia del navegador, no `createMemoryHistory`: la memoria lleva su
 * propia posición interna, `window.location` no se mueve y `history.length` no
 * cuenta nada — las dos afirmaciones centrales se volverían vacías.
 *
 * ── La afirmación que separa «limpiar antes» de «limpiar después» ──────────
 * Ninguna otra lo hace: mirar la URL al final del test da limpio en los dos
 * casos. Por eso el doble de la API **fotografía `window.location.href` desde
 * dentro**, en el instante exacto en que sale la petición. Limpiar al terminar
 * deja la credencial en la barra durante todo el viaje de red — y para siempre
 * si la petición falla o se queda colgada.
 *
 * ── Y la regresión que este arreglo puede introducir ───────────────────────
 * En estas dos vistas el token vivía en un `computed` sobre `route.query`. Al
 * limpiar la URL ese `computed` se vacía, y el envío posterior —crear la
 * contraseña, aprobar o rechazar— saldría sin credencial sin un solo error a la
 * vista. De ahí los dos casos que comprueban que el token SÍ llega al `POST`
 * aunque ya no esté en la URL.
 */

const SOLICITUD = {
  fullName: 'Ada Lovelace',
  email: 'ada@empresa.com',
  reason: 'Voy a administrar los catálogos clínicos.',
  requestedAt: '2026-08-21T14:32:00Z',
}

const PASSWORD = 'a'.repeat(PASSWORD_MIN)

/** Un token muerto: 410 y 404 son el mismo estado en pantalla. */
function tokenMuerto(status: number): AxiosError {
  const error = new AxiosError('fallo')
  error.response = {
    status,
    data: { title: 'No disponible', status, detail: 'x', code: 'X' },
    statusText: '',
    headers: {},
    config: { headers: {} },
  } as unknown as AxiosResponse
  return error
}

function crearRouter(): Router {
  return createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/aprobar-acceso',
        name: ROUTE_NAMES.ACCESS_APPROVAL,
        component: { template: '<div />' },
      },
      {
        path: '/aceptar-invitacion',
        name: ROUTE_NAMES.ACCESS_INVITATION,
        component: { template: '<div />' },
      },
      { path: '/login', name: ROUTE_NAMES.LOGIN, component: { template: '<div />' } },
    ],
  })
}

/**
 * Deja el navegador en `url` sin añadir entrada al historial, de modo que el
 * conteo posterior mida solo lo que hace la pantalla. `replace` antes de montar
 * también resuelve la ruta, así que `route.query` ya está disponible en el
 * `setup()` del componente.
 */
async function llegarA(url: string): Promise<Router> {
  const router = crearRouter()
  await router.replace(url)
  await router.isReady()
  return router
}

async function montar(
  vista: typeof AprobarAccesoView | typeof AceptarInvitacionView,
  router: Router,
) {
  const wrapper = mount(vista, {
    // Obligatorio: `AprobarAccesoView` localiza el campo del código por
    // `document.getElementById`, y sin montar en el documento no existe.
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  window.history.replaceState(null, '', '/')
})

describe('aprobar acceso · el token sale de la URL antes de usarse', () => {
  it('con un enlace válido, la URL ya está limpia cuando sale la petición', async () => {
    let urlEnLaPeticion = ''
    vi.spyOn(platformAccessApi, 'validateAccessRequest').mockImplementation(async () => {
      // La foto desde dentro: este es el único instante en que un «limpiar
      // después» se distinguiría de un «limpiar antes».
      urlEnLaPeticion = window.location.href
      return SOLICITUD
    })

    const router = await llegarA('/aprobar-acceso?token=t-123')
    const historialAntes = window.history.length

    await montar(AprobarAccesoView, router)

    expect(urlEnLaPeticion).not.toContain('t-123')
    expect(urlEnLaPeticion).not.toContain('token')
    expect(window.location.search).toBe('')
    // `replace` sustituye la entrada; `push` añadiría una y dejaría la URL con
    // el token viva detrás del botón «atrás».
    expect(window.history.length).toBe(historialAntes)
    // Y la pantalla sí se pintó: sin esto el test pasaría con una vista rota.
    expect(document.body.textContent).toContain('Ada Lovelace')
  })

  it('conserva el resto de la cadena de consulta y descarta solo el token', async () => {
    vi.spyOn(platformAccessApi, 'validateAccessRequest').mockResolvedValue(SOLICITUD)

    const router = await llegarA('/aprobar-acceso?token=t-123&utm_source=correo')
    await montar(AprobarAccesoView, router)

    expect(window.location.search).toBe('?utm_source=correo')
    expect(window.location.pathname).toBe('/aprobar-acceso')
  })

  it('con el enlace caducado la URL queda igual de limpia', async () => {
    // El caso peligroso de verdad: la pantalla termina en un estado muerto y es
    // justo donde un «limpiar al terminar bien» se olvidaría del token.
    let urlEnLaPeticion = ''
    vi.spyOn(platformAccessApi, 'validateAccessRequest').mockImplementation(async () => {
      urlEnLaPeticion = window.location.href
      throw tokenMuerto(410)
    })

    const router = await llegarA('/aprobar-acceso?token=t-caducado')
    const historialAntes = window.history.length

    const wrapper = await montar(AprobarAccesoView, router)

    expect(urlEnLaPeticion).not.toContain('t-caducado')
    expect(window.location.search).toBe('')
    expect(window.history.length).toBe(historialAntes)
    expect(wrapper.text()).toContain('Este enlace ya no sirve')
  })

  it('sin token no llama al servidor ni toca el historial', async () => {
    const validar = vi.spyOn(platformAccessApi, 'validateAccessRequest')

    const router = await llegarA('/aprobar-acceso')
    const historialAntes = window.history.length

    const wrapper = await montar(AprobarAccesoView, router)

    expect(validar).not.toHaveBeenCalled()
    // No hay nada que limpiar: navegar aquí sería añadir una entrada de
    // historial por nada, y es la visita más frecuente de esta ruta.
    expect(window.history.length).toBe(historialAntes)
    expect(window.location.search).toBe('')
    expect(wrapper.text()).toContain('Este enlace ya no sirve')
  })

  it('el token sigue disponible para la decisión aunque la URL ya no lo tenga', async () => {
    // La regresión que introduce el arreglo si el token se deja en un `computed`
    // sobre `route.query`: se vacía al limpiar la URL y la aprobación sale sin
    // credencial, sin ningún error a la vista.
    vi.spyOn(platformAccessApi, 'validateAccessRequest').mockResolvedValue(SOLICITUD)
    let urlEnLaAprobacion = ''
    const aprobar = vi.spyOn(platformAccessApi, 'approve').mockImplementation(async () => {
      urlEnLaAprobacion = window.location.href
    })

    const router = await llegarA('/aprobar-acceso?token=t-123')
    const wrapper = await montar(AprobarAccesoView, router)

    await wrapper.get('#aprobar-codigo').setValue('123456')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    useConfirmDialogStore().accept()
    await flushPromises()

    expect(aprobar).toHaveBeenCalledWith({ token: 't-123', code: '123456' })
    expect(urlEnLaAprobacion).not.toContain('t-123')
  })
})

describe('aceptar invitación · el token que crea la credencial sale de la URL', () => {
  it('la URL ya está limpia cuando sale la validación del enlace', async () => {
    let urlEnLaPeticion = ''
    vi.spyOn(platformAccessApi, 'validateInvitation').mockImplementation(async () => {
      urlEnLaPeticion = window.location.href
      return { email: 'ada@empresa.com' }
    })

    const router = await llegarA('/aceptar-invitacion?token=inv-123')
    const historialAntes = window.history.length

    const wrapper = await montar(AceptarInvitacionView, router)

    expect(urlEnLaPeticion).not.toContain('inv-123')
    expect(urlEnLaPeticion).not.toContain('token')
    expect(window.location.search).toBe('')
    expect(window.history.length).toBe(historialAntes)
    expect(wrapper.text()).toContain('ada@empresa.com')
  })

  it('el token llega al POST que crea la contraseña, con la URL ya limpia', async () => {
    vi.spyOn(platformAccessApi, 'validateInvitation').mockResolvedValue({
      email: 'ada@empresa.com',
    })
    let urlEnElEnvio = ''
    const aceptar = vi.spyOn(platformAccessApi, 'acceptInvitation').mockImplementation(async () => {
      urlEnElEnvio = window.location.href
    })

    const router = await llegarA('/aceptar-invitacion?token=inv-123')
    const wrapper = await montar(AceptarInvitacionView, router)

    await wrapper.get('#invitacion-password').setValue(PASSWORD)
    await wrapper.get('#invitacion-confirmacion').setValue(PASSWORD)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(aceptar).toHaveBeenCalledWith({ token: 'inv-123', password: PASSWORD })
    expect(urlEnElEnvio).not.toContain('inv-123')
    expect(wrapper.text()).toContain('Cuenta activada')
  })

  it('con la invitación ya usada la URL queda limpia igualmente', async () => {
    let urlEnLaPeticion = ''
    vi.spyOn(platformAccessApi, 'validateInvitation').mockImplementation(async () => {
      urlEnLaPeticion = window.location.href
      throw tokenMuerto(404)
    })

    const router = await llegarA('/aceptar-invitacion?token=inv-usado')
    const historialAntes = window.history.length

    const wrapper = await montar(AceptarInvitacionView, router)

    expect(urlEnLaPeticion).not.toContain('inv-usado')
    expect(window.location.search).toBe('')
    expect(window.history.length).toBe(historialAntes)
    expect(wrapper.text()).toContain('Este enlace ya no sirve')
  })

  it('sin token no llama al servidor ni toca el historial', async () => {
    const validar = vi.spyOn(platformAccessApi, 'validateInvitation')

    const router = await llegarA('/aceptar-invitacion')
    const historialAntes = window.history.length

    const wrapper = await montar(AceptarInvitacionView, router)

    expect(validar).not.toHaveBeenCalled()
    expect(window.history.length).toBe(historialAntes)
    expect(window.location.search).toBe('')
    expect(wrapper.text()).toContain('Este enlace ya no sirve')
  })
})
