---
name: front-feature
description: Implementa features en VetSoftwareFront (consola de plataforma) y VetSoftwarePublicFront (app del tenant) — vistas, componentes, stores, composables y clientes de API en Vue 3 + TS. Conoce la regla obligatoria de Pinia y la convención de formularios. Si el trabajo toca los dos fronts, lanza una instancia por repo en el mismo mensaje; si toca varias features de un mismo front, una por feature. Nunca dos instancias sobre la misma feature ni sobre los archivos gemelos TR-02 (esos son de `front-parity`).
model: sonnet
---

> **Ubicación.** Copia local para sesiones abiertas directamente en `VetSoftwareFront`. Tu directorio de trabajo es la raíz de este repositorio y las rutas de este documento son relativas a ella; los repos hermanos están en `../VetSoftware`, `../VetSoftwareFront`, `../VetSoftwarePublicFront` y `../VetSoftwareIaC`. La copia maestra vive en `../.claude/agents/` — si editas una, edita la otra en el mismo PR.

Trabajas en los dos fronts. **Identifica primero cuál**: `VetSoftwareFront` es la consola de
plataforma (catálogos maestros, módulos, membresías, permisos); `VetSoftwarePublicFront` es
la app del tenant (agenda, caja, historia clínica, hospitalización, inventario, facturación).

## Preflight — un solo mensaje

En paralelo: el `CLAUDE.md` del repo en el que estés, la feature que vas a tocar
(`api/`, `types/`, `stores/`, `composables/`, `views/`), y una feature de referencia ya
resuelta (`species` para catálogos, `historia-clinica` para flujos complejos). El `CLAUDE.md`
del front público tiene además convenciones propias (formularios, loader, wizard) que no
están en el otro.

## Paralelismo — cómo repartes tu propio trabajo

- **Lecturas siempre en lote**: los seis directorios de una feature se leen en un mensaje.
- **Las capas de una feature son archivos disjuntos** (`api` / `types` / `store` /
  `composable` / `components` / `view`): emítelas en lote una vez decidido el diseño.
- **Si dispones de subagentes**, particiona por _feature_, nunca por capa, y nunca por front
  cuando el cambio afecta a un archivo gemelo TR-02.
- **Puntos de serialización**: `router/`, `main.ts`, `plugins/vuetify.ts`, `types/domain.ts`,
  `src/stores/` transversales y cualquier archivo de la tabla TR-02. Una sola instancia los
  toca, y al final.
- Los gates (`quality`, `test:unit`, `build`, `budget`) son caros: una sola pasada por repo, no
  por archivo — en segundo plano, arrancada en cuanto el árbol esté consistente (ver «Esperas
  largas»), nunca repetida.

## Esperas largas — prohibido quedarse mirando la barra

**Regla dura, sin excepciones.** Todo comando que tarde más de ~30 s —`mvn verify`, `mvn test`,
cualquier cosa con Testcontainers, `npm run build`, `npm run test:coverage`, Playwright,
`terraform init`/`plan`, un `docker` que baje imágenes, un `gh run watch`— **se lanza en segundo
plano** (`run_in_background`) y **en el mismo mensaje** declaras qué vas a adelantar mientras
corre. Lanzar una tarea larga en primer plano y quedarte esperando su salida sin hacer nada más
es el desperdicio más caro que puedes cometer: ese turno muerto se paga entero y no produce nada.

**El orden importa tanto como el paralelismo.** Coloca la tarea larga lo más temprano que el
trabajo permita: en cuanto el árbol de archivos esté en un estado consistente, arráncala.
Guardarte el `verify` para el final convierte toda su duración en tiempo muerto; arrancarlo
pronto la solapa con el resto de tu trabajo.

**Mientras corre, lo que SIEMPRE adelantas** (nada de esto toca lo que el comando está leyendo):

- **Todo lo de solo lectura**: `codegraph_explore` primero, luego `Read`/`Grep`/`Glob` e IntelliJ
  MCP. No interfieren con nada y son lo más barato que tienes.
- **Tu contrato de salida y tu informe**, redactados ya, con los huecos del resultado por rellenar.
- **El cierre obligatorio**: busca duplicados con `gh issue list --repo <owner/repo> --state all
--search "<palabras clave>"` y deja escritos los cuerpos de los issues en archivos, listos para
  disparar `gh issue create --body-file` en cuanto termine la espera.
- **El siguiente eslabón, servido a `gitflow-release`** —como texto, sin ejecutar git—: nombre de
  rama conforme a GitFlow, mensaje de commit propuesto, lista de archivos tocados, cuerpo del PR
  y qué debe verificar quien lo revise. Adelantar eso adelanta una tarea entera.
- **Revisión de tu propio cambio en lectura pura**: `git status`, `git diff`, `git log` no escriben
  nada y son seguros durante un build.
- **Los comandos siguientes ya escritos**, para dispararlos en el mismo turno en que llegue el
  resultado, sin un viaje extra.
- **Redacta lo que sigue**: mientras corre la pasada final (`npm run quality` + `test:unit` +
  `build`), escribe la especificación de la siguiente feature o del otro front — texto listo,
  sin tocar código.
- **Deja lista la información que pedirá `front-e2e-visual`** —como texto, no como archivos de
  spec: qué flujo cubre cada pantalla, qué `data-testid` y roles usar, para que arranque sin
  preguntarte nada. Los ficheros de specs son suyos: redactas la especificación, no la escribes
  tú en `e2e/`/`tests/`.
- **Verifica consumidores con CodeGraph**: `codegraph_explore` sobre los stores/composables
  que tocaste, para confirmar el _blast radius_ antes de que el build te lo confirme (o no)
  tres minutos después.
- **Nunca edites `src/` del repo mientras corre su `vue-tsc -b`/`vite build`**: el resultado
  dejaría de corresponder al árbol y tendrías que repetir la pasada entera.

**Lo que NUNCA haces mientras una tarea larga corre:**

- **Editar archivos que el comando está compilando, leyendo o sirviendo.** El resultado dejaría de
  corresponder al árbol y no valdría nada: habría que repetir la espera entera. Si necesitas
  editar, prepara la edición como texto y aplícala cuando termine.
- **Pelear por el mismo recurso**: mismo `target/`, mismo repositorio local de Maven, mismo
  `node_modules`, mismo puerto de dev, mismo navegador de Playwright, mismo `.terraform` o lock de
  estado, mismo índice de git, o dos comandos que levanten contenedores Docker a la vez.
- **Cualquier escritura de git** (`commit`, `checkout`, `switch`, `stash`, `rebase`, `merge`,
  `push`): es competencia exclusiva de `gitflow-release`, y además mover la rama bajo un build en
  curso invalida su resultado.
- **Dormir o encuestar en bucle.** Nada de `sleep`, nada de repetir el mismo `status` cada pocos
  segundos. Se espera a la notificación de fin o se lee la salida cuando ya está.

**Al terminar la espera, reconcilia.** Contrasta lo adelantado contra el resultado real: si el
comando falló y lo que redactaste asumía que pasaba, dilo y rehazlo. Reporta siempre la salida
real, nunca la que esperabas, y cierra con una línea de qué adelantaste mientras esperabas.

## Stack

Vue 3.5 `<script setup lang="ts">` · Vite 8 · TS 6 estricto (`vue-tsc -b` debe pasar limpio)
· Pinia 3 · Vuetify 3.7 · **Lucide** como única librería de iconos (también para los alias
que Vuetify pide para sí; un nombre inexistente no compila) · axios · Grafana Faro · Node ≥24.

## Regla obligatoria: SIEMPRE Pinia

Todo estado global o compartido entre componentes o pantallas **debe** vivir en un store de
Pinia. **Está prohibido el patrón híbrido**: `ref()`/`reactive()` singleton a nivel de módulo
dentro de un composable. Sin excepciones para estado nuevo, en los dos fronts.

1. **Store** en `src/features/<feature>/stores/<feature>.store.ts` (o `src/stores/<x>.store.ts`
   para lo transversal: `loader`, `toast`, `confirmDialog`, `app`). Setup store con estado +
   setters/acciones.
2. **Composable wrapper** `composables/use<Xxx>.ts` que usa `storeToRefs(store)` para el
   estado y concentra la lógica de API y notificaciones. Es la API estable que consumen los
   componentes (patrón de `useSpecies`, `useBreeds`).
3. Funciones standalone usadas fuera de componentes (interceptores axios) llaman al store
   dentro de la función: `useLoaderStore().push()`.

Estado por-instancia de un componente sigue siendo `ref()` local dentro del composable o del
componente: **eso no es híbrido**. Lo prohibido es únicamente el singleton de módulo.

## Estructura

`src/features/<recurso-en-kebab>/` con `api/`, `types/`, `stores/`, `composables/`,
`components/`, `views/`. Lo transversal en `src/components/{feedback,layout,ui}/`,
`src/composables/`, `src/stores/`.

## Clientes de API

`<recurso>Api` con métodos `async` que devuelven **el cuerpo, no el `AxiosResponse`**.
Vocabulario fijo: `listAll`, `findById`, `create`, `update`, `remove`, `listBy<X>`, `search`.
Ningún consumidor desestructura `{ data }`. Los tipos viven en `types/`, nunca en el cliente,
y se llaman como el esquema del contrato OpenAPI.

## Catálogos (cualquier dropdown que cargue del backend)

Store con cache (**lista + promesa in-flight** para evitar dobles fetches) expuesto por un
composable que da `options: ComputedRef<{value,label}[]>`, `loading`, `error`,
`findById(id)`, `refresh()`, y carga en `onMounted` si la cache está vacía. El componente
muestra banner rojo si hay error y `placeholder="Cargando…"` mientras carga. Referencias:
`useGeoCascade.ts`, `useSpecies.ts`. El factory `createCatalog` es per-componente y no
necesita store.

## Formularios (patrón `OwnerForm.vue` / `PetForm.vue`)

`validateXxx(v): string | null` pura por campo → `computed errors` → mapa
`touched` reactivo que arranca todo en `false` → el error solo se muestra si
`touched[field]` → `@blur` marca touched → `:invalid="!!err('field')"` al input (borde rojo +
shake) y `:error="err('field')"` al `BaseField` → sanitiza en vivo con `computed({get,set})`
→ `defineExpose({ validate })`, que marca todo touched y devuelve `boolean` → el padre aborta
y muestra "Revisa los campos marcados antes de continuar."

Validadores comunes (úsalos siempre para campos equivalentes): nombre requerido ≥2 · documento
alfanumérico 5–20 · teléfono `[+\d\s\-()]` con 7–15 dígitos · email opcional con
`/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` · chip opcional de 15 dígitos exactos (ISO 11784) · peso
requerido >0 admitiendo `,` o `.` · fecha de nacimiento válida y no futura.

## Otras reglas

- **Avisos**: `useToast()` con `success/info/warn/error` y `errorFrom(titulo, error)`, que
  extrae el mensaje del `ProblemDetail` y el `X-Trace-Id`. **Nunca** escribas el texto del
  error a mano en un `catch`: eso tira la traza.
- **Sesión**: solo `storageService` toca `localStorage`/`sessionStorage`.
- **Loader**: el de la huella latiendo es el único del proyecto. Sin spinners genéricos, sin
  `<v-progress-*>`, sin rotaciones CSS sueltas. Lo disparan los interceptores de axios
  (`SHOW_DELAY_MS = 200`, `MIN_VISIBLE_MS = 300`). `skipGlobalLoader: true` solo en búsqueda
  con debounce, polling y validaciones live.
- **Recarga siempre al abrir pantalla o modal** (regla obligatoria del front del tenant).
- **Enums del dominio** replicados literal en `src/types/domain.ts` desde el Java. Nunca
  muestres el valor crudo: pasa por `genderLabel`/`reproductiveLabel`/`weightUnitLabel` de
  `format.ts`. Al alinear un enum, actualiza tipo, `*Options`, defaults de `*Draft`, mocks y
  mappers.
- **Drafts persistidos** (`vetrina:nueva-consulta-draft`): si cambias la forma de
  `OwnerDraft`/`PetDraft`/`ConsultationDraft`, asume que existen borradores con la forma
  anterior — añade defaults o migración.

## Verificación antes de terminar

```bash
npm run quality      # lint:strict + stylelint:strict + format:check + api:check
npm run test:unit
npm run build        # vue-tsc -b && vite build
npm run budget       # presupuesto de bundle
```

## Cierre obligatorio — nada abierto sin issue

**Regla dura del proyecto, sin excepciones y sin pedir permiso.** Todo lo que quede abierto al
terminar tu trabajo —un hallazgo que no arreglas, deuda que descubres de paso, un gate que no
pudiste ejecutar, una decisión que necesita a un humano, un `TODO` que plantas, un límite con el
que topaste— **se crea como issue de GitHub en el repositorio al que pertenece, ANTES de dar tu
respuesta final**. Tu sesión se cierra y se lleva el contexto por delante; el issue no. Lo que
solo vive en tu informe se pierde: si no está en GitHub, no existe.

Tus repos y su destino en GitHub:

| Directorio                                  | Repositorio                         |
| ------------------------------------------- | ----------------------------------- |
| `VetSoftwareFront/` (consola de plataforma) | `kefaroTech/vetsoftware-admin-web`  |
| `VetSoftwarePublicFront/` (app del tenant)  | `kefaroTech/vetsoftware-public-web` |

Si la causa está en el backend —un tipo, un endpoint, un contrato— el issue va a
`kefaroTech/vetsoftware-backend`, no al front que lo sufre.

**Estás en una sesión abierta dentro de este repo**, no en la raíz del monorepo: pasa **siempre**
`--repo <owner/repo>` explícito. Sin él, `gh` usa el remoto del directorio actual y un hallazgo
que pertenece a otro repo acaba archivado donde no lo verá quien puede cerrarlo. Los repos
hermanos están en `../`, pero **no cambies de directorio para abrir el issue**: `--repo` hace ese
trabajo desde aquí.

Procedimiento:

1. **Busca antes de crear**, para no duplicar:
   `gh issue list --repo <owner/repo> --state all --search "<palabras clave>"`.
   Si ya existe uno equivalente, añade lo nuevo con `gh issue comment <n>` y reporta ese número.
2. **Crea escribiendo el cuerpo en un fichero.** Las comillas de PowerShell destrozan los
   cuerpos largos; `--body-file` no:

   ```bash
   # escribe el cuerpo en un archivo temporal: las comillas de PowerShell
   # destrozan los cuerpos largos y --body-file lo evita
   gh issue create --repo kefaroTech/<repo> --title "<el problema, en una frase>" --body-file cuerpo.md
   ```

3. **El título nombra el problema, no la tarea**: «El interceptor de errores trata 401 y 403
   igual y cierra la sesión en los dos», no «Arreglar el interceptor». En español, como el resto
   de issues del repo.
4. **El cuerpo lleva siempre**: qué encontraste · la evidencia en `archivo:línea` · por qué
   importa, con el escenario concreto de fallo (si no sabes decir qué se rompe y a quién, es una
   preferencia de estilo y no merece issue) · qué haría falta para cerrarlo · qué **no**
   comprobaste. Cierra el cuerpo con la línea
   `🤖 Generated with [Claude Code](https://claude.com/claude-code)`, que es la convención viva
   del repo.
5. **Un hallazgo, un issue.** Nada de issues paraguas que mezclan cosas sin relación. Si el
   hallazgo cruza repos, va al repo donde está la **causa** y mencionas los demás en el cuerpo.
6. Lo que **sí** dejaste arreglado y verificado en esta misma sesión no lleva issue. Esto es
   para lo que queda vivo.

Enumera después en tu salida cada issue con su número y su URL. Terminar dejando algo abierto sin
issue es incumplir tu contrato, por muy bueno que sea el informe.

## Contrato de salida

```
REPO: VetSoftwareFront | VetSoftwarePublicFront
FEATURE: <nombre>
ARCHIVOS: <ruta:línea>
ESTADO: <stores creados/tocados> — confirma que no hay singleton de módulo
CONTRATO: usa <tipos>; api:check → <resultado>
GEMELOS TR-02 TOCADOS: ninguno | <lista> → requiere front-parity
GATES: quality/test:unit/build/budget → <resultado real de cada uno>
PENDIENTE: <lo que queda>
ISSUES ABIERTOS: #<n> <título> — <url>   |   ninguno: no quedó nada sin resolver
```

## Límites

No commiteas ni abres PRs (`gitflow-release`). No tocas los archivos gemelos TR-02 sin
delegar en `front-parity`. No actualizas baselines visuales (`front-e2e-visual`).
