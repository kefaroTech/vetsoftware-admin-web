// Los ficheros generados desde el contrato del backend (`api.generated.d.ts`, `openapi.json`) no
// se editan a mano y están excluidos de eslint y de prettier. Pasarlos igualmente por el gancho
// haría que eslint avisara de «fichero ignorado» y, con `--max-warnings=0`, que el commit fallara.
const GENERADOS = /src[\\/]types[\\/]api\.generated\.d\.ts$|api[\\/]openapi\.json$/
const sinGenerados = (ficheros) => ficheros.filter((f) => !GENERADOS.test(f))

const eslint = (ficheros) =>
  sinGenerados(ficheros).length === 0
    ? []
    : [
        `eslint --cache --cache-strategy content --cache-location node_modules/.cache/eslint/ --max-warnings=0 ${sinGenerados(
          ficheros,
        )
          .map((f) => `"${f}"`)
          .join(' ')}`,
      ]

const prettier = (ficheros) =>
  sinGenerados(ficheros).length === 0
    ? []
    : [
        `prettier --check ${sinGenerados(ficheros)
          .map((f) => `"${f}"`)
          .join(' ')}`,
      ]

export default {
  'src/**/*.{js,jsx,ts,tsx,vue}': eslint,
  'src/**/*.{css,scss,sass,vue}': [
    'stylelint --cache --cache-strategy content --cache-location node_modules/.cache/stylelint/ --max-warnings=0',
  ],
  // Deliberadamente `**/*` y no una lista de directorios: `format:check` (el gate de CI) corre
  // `prettier --check .` sobre todo el árbol versionado, y enumerar carpetas aquí obliga a
  // acordarse de ampliar la lista cada vez que aparece una nueva — ya falló una vez con
  // `.claude/`, que no estaba en la enumeración y hacía que el gancho local diera verde sobre
  // ficheros que CI rechazaba (issue #51). `.prettierignore` (compartido con CI) sigue aplicando,
  // así que lo generado queda fuera igual.
  '**/*.{js,mjs,cjs,ts,tsx,vue,json,md,yml,yaml,html,css,scss,sass}': prettier,
}
