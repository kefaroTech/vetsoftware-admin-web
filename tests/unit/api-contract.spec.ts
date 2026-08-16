import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * TR-01. `src/types/api.contract.ts` ata los tipos de este repositorio al contrato del backend,
 * pero solo los que alguien haya escrito allí. Una lista mantenida a mano envejece: se añade un
 * tipo nuevo, nadie lo ata, y el contrato deja de cubrirlo sin que nada falle.
 *
 * <p>Esta prueba lo impide. Comprueba la cobertura, no la forma — de la forma se encarga el
 * compilador con las aserciones del propio `api.contract.ts`.
 *
 * <p>Este repositorio nombra sus tipos con el dominio (`SpecieResponse`) o con `Command`, mientras que el
 * backend usa `Response` y `Request`. `CANDIDATOS` es esa traducción, y es la razón de que aquí
 * haya reglas donde el front operativo no las necesita.
 */
const root = resolve(__dirname, '..', '..')

/** Nombres de esquema que podrían corresponder a un tipo de este repositorio. */
const candidatos = (nombre: string): string[] => [
  nombre,
  `${nombre}Response`,
  nombre.replace(/Command$/, 'Request'),
  nombre.replace(/^App/, '') + 'Response',
  nombre.replace(/SubModuleResponse/, 'SubModule') + 'Response',
  nombre.replace(/SubModuleResponse/, 'SubModule').replace(/Command$/, 'Request'),
  nombre.replace(/Result$/, 'Response'),
]

/**
 * Coincidencias de nombre que NO son el mismo concepto. `Permission` aquí es la unión de códigos
 * de permiso del front (`'company.create' | …`), no el DTO `PermissionResponse` del backend.
 */
const HOMONIMOS_FALSOS = new Set(['Permission'])

function tiposDeclarados(): string[] {
  const nombres: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name)
      if (entrada.isDirectory()) recorrer(ruta)
      else if (ruta.endsWith('.ts') && !ruta.endsWith('.d.ts')) {
        const fuente = readFileSync(ruta, 'utf8')
        for (const m of fuente.matchAll(/^export (?:interface|type) (\w+)/gm)) nombres.push(m[1]!)
      }
    }
  }
  recorrer(join(root, 'src'))
  return nombres
}

function esquemas(): Set<string> {
  const spec = JSON.parse(readFileSync(join(root, 'api', 'openapi.json'), 'utf8')) as {
    components: { schemas: Record<string, unknown> }
  }
  return new Set(Object.keys(spec.components.schemas))
}

function contrato(): string {
  return readFileSync(join(root, 'src', 'types', 'api.contract.ts'), 'utf8')
}

describe('la atadura al contrato de la API cubre todo lo que puede cubrir', () => {
  it('cada tipo que espeja un DTO del backend está atado', () => {
    const schemas = esquemas()
    const atados = new Set(
      [...contrato().matchAll(/MatchesContract<\s*(\w+)\s*,/g)].map((m) => m[1]!),
    )

    const faltan = [...new Set(tiposDeclarados())]
      .filter((n) => !HOMONIMOS_FALSOS.has(n) && candidatos(n).some((c) => schemas.has(c)))
      .filter((n) => !atados.has(n))
      .sort()

    expect(
      faltan,
      `Estos tipos espejan un DTO del backend y nadie los ató al contrato.\n` +
        `Añade una línea por cada uno en src/types/api.contract.ts:\n` +
        faltan
          .map((n) => {
            const esquema = candidatos(n).find((c) => schemas.has(c))
            return `  Expect<MatchesContract<${n}, '${esquema}'>>,`
          })
          .join('\n'),
    ).toEqual([])
  })

  it('no quedan ataduras a esquemas que ya no existen en el contrato', () => {
    const schemas = esquemas()
    const usados = [...contrato().matchAll(/MatchesContract<\s*\w+\s*,\s*'([^']+)'/g)].map(
      (m) => m[1]!,
    )

    expect(usados.filter((n) => !schemas.has(n)).sort()).toEqual([])
  })
})
