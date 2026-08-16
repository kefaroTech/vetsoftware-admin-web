import type { AuthSubjectType } from '@/services/storage/storage.service'

/**
 * Claims que emite el backend. `companyId` solo viaja para `EMPLOYEE`: un
 * `SYSTEM_USER` no pertenece a ninguna empresa, así que es opcional aquí en vez
 * de estar declarado en dos formas distintas según el front que lo lea.
 */
export interface JwtPayload {
  sub: string
  type: AuthSubjectType
  companyId?: number
  iat: number
  exp: number
}

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 *
 * Verificar aquí no aportaría nada: la firma la comprueba el backend en cada
 * petición, y un cliente que no confía en su propio token tampoco puede confiar
 * en la clave con la que lo verificaría. Esto solo sirve para leer `exp` y
 * decidir en el navegador si merece la pena intentar la petición.
 *
 * Devuelve `null` ante cualquier entrada que no sea un JWT legible, para que el
 * llamador trate «token corrupto» igual que «sin sesión».
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    // base64url → base64, y se repone el relleno que base64url omite.
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}
