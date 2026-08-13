#!/usr/bin/env node
/**
 * Genera los tipos de la API desde el contrato del backend (TR-01).
 *
 * El backend versiona `api/openapi.json` y lo mantiene al día con un test que rompe el build
 * si cambia sin regenerarse (`OpenApiContractIT`). Este script trae esa copia al front y produce
 * `src/types/api.generated.d.ts`, que es lo único de este repositorio que puede decir cómo es un
 * DTO del servidor. Todo lo demás lo *afirma* contra él (ver `src/types/api.contract.ts`).
 *
 *   node scripts/api-types.mjs            regenera los tipos desde la copia local del contrato
 *   node scripts/api-types.mjs --sync     además trae el contrato del backend antes de generar
 *   node scripts/api-types.mjs --check    falla si lo generado no coincide con lo commiteado
 *
 * `--sync` busca el backend en `VETSOFTWARE_BACKEND` o, por defecto, en el repositorio hermano
 * `../VetSoftware`. Es un paso manual y deliberado: traer un contrato nuevo cambia el contrato
 * del front, y eso se revisa en un diff, no se hace solo al arrancar `npm install`.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SPEC = join(root, 'api', 'openapi.json')
const OUT = join(root, 'src', 'types', 'api.generated.d.ts')

const args = new Set(process.argv.slice(2))

function fail(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

if (args.has('--sync')) {
  const backend = process.env.VETSOFTWARE_BACKEND ?? resolve(root, '..', 'VetSoftware')
  const source = join(backend, 'api', 'openapi.json')
  if (!existsSync(source)) {
    fail(
      `No encuentro el contrato del backend en ${source}.\n` +
        `  Clona el backend junto a este repositorio o exporta VETSOFTWARE_BACKEND=<ruta>.\n` +
        `  Si el fichero no existe allí, generalo con:\n` +
        `    ./mvnw verify -Dit.test=OpenApiContractIT -Dopenapi.write=true`,
    )
  }
  copyFileSync(source, SPEC)
  console.log(`Contrato actualizado desde ${source}`)
}

if (!existsSync(SPEC)) {
  fail(`Falta ${SPEC}. Ejecuta 'npm run api:sync'.`)
}

const previous = args.has('--check') && existsSync(OUT) ? readFileSync(OUT, 'utf8') : null

execFileSync(
  process.execPath,
  [join(root, 'node_modules', 'openapi-typescript', 'bin', 'cli.js'), SPEC, '-o', OUT],
  { stdio: 'inherit', cwd: root },
)

if (args.has('--check')) {
  const current = readFileSync(OUT, 'utf8')
  if (previous !== current) {
    fail(
      `Los tipos generados no coinciden con los commiteados.\n` +
        `  Ejecuta 'npm run api:types' y commitea el resultado.`,
    )
  }
  console.log('Los tipos de la API coinciden con el contrato.')
}
