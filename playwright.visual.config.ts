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

  /* ── Por qué la concurrencia va fija y baja ──────────────────────────────
   *
   * Con la concurrencia por defecto —la mitad de los núcleos lógicos, 16 en la
   * máquina donde se midió— el `beforeEach` de `shell-tablet` falló 3 de 4
   * veces dentro del contenedor. El velo de `PageLoader` quedaba con
   * `page-loader-fade-enter-from`, `-leave-from` y `-leave-active` a la vez, y
   * sin `-enter-active` ni `-leave-to`: esa combinación no es un velo que siga
   * puesto, es una transición de Vue que nunca avanzó de fotograma porque el
   * `requestAnimationFrame` no llegó a correr. Es inanición de render, así que
   * ampliar el tiempo de espera no arregla nada — el fotograma que falta no
   * llega por esperarlo más. Con 2 pasaron 4 de 4, dos veces seguidas.
   *
   * Fijarlo no cambia lo que hace el CI: el job corre en un runner de 4 vCPU,
   * no declara `workers` en ningún sitio y la mitad de 4 es justo 2. Lo que
   * añade es que una tirada local reproduzca esa misma condición en vez de
   * depender de cuántos núcleos tenga el portátil de quien la lanza.
   */
  workers: 2,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-visual' }]],

  // Sin sufijo de plataforma: hay UNA base, la de Linux, y se genera en el
  // contenedor. Si el nombre llevara `-win32`, cada quien crearía la suya y el
  // CI compararía contra una que nadie mira.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',

  expect: {
    toHaveScreenshot: {
      /* ── El umbral de color: 0,01, no el 0,2 que Playwright pone solo ─────
       *
       * `threshold` NO es un porcentaje de la imagen: es la tolerancia de color
       * de UN píxel. Playwright se la pasa tal cual a pixelmatch, que la
       * convierte en `maxDelta = 35215 * threshold²` y da por IGUAL todo píxel
       * cuya distancia YIQ no supere ese máximo. Con el 0,2 por defecto,
       * `maxDelta` vale 1.408,6: es tanto como dejar pasar un cambio de HASTA
       * 52 niveles de gris EN CADA PÍXEL sin contarlo. Un recoloreo de
       * superficie entera daba CERO píxeles distintos, y `maxDiffPixelRatio` ni
       * siquiera llegaba a ejecutarse porque no le llegaba un píxel que contar.
       *
       * No es teoría: es el agujero medido de los issues admin#84 / public#147.
       * A11Y-02 bajó `--warm-500` de `oklch(58% …)` a `oklch(55% …)`, o sea
       * rgb(128,121,115) → rgb(119,112,107). Su distancia YIQ es 39,9, TREINTA Y
       * CINCO VECES menor que el umbral: la suite dio 8 de 8 en verde sobre un
       * cambio de color real.
       *
       * 0,01 deja `maxDelta` en 3,52 (~2,6 niveles de gris) y coge ese 39,9 con
       * 11,3× de margen. El valor está acotado por los dos lados con números de
       * este proyecto, no copiados de ningún sitio:
       *
       *   TECHO — el cambio más fino que alguien teclea a mano sobre un token es
       *   un retoque de 1 % de luminosidad OKLCH: delta 4,6, que exige ≤ 0,0114.
       *   Para referencia, los saltos reales de la rampa de `tokens.css` son muy
       *   superiores: warm-50→warm-100 (superficie) 22,1; warm-150→warm-200
       *   (borde de campo) 48,9; warm-500→warm-600 (texto tenue) 188,3.
       *
       *   SUELO — el ruido de rasterizado. ±1 nivel sRGB es un delta de 0,51 y
       *   ±2 niveles son 2,02, así que 3,52 los absorbe. Y el suelo real medido
       *   es aún más bajo: en la prueba de admin#84, 6 de los 8 bloques dieron
       *   EXACTAMENTE 0 píxeles distintos, es decir capturas idénticas byte a
       *   byte dentro del contenedor. El ruido entre pasadas de esta suite es
       *   cero, no «pequeño».
       *
       * La ventana defendible es [0,008 – 0,011] y 0,01 es el único valor
       * redondo que cae dentro. Lo que NO detecta es un retoque de 0,5 % de L
       * (delta 1,58, ~1 nivel), y es deliberado: a esa escala el cambio no se
       * distingue del ruido y perseguirlo volvería la suite intermitente.
       */
      threshold: 0.01,

      /* ── El presupuesto de píxeles, ahora que el contador está vivo ───────
       *
       * Los dos parámetros se combinan y no son intercambiables. `threshold`
       * frena el cambio GLOBAL y tenue —recoloreo de tokens, cambio de
       * tipografía—, donde cada píxel se mueve poco pero se mueven todos.
       * `maxDiffPixelRatio` frena el cambio LOCAL y brusco —un anillo de foco,
       * un borde, un icono—, donde el delta por píxel es enorme y lo único que
       * decide es cuántos son. Ajustar uno sin mirar el otro deja el gate igual
       * de ciego por el lado que no miraste.
       *
       * El 0,002 anterior se fijó cuando el contador estaba muerto, así que
       * nunca se calibró contra nada — y admin#84 demostró que era la SEGUNDA
       * capa de ceguera, no la red de seguridad. Con `threshold` a 0,02, aquel
       * mismo cambio de `--warm-500` movió 75 píxeles en `tipografia` y 595 en
       * `vacios`; los presupuestos de 0,002 sobre la geometría que aquellos dos
       * bloques tenían entonces eran 709,6 y 694,8, así que los dos seguían
       * pasando (`vacios` al 86 % del presupuesto, a un elemento de texto de
       * cruzarlo).
       *
       * Esas dos cifras medidas son las que fijan el tope: para no volver a
       * perder el caso más fino, el presupuesto tiene que quedar por DEBAJO de
       * 75. Con 60, `tipografia` falla (1,3×) y `vacios` falla (9,9×); con 75 o
       * más, `tipografia` vuelve a ser invisible. Por abajo no aprieta nada,
       * porque el ruido medido es 0 píxeles.
       *
       * Se dejan los DOS a propósito: Playwright toma el MÍNIMO de ambos, así
       * que la ratio sigue mandando en los recortes pequeños —`icon-btn`, de
       * 65.296 px, se queda en 32 píxeles en vez de heredar los 60— y el tope
       * absoluto manda en los grandes, que es justo donde la ratio se volvía
       * permisiva (en `banners`, de 2.411.024 px, 0,002 eran 4.822 píxeles de
       * barra libre: el borde de 1 px de un botón de icono de 24×24 son ~92
       * píxeles y cabía cincuenta veces dentro del presupuesto).
       *
       * Las dos áreas se leen de las líneas base de `visual/__screenshots__`,
       * que es lo que la suite compara: no son estimaciones.
       */
      maxDiffPixels: 60,
      maxDiffPixelRatio: 0.0005,

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
