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

function route(meta: Record<string, unknown> = {}): RouteLocationNormalized {
  return { meta } as unknown as RouteLocationNormalized
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

    expect(next).toHaveBeenCalledWith({ name: ROUTE_NAMES.LOGIN })
  })

  it('deja pasar con un token vigente', () => {
    const store = useAuthStore()
    store.token = tokenExpiring(3600)
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route(), route(), next)

    expect(next).toHaveBeenCalledWith()
    expect(notify).not.toHaveBeenCalled()
  })

  it('deja pasar con el access vencido si queda refresh token', () => {
    // El 401 posterior dispara la renovación transparente. Cerrar sesión aquí
    // expulsaría al usuario en cada recarga después de una hora.
    const store = useAuthStore()
    store.token = tokenExpiring(-60)
    store.refreshToken = 'refresh-vigente'
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route(), route(), next)

    expect(next).toHaveBeenCalledWith()
    expect(notify).not.toHaveBeenCalled()
  })

  it('limpia la sesión y avisa cuando el access venció y no hay refresh', () => {
    const store = useAuthStore()
    store.token = tokenExpiring(-60)
    store.refreshToken = null
    const clearSession = vi.spyOn(store, 'clearSession')
    const next = vi.fn() as unknown as NavigationGuardNext

    authGuard(route(), route(), next)

    expect(clearSession).toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('Sesión expirada, vuelve a iniciar sesión.', 'warning')
    expect(next).toHaveBeenCalledWith({ name: ROUTE_NAMES.LOGIN })
  })
})
