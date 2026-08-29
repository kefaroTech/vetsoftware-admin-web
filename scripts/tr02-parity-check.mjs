/**
 * Gate de paridad TR-02.
 *
 * `http.client.ts` estuvo semanas con `withBranchBody` corregido en la
 * consola (marca por SÍMBOLO) y roto en el tenant (marca por identidad en un
 * `WeakSet`, inerte porque axios clona el cuerpo antes de que corra el
 * interceptor): un usuario con más de una sede podía recibir un 400 en
 * arranque en frío. Nadie lo vio porque nada comparaba los dos árboles; se
 * encontró por accidente, revisando un `diff` que perseguía otra cosa. Un
 * accidente no es un control. Este script sí lo es.
 *
 * Compara, byte a byte, cada archivo listado en `tr02-parity.config.json`
 * entre este repo y su gemelo. Falla si:
 *
 *   1. el contenido difiere y el archivo NO está en el `allowlist` del JSON
 *      (con su motivo escrito) — deriva, no diseño;
 *   2. el archivo falta en uno de los dos repos — un gemelo borrado en un
 *      lado no es "sin divergencia", es la divergencia más grande posible.
 *
 * Deliberadamente NO analiza contenido: sin parsear, sin AST, sin red. Es
 * una comparación de archivos y nada más, porque corre en cada
 * `npm run quality` y tiene que seguir siendo barato.
 *
 * Solo puede comparar si el árbol del otro repo está presente junto a este
 * (`../VetSoftwareFront` o `../VetSoftwarePublicFront`, el checkout local
 * habitual). En CI cada repo se clona solo, así que aquí el gate se limita a
 * avisar y salir en verde — no hay forma de comparar sin el segundo árbol, y
 * fallar por su ausencia bloquearía todo PR para siempre. La paridad real se
 * exige en local, donde front-parity trabaja con los dos repos a la vez.
 *
 * Uso:  npm run tr02:parity        (forma parte de `npm run quality`)
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[/\\]+$/, '')
const REPO_NAME = basename(ROOT)

/** Cada repo solo conoce el nombre de su gemelo, no una lista de N repos: es 1:1 por diseño. */
const SIBLING_OF = {
  VetSoftwareFront: 'VetSoftwarePublicFront',
  VetSoftwarePublicFront: 'VetSoftwareFront',
}

const { files: FILES, allowlist: ALLOWLIST } = JSON.parse(
  readFileSync(fileURLToPath(new URL('tr02-parity.config.json', import.meta.url)), 'utf8'),
)
const allowedReason = new Map(ALLOWLIST.map((entry) => [entry.file, entry.reason]))

const siblingName = SIBLING_OF[REPO_NAME]
if (!siblingName) {
  console.error(
    `tr02:parity · el directorio del repo se llama "${REPO_NAME}", que no está en SIBLING_OF. ` +
      `Actualiza scripts/tr02-parity-check.mjs en los dos repos si el nombre del directorio cambió.`,
  )
  process.exit(1)
}

const siblingRoot = join(dirname(ROOT), siblingName)

if (!existsSync(siblingRoot)) {
  console.log(
    `tr02:parity · SIN COMPROBAR — no encuentro "${siblingName}" junto a este repo ` +
      `(¿checkout de un solo repo, como en CI?). La paridad TR-02 solo se puede verificar con ` +
      `los dos árboles presentes; ver AGENTS.md.`,
  )
  process.exit(0)
}

const failures = []
let compared = 0
let allowed = 0

for (const rel of FILES) {
  const ownPath = join(ROOT, rel)
  const otherPath = join(siblingRoot, rel)
  const ownExists = existsSync(ownPath)
  const otherExists = existsSync(otherPath)

  if (!ownExists && !otherExists) {
    failures.push(
      `${rel}: no existe en NINGUNO de los dos repos. Sácalo de tr02-parity.config.json (en ` +
        `los dos repos) o repón el archivo.`,
    )
    continue
  }
  if (!ownExists || !otherExists) {
    const faltaEn = ownExists ? siblingName : REPO_NAME
    failures.push(
      `${rel}: falta en ${faltaEn} (sí existe en ${ownExists ? REPO_NAME : siblingName}). ` +
        `Un gemelo borrado en un lado no es "sin divergencia".`,
    )
    continue
  }

  compared++
  const iguales = readFileSync(ownPath).equals(readFileSync(otherPath))
  if (iguales) continue

  const reason = allowedReason.get(rel)
  if (reason) {
    allowed++
    continue
  }
  failures.push(
    `${rel}: difiere byte a byte y no está en el allowlist de tr02-parity.config.json. ` +
      `Es deriva, no diseño — iguala el que quedó atrás, o si es intencional añade la entrada ` +
      `con su motivo (en los dos repos).`,
  )
}

console.log(
  `tr02:parity · ${compared}/${FILES.length} archivos comparados contra ${siblingName} ` +
    `(${allowed} con divergencia permitida)`,
)

if (failures.length > 0) {
  console.error(`\ntr02:parity · paridad TR-02 rota (${failures.length}):\n`)
  for (const f of failures) console.error(`  · ${f}`)
  process.exit(1)
}

console.log('tr02:parity · paridad TR-02 respetada')
