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

/**
 * Esquema que corresponde a la INSTANCIACIÓN de un genérico.
 *
 * springdoc nombra la instanciación concatenando la envoltura y el contenido: `PageResponse<T>`
 * viaja al contrato como `PageResponseCompanyResponse`, `PageResponseSpecieResponse`… y ninguno
 * de los 37 esquemas de página se llama `PageResponse` a secas. Sin esta regla `candidatos()`
 * solo proponía `PageResponse` y `PageResponseResponse` —que no existen—, así que la única
 * envoltura del repositorio quedaba fuera de la comprobación y este test pasaba en verde
 * justamente sobre el tipo que no cubría.
 *
 * Se aplica SOLO a los tipos declarados con parámetros, y eso es lo que la hace exacta: sobre los
 * 100 tipos exportados de `src/` marca `PageResponse` y ningún otro. Se exige además que lo que
 * le sobra al nombre sea a su vez un esquema, para no casar por prefijo con un homónimo largo.
 */
const instanciacionEnContrato = (nombre: string, schemas: Set<string>): string | undefined =>
  [...schemas]
    .sort()
    .find((s) => s !== nombre && s.startsWith(nombre) && schemas.has(s.slice(nombre.length)))

/** Tipos exportados por `src/`, y si se declararon con parámetros de tipo. */
function tiposDeclarados(): Map<string, boolean> {
  const nombres = new Map<string, boolean>()
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name)
      if (entrada.isDirectory()) recorrer(ruta)
      else if (ruta.endsWith('.ts') && !ruta.endsWith('.d.ts')) {
        const fuente = readFileSync(ruta, 'utf8')
        for (const m of fuente.matchAll(/^export (?:interface|type) (\w+)(<[^>]*>)?/gm)) {
          nombres.set(m[1]!, (nombres.get(m[1]!) ?? false) || m[2] !== undefined)
        }
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
    // El `(?:<[^>]*>)?` es lo que hace que una atadura escrita sobre una instanciación
    // —`MatchesContract<PageResponse<CompanyResponse>, …>`— cuente como atadura de `PageResponse`.
    // Sin él, el genérico se declararía sin atar aunque su centinela esté puesto.
    const atados = new Set(
      [...contrato().matchAll(/MatchesContract<\s*(\w+)(?:<[^>]*>)?\s*,/g)].map((m) => m[1]!),
    )

    const declarados = tiposDeclarados()
    /** Esquema del contrato que corresponde al tipo, o `undefined` si el contrato no lo trae. */
    const esquemaDe = (n: string): string | undefined =>
      candidatos(n).find((c) => schemas.has(c)) ??
      (declarados.get(n) === true ? instanciacionEnContrato(n, schemas) : undefined)

    const faltan = [...declarados.keys()]
      .filter((n) => !HOMONIMOS_FALSOS.has(n) && esquemaDe(n) !== undefined)
      .filter((n) => !atados.has(n))
      .sort()

    expect(
      faltan,
      `Estos tipos espejan un DTO del backend y nadie los ató al contrato.\n` +
        `Añade una línea por cada uno en src/types/api.contract.ts:\n` +
        faltan
          .map((n) => {
            const directo = candidatos(n).find((c) => schemas.has(c))
            const esquema = directo ?? instanciacionEnContrato(n, schemas) ?? n
            // Un genérico se ata por una instanciación: el contenido es lo que le sobra al nombre.
            const local = directo ? n : `${n}<${esquema.slice(n.length)}>`
            return `  Expect<MatchesContract<${local}, '${esquema}'>>,`
          })
          .join('\n'),
    ).toEqual([])
  })

  it('no quedan ataduras a esquemas que ya no existen en el contrato', () => {
    const schemas = esquemas()
    // Mismo `(?:<[^>]*>)?` que arriba: sin él, la atadura de un genérico no se leía aquí y un
    // `PageResponseXxxResponse` que el backend dejara de emitir se quedaba sin detectar.
    const usados = [
      ...contrato().matchAll(/MatchesContract<\s*\w+(?:<[^>]*>)?\s*,\s*'([^']+)'/g),
    ].map((m) => m[1]!)

    expect(usados.filter((n) => !schemas.has(n)).sort()).toEqual([])
  })
})
