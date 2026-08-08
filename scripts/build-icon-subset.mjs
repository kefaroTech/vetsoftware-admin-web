// Genera un subconjunto de la colección Tabler con SOLO los iconos que el código
// usa de verdad, y lo deja en src/generated/tabler-icons.json.
//
// El motivo: `@iconify-json/tabler/icons.json` pesa 2.087.955 bytes y trae 6.140
// iconos más 184 alias. Importarlo entero para registrarlo con `addCollection`
// mete ese peso en el chunk de entrada —lo importa `plugins/vuetify.ts`, que a
// su vez importa `main.ts`—, así que todo usuario del panel se descarga la
// colección completa antes del primer píxel para usar unas decenas de iconos.
//
// El archivo generado se versiona en git a propósito: `vue-tsc -b` corre ANTES
// de `vite build`, así que el import tiene que resolverse sin depender del orden
// de ejecución. Los scripts de dev y build lo regeneran igualmente, y el
// contenido solo se reescribe si cambió, para no ensuciar el árbol de trabajo.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDirectory = join(projectRoot, 'src')
const collectionPath = join(projectRoot, 'node_modules', '@iconify-json', 'tabler', 'icons.json')
const outputPath = join(sourceDirectory, 'generated', 'tabler-icons.json')

const SCANNED_EXTENSIONS = ['.ts', '.vue']
const ICON_REFERENCE = /tabler:([a-z0-9-]+)/g

/** Todos los archivos de src cuyo contenido puede nombrar un icono. */
function collectSourceFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'generated') continue
      files.push(...collectSourceFiles(entryPath))
    } else if (SCANNED_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      files.push(entryPath)
    }
  }
  return files
}

/**
 * Nombres `tabler:*` referenciados en el código. Se escanea todo `src` y no solo
 * `constants/icons.ts` porque algunos componentes nombran el icono en línea
 * (AppCheckbox y AppSelect lo hacen), y un subset que se los deje fuera los
 * rompería en silencio: Iconify no falla, simplemente no pinta nada.
 */
function findUsedIconNames(files) {
  const names = new Set()
  for (const file of files) {
    const contents = readFileSync(file, 'utf8')
    for (const match of contents.matchAll(ICON_REFERENCE)) {
      names.add(match[1])
    }
  }
  return [...names].sort()
}

function buildSubset(collection, usedNames) {
  const icons = {}
  const aliases = {}
  const missing = []

  for (const name of usedNames) {
    if (collection.icons[name]) {
      icons[name] = collection.icons[name]
      continue
    }
    // Un alias apunta a otro icono, posiblemente con transformaciones. Hay que
    // arrastrar la cadena entera hasta el icono real o el subset queda colgando.
    let alias = collection.aliases?.[name]
    if (!alias) {
      missing.push(name)
      continue
    }
    aliases[name] = alias
    let parent = alias.parent
    const visited = new Set([name])
    while (parent && !collection.icons[parent]) {
      if (visited.has(parent)) break
      visited.add(parent)
      const parentAlias = collection.aliases?.[parent]
      if (!parentAlias) break
      aliases[parent] = parentAlias
      parent = parentAlias.parent
    }
    if (parent && collection.icons[parent]) {
      icons[parent] = collection.icons[parent]
    } else {
      missing.push(name)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Estos iconos no existen en la colección Tabler: ${missing.join(', ')}.\n` +
        'Revisa el nombre: sin esta comprobación el icono no falla, simplemente no se dibuja.',
    )
  }

  return {
    prefix: collection.prefix,
    lastModified: collection.lastModified,
    width: collection.width,
    height: collection.height,
    icons,
    aliases,
  }
}

if (!existsSync(collectionPath)) {
  console.error(`No se encontró ${collectionPath}. ¿Falta un npm install?`)
  process.exit(1)
}

const collection = JSON.parse(readFileSync(collectionPath, 'utf8'))
const usedNames = findUsedIconNames(collectSourceFiles(sourceDirectory))

if (usedNames.length === 0) {
  console.error('No se encontró ninguna referencia "tabler:*" en src. Abortando por seguridad.')
  process.exit(1)
}

const subset = buildSubset(collection, usedNames)
const serialized = `${JSON.stringify(subset, null, 2)}\n`

mkdirSync(dirname(outputPath), { recursive: true })
const unchanged = existsSync(outputPath) && readFileSync(outputPath, 'utf8') === serialized
if (!unchanged) {
  writeFileSync(outputPath, serialized)
}

const originalBytes = readFileSync(collectionPath).byteLength
const subsetBytes = Buffer.byteLength(serialized)
const saved = (((originalBytes - subsetBytes) / originalBytes) * 100).toFixed(1)
console.log(
  `Iconos Tabler: ${usedNames.length} de ${Object.keys(collection.icons).length} · ` +
    `${subsetBytes.toLocaleString('es-CO')} B frente a ${originalBytes.toLocaleString('es-CO')} B ` +
    `(−${saved} %)${unchanged ? ' · sin cambios' : ''}`,
)
