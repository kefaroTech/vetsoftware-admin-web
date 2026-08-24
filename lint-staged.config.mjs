// Los ficheros generados desde el contrato del backend (`api.generated.d.ts`, `openapi.json`) no
// se editan a mano y están excluidos de eslint y de prettier. Pasarlos igualmente por el gancho
// haría que eslint avisara de «fichero ignorado» y, con `--max-warnings=0`, que el commit fallara.
const GENERADOS = /src[\\/]types[\\/]api\.generated\.d\.ts$|api[\\/]openapi\.json$/
const sinGenerados = (ficheros) => ficheros.filter((f) => !GENERADOS.test(f))

// En Windows, `eslint`/`prettier`/`stylelint` resuelven a los shims `.cmd` de
// `node_modules/.bin`. `lint-staged` lanza cada tarea con `tinyexec`, que detecta que no es un
// `.exe`/`.com` nativo y envuelve la orden ENTERA en `cmd.exe /d /s /c "<orden>"`
// (`node_modules/tinyexec/dist/main.mjs`, `normalizeSpawnCommand`) — así que el límite que manda
// no es el de 32.767 caracteres de `CreateProcess`, sino el de `cmd.exe`: 8.191
// (https://support.microsoft.com/help/830473).
//
// `lint-staged` 17.3 ya trae un troceador interno (`chunkFilesForCommand`, con
// `getMaxArgLength() === 8191` en win32) que parte la lista de ficheros a la mitad hasta que la
// orden resuelta «cabe». Para tareas-función como estas, ese troceador mide la longitud CRUDA de
// la cadena que devuelve la función — no la que `cmd.exe` recibe de verdad: el escapado de
// metacaracteres de `tinyexec` antepone `^` a cada comilla y cada espacio embebidos en cada ruta,
// y la raíz absoluta de este repo ya trae uno (`Orlando Velasquez`). Reproducido con los 244
// ficheros estacionados del commit que destapó esto: el troceador interno partió la orden de
// eslint hasta lotes de 53 ficheros — 7.514 caracteres en crudo, por debajo del 8.191 nominal — y
// aun así `cmd.exe` la mató con «La línea de comandos es demasiado larga». El número que asume
// `lint-staged` no es de fiar aquí, así que troceamos nosotros, con margen real.
//
// El tope se fija por LONGITUD acumulada, no por número de ficheros: cuántos caracteres mide una
// ruta absoluta depende de dónde clona cada máquina el repo (aquí la sola raíz ya son 79
// caracteres, por el espacio del usuario), así que un recuento fijo de ficheros no es portable de
// una máquina a otra. 4.000 caracteres por orden — aprox. la mitad del límite documentado de
// 8.191 — deja margen de sobra para el escapado de metacaracteres (~2 % de inflación en la
// reproducción de arriba) y para el envoltorio `cmd.exe /d /s /c "…"` que añade `tinyexec`.
const MAX_CMD_LENGTH = 4000

const enLotes = (ficheros) => {
  const lotes = []
  let loteActual = []
  let longitudActual = 0
  for (const f of ficheros) {
    const longitudArg = f.length + 3 // comillas + espacio separador
    if (loteActual.length > 0 && longitudActual + longitudArg > MAX_CMD_LENGTH) {
      lotes.push(loteActual)
      loteActual = []
      longitudActual = 0
    }
    loteActual.push(f)
    longitudActual += longitudArg
  }
  // Lista vacía ⇒ ningún lote ⇒ ninguna orden: así eslint nunca corre sobre una lista vacía y
  // avisa de «fichero ignorado», que con `--max-warnings=0` haría fallar el commit.
  if (loteActual.length > 0) lotes.push(loteActual)
  return lotes
}

const eslint = (ficheros) =>
  enLotes(sinGenerados(ficheros)).map(
    (lote) =>
      `eslint --cache --cache-strategy content --cache-location node_modules/.cache/eslint/ --max-warnings=0 ${lote
        .map((f) => `"${f}"`)
        .join(' ')}`,
  )

const prettier = (ficheros) =>
  enLotes(sinGenerados(ficheros)).map(
    (lote) => `prettier --check ${lote.map((f) => `"${f}"`).join(' ')}`,
  )

// Antes era una cadena literal: `lint-staged` le añadía las rutas él mismo (por el mismo camino
// de `chunkFilesForCommand` descrito arriba) y sufría el mismo troceado poco fiable. Convertida a
// función para trocear con el mismo `enLotes`, conserva `--cache` y `--max-warnings=0`.
const stylelint = (ficheros) =>
  enLotes(ficheros).map(
    (lote) =>
      `stylelint --cache --cache-strategy content --cache-location node_modules/.cache/stylelint/ --max-warnings=0 ${lote
        .map((f) => `"${f}"`)
        .join(' ')}`,
  )

export default {
  'src/**/*.{js,jsx,ts,tsx,vue}': eslint,
  'src/**/*.{css,scss,sass,vue}': stylelint,
  // Deliberadamente `**/*` y no una lista de directorios: `format:check` (el gate de CI) corre
  // `prettier --check .` sobre todo el árbol versionado, y enumerar carpetas aquí obliga a
  // acordarse de ampliar la lista cada vez que aparece una nueva — ya falló una vez con
  // `.claude/`, que no estaba en la enumeración y hacía que el gancho local diera verde sobre
  // ficheros que CI rechazaba (issue #51). `.prettierignore` (compartido con CI) sigue aplicando,
  // así que lo generado queda fuera igual.
  '**/*.{js,mjs,cjs,ts,tsx,vue,json,md,yml,yaml,html,css,scss,sass}': prettier,
}
