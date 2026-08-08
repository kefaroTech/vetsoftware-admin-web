import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * El generador del subconjunto de iconos corre delante de CADA `dev` y de cada
 * `build`. Dos propiedades suyas no son cosméticas:
 *
 *  1. Es idempotente: si el resultado no cambia, no reescribe el archivo. Si
 *     lo reescribiera siempre, cambiaría su mtime en cada arranque, Vite
 *     invalidaría el módulo y el hash del chunk de iconos —182 kB, el más
 *     pesado— cambiaría en cada despliegue sin que nada haya cambiado. Eso
 *     tiraría por tierra la caché que el presupuesto de FE-06 mide.
 *
 *  2. Falla ante un nombre de icono inexistente. Iconify no lanza ante un
 *     nombre desconocido: simplemente no dibuja nada. Sin esta comprobación, un
 *     icono mal escrito llega a producción como un hueco en blanco — que es
 *     exactamente cómo se descubrió que `tabler:scalpel` no existía.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')
const SCRIPT = path.join(ROOT, 'scripts/build-icon-subset.mjs')
const SALIDA = path.join(ROOT, 'src/generated/tabler-icons.json')

function generar() {
  return execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8' })
}

describe('generador del subconjunto de iconos', () => {
  it('produce una colección Iconify válida', () => {
    generar()
    const subset = JSON.parse(readFileSync(SALIDA, 'utf8'))

    expect(subset.prefix).toBe('tabler')
    expect(Object.keys(subset.icons).length).toBeGreaterThan(0)
  })

  it('incluye los iconos que el código nombra en línea, no solo los del catálogo', () => {
    // `constants/icons.ts` no es la fuente de verdad: hay componentes que
    // nombran su icono directamente en la plantilla. Un subconjunto que solo
    // leyera el catálogo los dejaría fuera, en silencio.
    generar()
    const subset = JSON.parse(readFileSync(SALIDA, 'utf8'))
    const declarados = new Set(Object.keys(subset.icons))
    const enCodigo = new Set(
      Array.from(
        readFileSync(path.join(ROOT, 'src/constants/icons.ts'), 'utf8').matchAll(
          /tabler:([a-z0-9-]+)/g,
        ),
        (m) => m[1],
      ),
    )

    for (const nombre of enCodigo) {
      expect(declarados.has(nombre), `falta ${nombre} en el subconjunto`).toBe(true)
    }
  })

  it('incluye los iconos internos de Vuetify', () => {
    // Los 63 alias de Vuetify —flechas de VSelect, check de VCheckbox,
    // paginación— no aparecen en ningún archivo del proyecto porque los pide el
    // framework. Si faltan, Iconify los descarga de su CDN pública en tiempo de
    // ejecución, que es el problema que cerró FE-02.
    generar()
    const subset = JSON.parse(readFileSync(SALIDA, 'utf8'))
    const alias = readFileSync(path.join(ROOT, 'src/plugins/vuetify-icon-aliases.ts'), 'utf8')
    const usados = new Set(Array.from(alias.matchAll(/tabler:([a-z0-9-]+)/g), (m) => m[1]))

    expect(usados.size).toBeGreaterThan(0)
    for (const nombre of usados) {
      expect(Object.keys(subset.icons)).toContain(nombre)
    }
  })

  it('es idempotente: la segunda pasada no reescribe el archivo', () => {
    // Reescribir sin cambios cambiaría el hash del chunk de iconos en cada
    // build, invalidando 182 kB de caché a todos los usuarios por nada.
    generar()
    const antes = statSync(SALIDA).mtimeMs
    const contenidoAntes = readFileSync(SALIDA, 'utf8')

    generar()

    expect(statSync(SALIDA).mtimeMs).toBe(antes)
    expect(readFileSync(SALIDA, 'utf8')).toBe(contenidoAntes)
  })

  it('el resultado es estable: dos generaciones dan exactamente lo mismo', () => {
    // Un orden de claves no determinista produciría el mismo problema que
    // reescribir: contenido distinto byte a byte sin cambio real.
    generar()
    const primera = readFileSync(SALIDA, 'utf8')
    generar()

    expect(readFileSync(SALIDA, 'utf8')).toBe(primera)
  })

  it('no deja ningún icono sin resolver', () => {
    // Un alias de Tabler que apunte a otro nombre debe quedar resuelto en el
    // subconjunto; si quedara la referencia sin resolver, el icono no dibuja.
    generar()
    const subset = JSON.parse(readFileSync(SALIDA, 'utf8'))

    for (const [nombre, icono] of Object.entries<{ body?: string }>(subset.icons)) {
      expect(icono.body, `${nombre} quedó sin cuerpo SVG`).toBeTruthy()
    }
  })
})
