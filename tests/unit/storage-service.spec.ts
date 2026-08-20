import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AUTH_STORAGE_KEY, storageService } from '@/services/storage/storage.service'

/**
 * El almacén de credenciales. Es la última pieza que se toca al cerrar sesión, y
 * la que decide si un equipo compartido —la recepción de una clínica— queda con
 * la sesión del turno anterior abierta.
 *
 * Lo que se fija aquí no es que sepa escribir en `localStorage`, sino que limpiar
 * NUNCA falle: `clearAll` corre en el camino de logout y de expulsión por 401, y
 * un throw ahí aborta la limpieza a medias y deja el token puesto.
 *
 * Este archivo se mantiene idéntico en los dos fronts.
 */

const SESION = { token: 'abc', type: 'EMPLOYEE' } as const

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sesión', () => {
  it('sin sesión no hay token', () => {
    expect(storageService.getSession()).toBeNull()
    expect(storageService.getToken()).toBeNull()
  })

  it('guarda y recupera', () => {
    storageService.setSession(SESION)

    expect(storageService.getSession()).toEqual(SESION)
    expect(storageService.getToken()).toBe('abc')
  })

  it('sobrescribe en vez de acumular', () => {
    // Tras un refresco conviven el token viejo y el nuevo si no se sobrescribe;
    // el interceptor leería el primero que encuentre.
    storageService.setSession({ token: 'viejo', type: 'EMPLOYEE' })
    storageService.setSession({ token: 'nuevo', type: 'EMPLOYEE' })

    expect(storageService.getToken()).toBe('nuevo')
    expect(Object.keys(localStorage)).toEqual([AUTH_STORAGE_KEY])
  })

  it('descarta una entrada corrupta en vez de arrastrarla', () => {
    // Si sobreviviera, cada petición intentaría parsearla otra vez y el usuario
    // se quedaría en un limbo: ni autenticado ni enviado al login.
    localStorage.setItem(AUTH_STORAGE_KEY, '{roto')

    expect(storageService.getSession()).toBeNull()
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('una sesión sin token no cuenta como sesión', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ type: 'EMPLOYEE' }))

    expect(storageService.getSession()).toBeNull()
  })
})

describe('el refresh token ya no vive aquí', () => {
  it('el almacén no expone ninguna operación de refresh token', () => {
    // FE-03: el refresh dura 30 días y en `localStorage` lo podía leer cualquier
    // script. Ahora lo emite el backend en una cookie HttpOnly. Si alguien
    // reintrodujera un getter/setter aquí, estaría devolviendo la credencial de
    // un mes al alcance de un XSS.
    expect(Object.keys(storageService)).toEqual([
      'getSession',
      'getToken',
      'setSession',
      'clearSession',
      'registerVolatileKey',
      'clearVolatile',
      'clearAll',
      'takeSessionReplacedNotice',
      'setSessionReplacedNotice',
    ])
  })

  it('no queda rastro del refresh token en localStorage tras usar el almacén', () => {
    storageService.setSession(SESION)

    expect(Object.keys(localStorage)).toEqual([AUTH_STORAGE_KEY])
    expect(JSON.stringify(localStorage)).not.toContain('refresh')
  })
})

describe('limpieza de sesión', () => {
  it('clearAll deja localStorage y sessionStorage vacíos', () => {
    storageService.setSession(SESION)
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

  it('clearSession vacía las credenciales pero NO sessionStorage', () => {
    // Son dos operaciones distintas: `clearSession` es la limpieza de
    // credenciales y `clearAll` la de cierre de sesión completo. Confundirlas
    // borraría el aviso de «tu cuenta se inició en otro dispositivo», que vive en
    // sessionStorage y tiene que sobrevivir a la redirección al login.
    storageService.setSession(SESION)
    sessionStorage.setItem('aviso', 'algo')

    storageService.clearSession()

    expect(storageService.getToken()).toBeNull()
    expect(sessionStorage.getItem('aviso')).toBe('algo')
  })

  it('clearSession no falla si localStorage lanza', () => {
    storageService.setSession(SESION)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
      throw new Error('acceso denegado')
    })

    expect(() => storageService.clearSession()).not.toThrow()
  })
})

describe('claves volátiles (TR-02, issue #68)', () => {
  it('registerVolatileKey es idempotente: registrar dos veces no duplica el borrado', () => {
    storageService.registerVolatileKey('vetsoft.branch')
    storageService.registerVolatileKey('vetsoft.branch')
    localStorage.setItem('vetsoft.branch', 'norte')

    expect(() => storageService.clearVolatile()).not.toThrow()
    expect(localStorage.getItem('vetsoft.branch')).toBeNull()
  })

  it('clearVolatile borra las credenciales y toda clave registrada', () => {
    // Caso del issue: el borrador de "Nueva consulta" (`vetrina:nueva-consulta-draft`)
    // sobrevivía al logout porque `redirectToLogin` solo llamaba a `clearSession`,
    // que a propósito no toca nada fuera de `AUTH_STORAGE_KEY`.
    const DRAFT_KEY = 'vetrina:nueva-consulta-draft'
    storageService.registerVolatileKey(DRAFT_KEY)
    storageService.setSession(SESION)
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ paso: 2 }))

    storageService.clearVolatile()

    expect(storageService.getToken()).toBeNull()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('clearVolatile conserva SESSION_REPLACED_NOTICE_KEY', () => {
    // Es el aviso que lee la pantalla de login justo después del redirect duro
    // que hace `redirectToLogin`. Si `clearVolatile` lo borrara, el usuario
    // dejaría de saber por qué se le echó de la sesión.
    storageService.setSessionReplacedNotice('Tu cuenta se inició en otro dispositivo.')

    storageService.clearVolatile()

    expect(storageService.takeSessionReplacedNotice()).toBe(
      'Tu cuenta se inició en otro dispositivo.',
    )
  })

  it('clearVolatile no toca una clave que nadie registró', () => {
    localStorage.setItem('otra.app.preferencia', 'valor')

    storageService.clearVolatile()

    expect(localStorage.getItem('otra.app.preferencia')).toBe('valor')
  })

  it('clearVolatile no falla si localStorage lanza al borrar una clave registrada', () => {
    storageService.registerVolatileKey('vetsoft.branch')
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('acceso denegado')
    })

    expect(() => storageService.clearVolatile()).not.toThrow()
  })
})

describe('aviso de sesión desplazada', () => {
  it('se consume de una vez: leerlo lo borra', () => {
    // Si no se borrara al leerlo, el aviso reaparecería en cada visita al login
    // durante toda la pestaña, mucho después de haber dejado de ser cierto.
    storageService.setSessionReplacedNotice('Tu cuenta se inició en otro dispositivo.')

    expect(storageService.takeSessionReplacedNotice()).toBe(
      'Tu cuenta se inició en otro dispositivo.',
    )
    expect(storageService.takeSessionReplacedNotice()).toBeNull()
  })

  it('sobrevive a clearSession, que es lo que corre justo antes del redirect', () => {
    storageService.setSession(SESION)
    storageService.setSessionReplacedNotice('Tu cuenta se inició en otro dispositivo.')

    storageService.clearSession()

    expect(storageService.takeSessionReplacedNotice()).toBe(
      'Tu cuenta se inició en otro dispositivo.',
    )
  })
})
