import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { storageService } from '@/services/storage/storage.service'

/**
 * El almacén de credenciales del panel. Es la última pieza que se toca al cerrar
 * sesión, y la que decide si un equipo compartido —la recepción de una clínica—
 * queda con la sesión del turno anterior abierta.
 *
 * Lo que se fija aquí no es que sepa escribir en `localStorage`, sino que
 * limpiar NUNCA falle: `clearAll` corre en el camino de logout y de expulsión
 * por 401, y un throw ahí aborta la limpieza a medias y deja el token puesto.
 */

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('access token', () => {
  it('sin sesión no hay token', () => {
    expect(storageService.getToken()).toBeNull()
  })

  it('guarda y recupera', () => {
    storageService.setToken('abc')

    expect(storageService.getToken()).toBe('abc')
  })

  it('borra', () => {
    storageService.setToken('abc')

    storageService.removeToken()

    expect(storageService.getToken()).toBeNull()
  })

  it('sobrescribe en vez de acumular', () => {
    // Tras un refresco conviven el token viejo y el nuevo si no se sobrescribe;
    // el interceptor leería el primero que encuentre.
    storageService.setToken('viejo')
    storageService.setToken('nuevo')

    expect(storageService.getToken()).toBe('nuevo')
  })
})

describe('el refresh token ya no vive aquí', () => {
  it('el almacén no expone ninguna operación de refresh token', () => {
    // FE-03: el refresh dura 30 días y en `localStorage` lo podía leer
    // cualquier script. Ahora lo emite el backend en una cookie HttpOnly. Si
    // alguien reintrodujera un getter/setter aquí, estaría devolviendo la
    // credencial de un mes al alcance de un XSS.
    expect(Object.keys(storageService)).toEqual([
      'getToken',
      'setToken',
      'removeToken',
      'clear',
      'clearAll',
    ])
  })

  it('no queda rastro del refresh token en localStorage tras usar el almacén', () => {
    storageService.setToken('access')

    expect(Object.keys(localStorage)).toEqual(['vet_token'])
  })
})

describe('limpieza de sesión', () => {
  it('clearAll deja localStorage y sessionStorage vacíos', () => {
    storageService.setToken('access')
    sessionStorage.setItem('aviso', 'algo')

    storageService.clearAll()

    expect(storageService.getToken()).toBeNull()
    expect(sessionStorage.getItem('aviso')).toBeNull()
  })

  it('no falla si localStorage lanza, y aun así limpia sessionStorage', () => {
    // Safari en navegación privada y algunas políticas de empresa lanzan al
    // tocar el almacenamiento. Si `clearAll` propagara ese error, el logout se
    // interrumpiría antes de vaciar el resto.
    sessionStorage.setItem('aviso', 'algo')
    vi.spyOn(Storage.prototype, 'clear').mockImplementationOnce(() => {
      throw new Error('acceso denegado')
    })

    expect(() => storageService.clearAll()).not.toThrow()
    expect(sessionStorage.getItem('aviso')).toBeNull()
  })

  it('no falla si los dos almacenes lanzan', () => {
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
      throw new Error('acceso denegado')
    })

    expect(() => storageService.clearAll()).not.toThrow()
  })

  it('clearAll sobre un almacén ya vacío es inocuo', () => {
    expect(() => storageService.clearAll()).not.toThrow()
    expect(storageService.getToken()).toBeNull()
  })

  it('clear vacía localStorage pero NO sessionStorage', () => {
    // Son dos operaciones distintas: `clear` es la limpieza de credenciales y
    // `clearAll` la de cierre de sesión completo. Confundirlas borraría avisos
    // de sesión —como el de "tu cuenta se inició en otro dispositivo"— que
    // viven en sessionStorage y tienen que sobrevivir a la redirección al login.
    storageService.setToken('access')
    sessionStorage.setItem('aviso', 'algo')

    storageService.clear()

    expect(storageService.getToken()).toBeNull()
    expect(sessionStorage.getItem('aviso')).toBe('algo')
  })
})
