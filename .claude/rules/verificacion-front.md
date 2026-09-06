# Verificación del front — proporcional al cambio, nunca «todo por si acaso»

Regla para la sesión principal y para todo subagente que toque `VetSoftwareFront` (consola de plataforma). El CI del
PR ejecuta `quality`, `test:coverage`, `build`, `budget`, Playwright y `ds:audit` enteros;
aquí se verifica **lo que el cambio pudo romper**, una sola vez, con la forma más barata que da
el mismo veredicto.

## Coste medido (2026-09-05, esta máquina, cachés calientes)

| Qué                                                                                                   | Cómo                                                                                    | s               |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------- |
| ¿Compila este fichero? (tipos y template)                                                             | `mcp__idea__get_file_problems` (IntelliJ)                                               | ~1              |
| Un fichero: eslint · prettier · stylelint                                                             | `npx eslint --cache … <f>` · `npx prettier --check <f>` · `npx stylelint --cache … <f>` | 2,6 · 1,1 · 1,9 |
| Un spec de Vitest                                                                                     | `npx vitest run tests/unit/<spec>.spec.ts`                                              | 2,5             |
| Los specs que importan lo tocado                                                                      | `npx vitest related <ficheros de src> --run`                                            | 8,8             |
| Paridad TR-02 · `api:check`                                                                           | `npm run tr02:parity` · `npm run api:check`                                             | 0,7 · 2,0       |
| Vitest completo                                                                                       | `npm run test:unit`                                                                     | 10,1            |
| `lint:strict` · `format:check` (árbol entero)                                                         | dentro de `quality`                                                                     | 9,3 · 9,1       |
| `typecheck` (`vue-tsc -b --force`, árbol entero, sin incremental)                                     | dentro de `quality` y de `build`                                                        | 19,2            |
| **`npm run quality`** (tr02 + lint + stylelint + budgets + format + api:check + typecheck, fail-fast) | el gate de CI                                                                           | **39,6**        |
| `npm run build` = `vue-tsc -b` + `vite build`                                                         |                                                                                         | 20,5            |
| `npx vite build --mode prod` solo (el typecheck ya lo hizo `quality`)                                 |                                                                                         | **2,9**         |
| `npm run budget` (necesita `dist/`)                                                                   |                                                                                         | 0,6             |
| Playwright, una suite (tenant, medido 2026-09-05)                                                     | `npx playwright test e2e/<flujo>`                                                       | 14–17           |

## Los cinco niveles

**0 — Tras cada fichero escrito (1 s).** `mcp__idea__get_file_problems` con `errorsOnly: true`.
Nada de `vue-tsc` para saber si compila un fichero: no tiene modo incremental que valga
(19,2 s siempre, con o sin `--force`).

**1 — Nada más editar: `npx prettier --write <ficheros tocados>`.** Editar con Python o `sed`
mete CRLF y `format:check` denuncia «el fichero entero difiere»: se arregla con un `--write`
de 1 s sobre lo tocado, nunca con un `--write .` masivo.

**2 — Bucle de la feature, sobre lo tocado:**

```bash
npx eslint --cache --cache-strategy content --cache-location node_modules/.cache/eslint/ --max-warnings=0 <ficheros .ts/.vue>
npx stylelint --cache --cache-strategy content --cache-location node_modules/.cache/stylelint/ --max-warnings=0 <ficheros .vue/.css>
npx vitest related <ficheros de src tocados> --run          # o: npx vitest run tests/unit/<spec>.spec.ts
wc -l <SFC tocados>                                          # techo: 499 líneas (lo mide css:budget)
```

**3 — Una vez al final, en segundo plano, los dos a la vez** (no comparten ficheros):

```bash
npm run quality      # typecheck del árbol entero, paridad TR-02, presupuestos, api:check
npm run test:unit
```

Si tocaste los dos fronts, cada repo va en paralelo con el otro (directorios distintos).

**4 — Solo cuando está justificado:**

- `build` + `budget`: si tocaste `vite.config.*`, `.env*`, `router/`, chunks o dependencias
  del bundle, o el brief lo pide. Como `quality` ya hizo el typecheck:
  `npx vite build --mode prod && npm run budget` (2,9 s + 0,6 s, no 20,5 s).
- Playwright: de `front-e2e-visual`, **una suite por invocación**, contra `localdev` con el
  backend local levantado, y las baselines solo por la variante Docker.
- `npm run ds:audit`: solo cuando el brief lo pide; usa el puerto fijo 5174 y un servidor
  ajeno en ese puerto (otro worktree) le da una cifra plausible y falsa.

## Recursos únicos — uno a la vez por repo

Un solo gate pesado a la vez en este repo: dos `vue-tsc -b` pisan los `*.tsbuildinfo`, dos
Vitest se pelean por `node_modules/.vite` y `coverage/`, dos Playwright comparten el puerto
5173, el navegador y `test-results/`. `quality` y `test:unit` sí pueden convivir. En un
abanico, el brief nombra a la única instancia que ejecuta los gates de este repo.

## Lo que no hay que repetir

- Una verificación cuyo resultado no pudo cambiar: tras editar solo comentarios o docs, tras
  una respuesta sin ediciones, o la pasada que ya corrió otro agente sobre este árbol.
- `quality` en cada iteración: son 39,6 s y fail-fast; si revienta en el paso 8 se pierde
  todo lo anterior. Una vez, al final.
- `build` después de `quality`: repite los 19,2 s de `vue-tsc`.
- Tres suites de Playwright a la vez: con 16 workers contra un único servidor de dev dieron 12
  rojos falsos por contención y hubo que repetirlas.

## Trampas medidas

- **`tr02:parity` desde un `git worktree` es un falso verde**: busca al gemelo por nombre de
  carpeta, imprime `SIN COMPROBAR` y sale 0. Ejecútalo desde el árbol principal.
- **Las fuentes en Playwright**: `addInitScript` no las inyecta y `document.fonts.check()` dice
  que sí; la pasada sale con tipografía de respaldo y el síntoma es cero texto truncado.
- **`vue-tsc` también comprueba `tests/` y `e2e/`** con las reglas estrictas de `src/`: una
  fixture con la forma vieja de un tipo pone `quality` en rojo aunque `src/` esté limpio.
- **commitlint diverge entre los dos fronts** (cli 20.5 en la consola, 21.2 en el tenant): un
  `#123` o un hex dentro de un párrafo del cuerpo dispara `footer-leading-blank` en el tenant.
- **Un test intermitente se arregla o se borra**, nunca se reintenta con `retries`.
