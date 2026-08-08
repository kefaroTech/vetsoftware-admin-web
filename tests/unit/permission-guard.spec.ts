import { describe, it, expect, vi } from 'vitest'
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { permissionGuard } from '@/router/guards/permission.guard'
import { useAuthStore } from '@/features/auth/stores/auth.store'

/**
 * Este guard es la autorización del lado del cliente: decide si una ruta con
 * `meta.permission` se abre o rebota al dashboard. No sustituye al control del
 * backend —el `@PreAuthorize` sigue siendo la autoridad— pero sí es lo que
 * impide que un empleado vea pantallas que no le tocan.
 */

/** Ruta mínima con solo lo que el guard mira. */
function route(meta: Record<string, unknown> = {}): RouteLocationNormalized {
  return { meta } as unknown as RouteLocationNormalized
}

describe('permissionGuard', () => {
  it('deja pasar una ruta que no exige permiso', () => {
    const next = vi.fn() as unknown as NavigationGuardNext

    permissionGuard(route(), route(), next)

    expect(next).toHaveBeenCalledWith()
  })

  it('deja pasar cuando el usuario tiene el permiso exigido', () => {
    const store = useAuthStore()
    store.permissions = ['company.read']
    const next = vi.fn() as unknown as NavigationGuardNext

    permissionGuard(route({ permission: 'company.read' }), route(), next)

    expect(next).toHaveBeenCalledWith()
  })

  it('rebota al dashboard cuando le falta el permiso', () => {
    const store = useAuthStore()
    store.permissions = ['company.read']
    const next = vi.fn() as unknown as NavigationGuardNext

    permissionGuard(route({ permission: 'employee.delete' }), route(), next)

    expect(next).toHaveBeenCalledWith({ name: 'dashboard' })
  })

  it('rebota cuando el usuario no tiene ningún permiso cargado', () => {
    const next = vi.fn() as unknown as NavigationGuardNext

    permissionGuard(route({ permission: 'company.read' }), route(), next)

    expect(next).toHaveBeenCalledWith({ name: 'dashboard' })
  })

  it('no exige permisos concretos a un SYSTEM_USER', () => {
    // hasPermission concede todo al usuario de plataforma. Si esto cambiara, el
    // panel se volvería inoperable para quien lo administra.
    const store = useAuthStore()
    vi.spyOn(store, 'hasPermission').mockReturnValue(true)
    const next = vi.fn() as unknown as NavigationGuardNext

    permissionGuard(route({ permission: 'cualquier.cosa' }), route(), next)

    expect(next).toHaveBeenCalledWith()
  })
})
