/**
 * Sesión de la consola de plataforma para los E2E.
 *
 * ── Por qué NO se hace login por la interfaz en cada test ───────────────────
 * El backend tiene un limitador de intentos de login por IP
 * (`LoginRateLimitFilter`, ventana de 1 minuto). Una suite que teclee el
 * formulario en cada caso agota la ventana y empieza a recibir 429
 * `LOGIN_RATE_LIMITED` a mitad de tirada: los fallos aparecerían en tests
 * distintos según el orden y la velocidad de la máquina, que es la definición
 * de una suite intermitente.
 *
 * Por eso se autentica UNA vez (proyecto `setup`) contra la API y se reparte el
 * `storageState` resultante. El formulario de login SÍ se ejercita, pero en su
 * propio spec y una sola vez.
 */

import type { APIRequestContext } from '@playwright/test'

/** Base de la API. El backend cuelga de `/api/v1`. */
export const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'

/**
 * Credencial del usuario de sistema.
 *
 * `local-admin` es la vía soportada: la siembra Liquibase bajo contexto
 * `local,e2e`, así que sobrevive a recrear la base. Se puede sustituir por
 * variable de entorno para no fijar una credencial en el código de un repo
 * público.
 */
export const SYSTEM_USER_CODE = process.env.E2E_SYSTEM_CODE ?? 'local-admin'
export const SYSTEM_USER_PASSWORD = process.env.E2E_SYSTEM_PASSWORD ?? 'LabAdmin#2026!'

/** Clave de `localStorage` donde `storage.service.ts` persiste la sesión. */
export const AUTH_STORAGE_KEY = 'vetsoft.auth'

/** Cabecera de alcance de empresa que exige `Authz.requiredSystemCompanyId()`. */
export const COMPANY_ID_HEADER = 'x-company-id'

export interface LoginResult {
  token: string
  type: 'SYSTEM_USER' | 'EMPLOYEE'
}

/**
 * Autentica contra la API real y devuelve el token. Sin mocks: si el backend no
 * está levantado o la credencial no existe, esto falla y la suite entera falla
 * con un mensaje que dice exactamente eso.
 */
export async function loginViaApi(
  request: APIRequestContext,
  code: string = SYSTEM_USER_CODE,
  password: string = SYSTEM_USER_PASSWORD,
): Promise<LoginResult> {
  const response = await request.post(`${API_BASE}/auth/login/system`, {
    data: { code, password },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok()) {
    const body = await response.text()
    throw new Error(
      `Login de sistema falló (${response.status()}): ${body}\n` +
        `Comprueba que el backend está arriba en ${API_BASE} y que la credencial ` +
        `«${code}» existe (semilla Liquibase, contexto local,e2e).`,
    )
  }
  const payload = (await response.json()) as { token?: string; type?: string }
  if (!payload.token)
    throw new Error(`El login respondió 200 pero sin token: ${JSON.stringify(payload)}`)
  return { token: payload.token, type: (payload.type as LoginResult['type']) ?? 'SYSTEM_USER' }
}

/** El valor exacto que `storage.service.ts` espera encontrar en `localStorage`. */
export function serializeSession(login: LoginResult): string {
  return JSON.stringify({ token: login.token, type: login.type })
}
