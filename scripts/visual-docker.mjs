/**
 * Corre la regresión visual dentro del contenedor oficial de Playwright.
 *
 * ── Por qué no basta con `npm run visual` ─────────────────────────────────
 * Una captura hecha en Windows o en macOS NO coincide con la del runner de CI:
 * cambian el antialiasing y las métricas de fuente, y la diferencia supera
 * cualquier tolerancia razonable. Si cada quien generase su base en su máquina,
 * el CI compararía contra una que no puede reproducir y la suite estaría roja
 * de forma permanente — que es la manera habitual de que estas pruebas acaben
 * desactivadas.
 *
 * Aquí hay UNA base, la de Linux, y se genera con la MISMA imagen que usa el
 * CI. Por eso el fichero de configuración guarda las capturas sin sufijo de
 * plataforma: no hay una por sistema, hay una sola y es esta.
 *
 * Uso:
 *   npm run visual:docker            comparar contra la base
 *   npm run visual:docker:update     regenerar la base tras un cambio querido
 */
import { execFileSync } from 'node:child_process'
import { existsSync, copyFileSync } from 'node:fs'

// Debe ir al mismo paso que `@playwright/test` en package.json: la imagen trae
// los navegadores de esa versión exacta y una desalineación cambia el render.
const IMAGE = 'mcr.microsoft.com/playwright:v1.61.1-noble'

// `npm run dev` es `vite --mode localdev`, y `vite.config.ts` aborta si ningún
// fichero de entorno declara ese perfil. En local suele existir porque no está
// versionado; si no, se copia el ejemplo igual que hace el CI.
if (!existsSync('.env.local')) {
  copyFileSync('.env.local.example', '.env.local')
  console.log('· .env.local no existía: copiado desde .env.local.example')
}

const extra = process.argv.slice(2)

// El repositorio se monta, pero `node_modules` NO: los binarios instalados en
// Windows o macOS no se ejecutan en Linux. El volumen anónimo le da al
// contenedor su propio directorio y deja intacto el del host, que si se
// sobrescribiera dejaría de funcionar al salir.
const args = [
  'run',
  '--rm',
  '--init',
  '-v',
  `${process.cwd()}:/w`,
  '-v',
  '/w/node_modules',
  '-w',
  '/w',
  IMAGE,
  'bash',
  '-lc',
  `npm ci --ignore-scripts && npx playwright test --config=playwright.visual.config.ts ${extra.join(' ')}`,
]

console.log(`· imagen ${IMAGE}`)
try {
  execFileSync('docker', args, { stdio: 'inherit' })
} catch {
  // El error ya se imprimió; no se añade ruido encima.
  process.exit(1)
}
