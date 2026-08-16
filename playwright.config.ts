import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E — casos de prueba escritos en código (alternativa local a
 * TestSprite). La app debe estar corriendo en http://localhost:5173
 * (`npm run dev`), que ya proxya /api al backend sin CORS.
 *
 * Credenciales por variable de entorno (nunca hardcodeadas):
 *   E2E_EMPLOYEE_CODE (default "O")
 *   E2E_PASSWORD      (requerida para los casos que hacen login)
 *
 * Ejecutar:  npm run e2e        (headless)
 *            npm run e2e:ui     (modo interactivo)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Proyecto de SEMBRADO: crea una sola vez (contra el backend real) el
    // paciente con historia clínica + el propietario sin mascotas y los persiste
    // a un JSON. Usa el contexto managed de Playwright (el login del wizard solo
    // funciona ahí). Se auto-salta si el run no incluye historia (ver el archivo).
    { name: 'setup', testMatch: /historia\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    // TODAS las specs (auth, consulta, acciones, historia) corren bajo ESTE único
    // proyecto → en `--ui` se ven juntas en un solo nodo. Depende de `setup` para
    // que el sembrado esté listo antes de los casos de historia.
    {
      name: 'chromium',
      testIgnore: /historia\.setup\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Reusa el server si ya está arriba; si no, lo levanta.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
