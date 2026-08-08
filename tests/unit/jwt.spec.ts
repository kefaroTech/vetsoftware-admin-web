import { describe, it, expect } from 'vitest'
import { decodeJwt } from '@/features/auth/utils/jwt'

/**
 * `decodeJwt` decide de qué tipo es el usuario y cuándo caduca su sesión, y de
 * eso dependen el guard de autenticación y `hasPermission`. No valida la firma
 * —eso es del backend—, así que lo que importa aquí es que nunca lance: si
 * reventara con un token corrupto, el guard reventaría con él y la aplicación
 * quedaría en blanco en vez de mandar al login.
 */

/**
 * Construye un JWT sin firmar con el payload dado, en base64url como el real.
 * El JSON se pasa por UTF-8 antes de base64 porque `btoa` solo admite bytes:
 * es exactamente lo que hace el backend, y lo que obliga a `decodeJwt` a
 * deshacer la codificación al leerlo.
 */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (value: object) => {
    const utf8 = new TextEncoder().encode(JSON.stringify(value))
    const binary = String.fromCharCode(...utf8)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.firma-no-verificada`
}

describe('decodeJwt', () => {
  it('extrae el payload de un token bien formado', () => {
    const token = makeToken({ sub: '42', type: 'EMPLOYEE', iat: 1_700_000_000, exp: 1_700_003_600 })

    expect(decodeJwt(token)).toEqual({
      sub: '42',
      type: 'EMPLOYEE',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    })
  })

  it('descodifica base64url sin relleno, que es como los emite el backend', () => {
    // Un payload cuya longitud en base64 no es múltiplo de 4 obliga a reponer el
    // relleno '='. Sin eso, atob lanza y el token válido se descartaría.
    const token = makeToken({ sub: '7', type: 'SYSTEM_USER', iat: 1, exp: 2 })

    expect(decodeJwt(token)?.type).toBe('SYSTEM_USER')
  })

  it('conserva los caracteres no ASCII del payload', () => {
    const token = makeToken({ sub: 'José Muñoz ñ', type: 'EMPLOYEE', iat: 1, exp: 2 })

    expect(decodeJwt(token)?.sub).toBe('José Muñoz ñ')
  })

  it.each([
    ['una cadena vacía', ''],
    ['un token sin puntos', 'esto-no-es-un-jwt'],
    ['un token sin payload', 'solo-cabecera.'],
    ['un payload que no es base64', 'cabecera.@@@@.firma'],
    ['un payload que no es JSON', `cabecera.${btoa('esto no es json')}.firma`],
  ])('devuelve null ante %s en vez de lanzar', (_caso, token) => {
    expect(() => decodeJwt(token)).not.toThrow()
    expect(decodeJwt(token)).toBeNull()
  })
})
