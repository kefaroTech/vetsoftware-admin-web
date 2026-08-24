import { test as setup, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUTH_STORAGE_KEY, loginViaApi, serializeSession } from './helpers/session'

/**
 * Autentica una sola vez y deja el `storageState` que reutilizan los demás
 * proyectos. Ver `helpers/session.ts` para el motivo (limitador de login).
 */

// `package.json` declara `"type": "module"`, así que aquí NO hay `__dirname`.
const here = path.dirname(fileURLToPath(import.meta.url))

export const STORAGE_STATE = path.join(here, '.auth', 'system-user.json')

setup('autenticar como usuario de sistema', async ({ request, baseURL }) => {
  const login = await loginViaApi(request)
  expect(login.type, 'la consola solo la opera un SYSTEM_USER').toBe('SYSTEM_USER')

  const origin = new URL(baseURL ?? 'http://localhost:5173').origin
  const state = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: AUTH_STORAGE_KEY, value: serializeSession(login) }],
      },
    ],
  }

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true })
  fs.writeFileSync(STORAGE_STATE, JSON.stringify(state, null, 2))
})
