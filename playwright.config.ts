import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E de flujo — configuración de la consola de plataforma.
 *
 * ── Hoy este repositorio NO tiene E2E de flujo ─────────────────────────────
 * `testDir` apunta a `./e2e`, y ese directorio no existe: la cobertura de la
 * consola es hoy Vitest (`tests/unit/`) y regresión visual
 * (`playwright.visual.config.ts`). Los E2E de flujo viven en el otro front,
 * VetSoftwarePublicFront, que es donde están los recorridos de usuario.
 *
 * ── Entonces, ¿por qué sigue existiendo este fichero? ──────────────────────
 * Porque es lo que impide que un `npx playwright test` a secas se lleve por
 * delante las pruebas de Vitest. Sin él, Playwright no encuentra configuración,
 * escanea el directorio de trabajo, hace match con `tests/unit/*.spec.ts` e
 * intenta ejecutarlas como si fueran suyas: revientan con
 * `Cannot read properties of undefined (reading 'VITE_API_URL')` y el error no
 * se parece en nada a la causa. Con este fichero delante, el mismo comando dice
 * «No tests found», que es la verdad.
 *
 * Es además el sitio donde aterrizarían los E2E de la consola si algún día se
 * escriben: crea `e2e/`, deja los specs ahí y esto ya funciona.
 *
 * ── No se ejecuta en CI, y es deliberado ───────────────────────────────────
 * Los E2E de flujo del proyecto se corren a mano, en local. Ver el apartado de
 * pruebas del README.
 *
 * Credenciales por variable de entorno, nunca escritas en el código:
 *   E2E_EMPLOYEE_CODE
 *   E2E_PASSWORD
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Reusa el servidor si ya está arriba; si no, lo levanta.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
