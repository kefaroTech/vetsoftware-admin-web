import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  return { meta, fullPath } as unknown as RouteLocationNormalized
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

    authGuard(route({}, '/companies/42?tab=facturacion'), route(), next)

    expect(next).toHaveBeenCalledWith({
      name: ROUTE_NAMES.LOGIN,
      query: { redirect: '/companies/42?tab=facturacion' },
    })
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
