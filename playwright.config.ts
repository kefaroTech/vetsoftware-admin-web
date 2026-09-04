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
      // `./e2e/tablet`, `./e2e/supresion`, `./e2e/pistas` y `./e2e/guardas`
      // quedan fuera: esas suites miden con la API interceptada y NO deben
      // arrastrar el `setup`, que exige backend real.
      testIgnore: ['**/tablet/**', '**/supresion/**', '**/pistas/**', '**/guardas/**'],
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
    /**
     * Supresión de datos del asistente — habeas data, Ley 1581 art. 8 lit. e.
     *
     * Proyecto aparte y SIN `dependencies`, por el mismo motivo que
     * `armazon-tablet` y por uno propio que pesa más: el endpoint de detrás
     * BORRA de verdad, es irreversible y el contrato no publica ninguna lectura
     * con la que comprobar antes ni restituir después. Una suite que lo llamara
     * contra `localdev` incumpliría «cada spec deja el sistema como lo
     * encontró» de la única forma que no tiene arreglo. Además, los dos
     * desenlaces que la suite existe para separar —hallazgo y cero
     * coincidencias— no se pueden provocar a voluntad contra datos reales.
     *
     * Todo el tráfico va interceptado en `e2e/helpers/supresion.ts`, así que
     * corre con el backend apagado.
     *
     * Se corre solo:  npx playwright test --project=supresion-datos
     */
    {
      name: 'supresion-datos',
      testDir: './e2e/supresion',
      use: { ...devices['Desktop Chrome'] },
    },
    /**
     * Pistas del asistente — `/asistente/pistas` y su ficha.
     *
     * Proyecto aparte y SIN `dependencies`, por los mismos motivos que los dos
     * de arriba y por tres propios que `e2e/helpers/pistas.ts` desarrolla:
     *
     *  · La fila que más importa —pista viva con `catalogItemCode` y
     *    `catalogItemName` NULOS— exige un artículo deshabilitado en el
     *    catálogo GLOBAL de plataforma que además tenga pista vigente. Sembrarlo
     *    contra `localdev` es mutar el catálogo comercial para probar otra
     *    pantalla, y dejarlo mutado.
     *  · `catalog_item_ai_hints` es historial append-only: el `PUT` inserta y el
     *    `DELETE` solo cierra la vigencia. Publicar o retirar contra el servidor
     *    real deja revisiones que NADA puede quitar después, y el índice único
     *    `(catalog_item_id, hint_hash)` impide incluso republicar el texto
     *    anterior. «Cada spec deja el sistema como lo encontró» sería imposible.
     *  · Y lo que se escribe aquí cambia lo que se le vende a desconocidos, sin
     *    despliegue: pistas de prueba en un servidor compartido llegan al
     *    siguiente prospecto que escriba en la landing.
     *
     * Se corre solo:  npx playwright test --project=pistas-asistente
     */
    {
      name: 'pistas-asistente',
      testDir: './e2e/pistas',
      use: { ...devices['Desktop Chrome'] },
    },
    /**
     * Guardas de interacción de las primitivas — relleno del campo, cancelación
     * del puntero en `AppSelect`, rótulos del raíl sin recortar.
     *
     * Proyecto aparte y SIN `dependencies`, por el mismo motivo que los tres de
     * arriba y por uno propio: lo que mide no es comportamiento de producto
     * sino GEOMETRÍA y protocolo de puntero de los componentes compartidos, y
     * eso no pasa por el servidor. Dos de las tres suites se montan sobre
     * `visual/gallery.html`, que ni siquiera tiene router.
     *
     * Existen como E2E y no como pruebas unitarias porque en jsdom todo
     * rectángulo mide 0×0 y no hay reparto de eventos por coordenadas: «el clic
     * a 4 px del borde cae dentro del `<input>`» no es una afirmación que jsdom
     * pueda evaluar.
     *
     * Se corre solo:  npx playwright test --project=guardas-ux
     */
    {
      name: 'guardas-ux',
      testDir: './e2e/guardas',
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
