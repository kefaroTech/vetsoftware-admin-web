import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E de flujo — configuración de la consola de plataforma.
 *
 * ── Qué hay hoy en `./e2e` ─────────────────────────────────────────────────
 * Este fichero estuvo mucho tiempo apuntando a un directorio que no existía.
 * Ya no: la consola tiene E2E de flujo contra el backend real.
 *
 *   · `company-scope-header.spec.ts` — la cabecera `X-Company-Id` en sus tres
 *     situaciones (viaja / no viaja / falta). Es de lo que dependen 25 de las
 *     54 rutas, y hasta entonces no se había ejercitado nunca (issue #160).
 *   · `catalog-bridges.spec.ts` — los dos comportamientos de los editores de
 *     puentes que solo se ven abriendo el navegador: la ruta completa del ciclo
 *     de dependencias y el aviso de reactivación de un vínculo dado de baja.
 *   · `accessibility.spec.ts` — foco al `<h2 tabindex="-1">` tras cada
 *     escritura, `aria-invalid` + `aria-describedby` que resuelve, `ErrorSummary`
 *     con el mismo literal que el error en línea, y ningún estado solo por color.
 *
 * Sigue siendo, además, lo que impide que un `npx playwright test` a secas se
 * lleve por delante las pruebas de Vitest: sin configuración, Playwright escanea
 * el directorio de trabajo, hace match con `tests/unit/*.spec.ts` e intenta
 * ejecutarlas como suyas, y revientan con un error que no se parece a la causa.
 *
 * ── Requisitos para correrla ───────────────────────────────────────────────
 * Backend de `localdev` arriba en `/api/v1` y el catálogo de laboratorio
 * sembrado (contexto Liquibase `local,e2e`). Cada caso deja el sistema como lo
 * encontró: el ciclo lo rechaza el servidor y la reactivación revive la misma
 * fila, así que no queda nada que limpiar a mano.
 *
 * ── No se ejecuta en CI, y es deliberado ───────────────────────────────────
 * Los E2E de flujo del proyecto se corren a mano, en local. Ver el apartado de
 * pruebas del README.
 *
 * Credenciales por variable de entorno, nunca escritas en el código:
 *   E2E_SYSTEM_CODE
 *   E2E_SYSTEM_PASSWORD
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  /**
   * 60 s y no los 30 s por omisión: un caso de esta suite abre un diálogo, envía
   * un formulario al backend real, espera el rechazo del servidor y además pasa
   * por un `afterEach` que restituye el estado con otra navegación. Con 30 s el
   * cuerpo cabía justo y era el gancho de limpieza el que se quedaba sin
   * tiempo — un fallo que no dice nada del producto y que llegaría de forma
   * intermitente según la carga de la máquina.
   */
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Autentica UNA vez y deja el `storageState`. El backend limita los intentos
    // de login por IP (ventana de 1 minuto): una suite que teclee el formulario
    // en cada caso empieza a recibir 429 a mitad de tirada. Ver
    // `e2e/helpers/session.ts`.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      // `./e2e/tablet` queda fuera: esa suite mide el armazón con la API
      // interceptada y NO debe arrastrar el `setup`, que exige backend real.
      testIgnore: '**/tablet/**',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/system-user.json' },
      dependencies: ['setup'],
    },
    /**
     * Armazón en tablet — §8 de `docs/ux/armazon-tablet-especificacion.md`.
     *
     * Proyecto aparte y SIN `dependencies`, porque no las tiene: intercepta
     * toda la API y siembra la sesión en `localStorage`, así que corre con el
     * backend apagado. Es deliberado por dos motivos. Uno, lo que mide —cuántas
     * barras de scroll hay, si el documento desborda, si un objetivo táctil
     * llega a 44 px— no pasa por el servidor. Y dos, el listado tiene que ser
     * SIEMPRE el mismo: con datos reales, «el contenido desborda el alto»
     * dependería de cuántas filas hubiera sembradas ese día, y el criterio se
     * cumpliría solo la mitad de las veces.
     *
     * El viewport lo fija cada bloque con `test.use()`: la suite entera existe
     * para comparar 768×1024 contra 1024×768 contra escritorio.
     *
     * Se corre solo:  npx playwright test --project=armazon-tablet
     */
    {
      name: 'armazon-tablet',
      testDir: './e2e/tablet',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Reusa el servidor si ya está arriba; si no, lo levanta.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
