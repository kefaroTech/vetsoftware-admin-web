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

describe('refresh token', () => {
  it('vive en una clave distinta del access token', () => {
    // Compartir clave haría que borrar uno borrase el otro, cerrando la sesión
    // en cada renovación.
    storageService.setToken('access')
    storageService.setRefreshToken('refresh')

    expect(storageService.getToken()).toBe('access')
    expect(storageService.getRefreshToken()).toBe('refresh')
  })

  it('borrar el access no arrastra al refresh', () => {
    // El interceptor borra el access para forzar la renovación; si se llevara el
    // refresh, no habría con qué renovar.
    storageService.setToken('access')
    storageService.setRefreshToken('refresh')

    storageService.removeToken()

    expect(storageService.getRefreshToken()).toBe('refresh')
  })

  it('borrar el refresh no arrastra al access', () => {
    storageService.setToken('access')
    storageService.setRefreshToken('refresh')

    storageService.removeRefreshToken()

    expect(storageService.getToken()).toBe('access')
  })
})

describe('limpieza de sesión', () => {
  it('clearAll deja localStorage y sessionStorage vacíos', () => {
    storageService.setToken('access')
    storageService.setRefreshToken('refresh')
    sessionStorage.setItem('aviso', 'algo')

    storageService.clearAll()

    expect(storageService.getToken()).toBeNull()
    expect(storageService.getRefreshToken()).toBeNull()
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
