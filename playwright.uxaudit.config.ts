import { defineConfig, devices } from '@playwright/test'

/**
 * Arnés de auditoría UX — configuración PROPIA, separada de las dos que ya hay.
 *
 * No es regresión visual: no compara contra `visual/__screenshots__` ni tiene
 * `expect.toHaveScreenshot`. Fotografía cada pantalla del router en cuatro
 * anchos y vuelca sus medidas a JSON para que otra persona las audite.
 *
 * `testMatch` pide `.uxaudit.ts` y no `.spec.ts` a propósito: así el fichero
 * vive dentro de `e2e/` —donde `tsconfig.e2e.json` lo typechequea y el alias
 * `@/` resuelve— sin que `playwright.config.ts`, cuyo `testMatch` por defecto
 * solo coge `*.spec.ts`, lo arrastre a la suite de flujo, que exige backend.
 *
 * Un solo worker: la pasada comparte servidor de dev y navegador, y las medidas
 * de geometría dependen del viewport del contexto, no del reparto entre
 * procesos.
 */
export default defineConfig({
  testDir: './e2e/uxaudit',
  testMatch: /.*\.uxaudit\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // El caso recorre todas las rutas × 4 anchos × 2 estados; lo acota
  // `test.setTimeout(0)` dentro del propio caso, no un tope aquí.
  timeout: 0,
  reporter: [['list']],

  use: {
    baseURL: process.env.UXA_BASE_URL ?? 'http://localhost:5173',
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
