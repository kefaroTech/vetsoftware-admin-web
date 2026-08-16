import { defineConfig, devices } from '@playwright/test'

/**
 * Regresión visual — configuración SEPARADA de `playwright.config.ts`.
 *
 * Son dos suites con requisitos opuestos y por eso no comparten fichero: los
 * E2E hablan con el backend real y con credenciales, y esta no habla con nadie.
 * Mezclarlas obligaría a que el proyecto `setup` de aquellos corriera también
 * para sacar una captura de un botón.
 *
 * ── Las líneas base son de Linux ───────────────────────────────────────────
 * Un PNG generado en Windows NO coincide con el del runner: cambian el
 * antialiasing y las métricas de fuente. Por eso `npm run visual` corre dentro
 * del contenedor oficial de Playwright, la misma imagen que usa el CI, y las
 * capturas se guardan sin sufijo de plataforma. Generarlas fuera del contenedor
 * produciría una base que el CI no puede reproducir.
 */
export default defineConfig({
  testDir: './visual',
  testMatch: /.*\.visual\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Sin reintentos: una captura no es "flaky", o coincide o no. Reintentar solo
  // escondería una diferencia real detrás de una segunda tirada.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-visual' }]],

  // Sin sufijo de plataforma: hay UNA base, la de Linux, y se genera en el
  // contenedor. Si el nombre llevara `-win32`, cada quien crearía la suya y el
  // CI compararía contra una que nadie mira.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',

  expect: {
    toHaveScreenshot: {
      // 0.2 % de píxeles de margen: absorbe el subpíxel del renderizado de
      // texto sin dejar pasar un cambio de color, de espaciado o de borde, que
      // es lo que este hallazgo necesita detectar.
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
      scale: 'css',
    },
  },

  use: {
    baseURL: process.env.VISUAL_BASE_URL ?? 'http://localhost:5173',
    // Viewport fijo: el ancho decide los saltos de rejilla, así que dejarlo al
    // azar del entorno haría que la base dependiera del tamaño de la ventana.
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    timezoneId: 'America/Bogota',
    locale: 'es-CO',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
