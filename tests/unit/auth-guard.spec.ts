import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { authGuard } from '@/router/guards/auth.guard'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ROUTE_NAMES } from '@/constants/routes'

const notify = vi.fn()
vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({ notify }),
}))

/**
 * El guard de sesión. Su parte delicada no es echar al usuario sin token, sino
 * la distinción entre "access vencido con refresh disponible" —donde hay que
 * dejar pasar para que el primer 401 dispare la renovación transparente— y
 * "vencido sin refresh", donde hay que limpiar y mandar al login. Invertir esa
 * condición cierra la sesión de todo el mundo en cada recarga.
 */

function route(meta: Record<string, unknown> = {}, fullPath = '/'): RouteLocationNormalized {
  // `path` es `fullPath` sin query ni hash, igual que lo construye vue-router.
  // Los dos tienen que existir en el doble o el test no distinguiría cuál de
  // los dos lee el guard, que es justo lo que aquí se está comprobando.
  const path = fullPath.split(/[?#]/)[0]
  return { meta, fullPath, path } as unknown as RouteLocationNormalized
}

/** El destino (`?redirect=`) con el que el guard mandó al login. */
function redirectCapturado(next: NavigationGuardNext): string {
  const espia = next as unknown as Mock<(location: { query: { redirect: string } }) => void>
  return espia.mock.calls[0]?.[0]?.query.redirect ?? ''
}

/** Token cuyo `exp` cae antes o después de ahora, según se pida. */
function tokenExpiring(secondsFromNow: number): string {
  const payload = {
    sub: '1',
    type: 'EMPLOYEE',
    iat: 0,
    exp: Math.floor(Date.now() / 1000) + secondsFromNow,
  }
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma`
}

describe('authGuard', () => {
  beforeEach(() => {
    notify.mockClear()
  })

  it('deja pasar una ruta pública sin mirar la sesión', () => {
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route({ public: true }), route(), next)

    expect(next).toHaveBeenCalledWith()
  })

  it('manda al login cuando no hay token', () => {
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route(), route(), next)

    expect(next).toHaveBeenCalledWith({ name: ROUTE_NAMES.LOGIN, query: { redirect: '/' } })
  })

  it('recuerda la ruta protegida a la que el usuario quería llegar', () => {
    // La razón de ser del arreglo: sin esto, tras autenticar el usuario aterriza
    // siempre en el home aunque hubiera abierto un enlace profundo.
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route({}, '/companies/42'), route(), next)

    expect(next).toHaveBeenCalledWith({
      name: ROUTE_NAMES.LOGIN,
      query: { redirect: '/companies/42' },
    })
  })

  it('no republica la cadena de consulta de la ruta protegida en la URL de login', () => {
    // El guard es infraestructura genérica: no sabe qué parámetro de qué feature
    // es un secreto. En este monorepo `token` ya nombra a cuatro distintos
    // (restablecer contraseña, aceptar invitación, aprobar acceso, recuperar
    // propuesta), así que recorta la query entera. Reenviarla dejaría el secreto
    // en la barra de direcciones del login, en el historial y en el `Referer`.
    // El valor NO tiene pinta de credencial a propósito. El pre-commit escanea
    // con gitleaks, y un literal entrópico junto a un identificador que contiene
    // «secret» dispara `generic-api-key` y bloquea el commit por un dato de
    // mentira. Lo que esta prueba necesita es que este valor NO aparezca en la
    // URL de login; que parezca real no aporta nada.
    const VALOR_EN_LA_QUERY = 'aprobacion-de-mentira'
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route({}, `/companies/42?token=${VALOR_EN_LA_QUERY}&tab=facturacion`), route(), next)

    const destino = redirectCapturado(next)
    expect(destino).toBe('/companies/42')

    // La URL de login tal y como acaba en el navegador. Se afirma sobre la forma
    // cruda Y sobre la decodificada: sin el arreglo el rojo se ve escapado
    // (`?redirect=%2Fcompanies%2F42%3Ftoken%3D…`), y un `toContain` sobre una
    // sola de las dos formas puede pasar por alto la otra.
    const urlLogin = `/login?redirect=${encodeURIComponent(destino)}`
    for (const forma of [urlLogin, decodeURIComponent(urlLogin)]) {
      expect(forma).not.toContain('token')
      expect(forma).not.toContain(VALOR_EN_LA_QUERY)
      expect(forma).not.toContain('tab')
    }
  })

  it('deja pasar con un token vigente', () => {
    const store = useAuthStore()
    store.session = { token: tokenExpiring(3600), type: 'EMPLOYEE' }
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route(), route(), next)

    expect(next).toHaveBeenCalledWith()
    expect(notify).not.toHaveBeenCalled()
  })

  it('deja pasar con el access vencido y delega la renovación al interceptor', () => {
    // El refresh token vive en una cookie HttpOnly: el guard no puede saber si
    // existe. Deja pasar siempre, el primer 401 dispara la renovación, y si no
    // hay cookie el backend responde 401 otra vez y el interceptor manda a login.
    //
    // Antes esta decisión se tomaba leyendo el refresh token de localStorage.
    // Ese era exactamente el valor que un XSS podía llevarse.
    const store = useAuthStore()
    store.session = { token: tokenExpiring(-60), type: 'EMPLOYEE' }
    const clearSession = vi.spyOn(store, 'clearSession')
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route(), route(), next)

    expect(next).toHaveBeenCalledWith()
    expect(clearSession).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('no expone el refresh token en el store', () => {
    // Contrato del arreglo: si alguien vuelve a añadir el refresh al store, ya
    // es legible desde la consola del navegador y desde cualquier script inyectado.
    const store = useAuthStore() as unknown as Record<string, unknown>

    expect(store.refreshToken).toBeUndefined()
  })
})
