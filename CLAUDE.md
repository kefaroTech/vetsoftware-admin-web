# CLAUDE.md

Convenciones del front **admin de plataforma** (VetSoftwareFront) que Claude
Code debe respetar.

## Cierre obligatorio — nada abierto sin issue

**Regla dura del proyecto, sin excepciones y sin pedir permiso.** Todo lo que quede abierto al
terminar un trabajo en este repo —un hallazgo que no arreglas, deuda que descubres de paso, un
gate que no pudiste ejecutar, una decisión que necesita a un humano, un `TODO` que plantas, un
límite con el que topaste— **se crea como issue de GitHub antes de dar la respuesta final**.
Aplica igual a la sesión principal y a cualquier subagente. La sesión se cierra y se lleva el
contexto por delante; el issue no. Lo que solo vive en el informe se pierde: **si no está en
GitHub, no existe.**

Este repo es **`kefaroTech/vetsoftware-admin-web`**. Si la causa está en el backend —un tipo, un
endpoint, un contrato desincronizado— el issue va a `kefaroTech/vetsoftware-backend`, no al front
que lo sufre. Los otros dos: `kefaroTech/vetsoftware-public-web` (app del tenant) y
`kefaroTech/vetsoftware-infrastructure` (infraestructura).

1. **Busca antes de crear**, para no duplicar:
   `gh issue list --repo <owner/repo> --state all --search "<palabras clave>"`.
   Si ya existe uno equivalente, añade lo nuevo con `gh issue comment <n>` y reporta ese número.
2. **Crea escribiendo el cuerpo en un fichero.** Las comillas de PowerShell destrozan los
   cuerpos largos; `--body-file` no:

   ```bash
   # escribe el cuerpo en un archivo temporal: las comillas de PowerShell
   # destrozan los cuerpos largos y --body-file lo evita
   gh issue create --repo kefaroTech/vetsoftware-admin-web --title "<el problema, en una frase>" --body-file cuerpo.md
   ```

3. **El título nombra el problema, no la tarea**, en español, como el resto de issues del repo:
   «El interceptor de errores trata 401 y 403 igual y cierra la sesión en los dos», no «Arreglar
   el interceptor».
4. **El cuerpo lleva siempre**: qué encontraste · la evidencia en `archivo:línea` · por qué
   importa, con el escenario concreto de fallo (si no sabes decir qué se rompe y a quién, es una
   preferencia de estilo y no merece issue) · qué haría falta para cerrarlo · qué **no**
   comprobaste. Cierra el cuerpo con la línea
   `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
5. **Un hallazgo, un issue.** Nada de issues paraguas que mezclan cosas sin relación.
6. Lo que **sí** dejaste arreglado y verificado en esta misma sesión no lleva issue. Esto es para
   lo que queda vivo.

**Abrir un issue no es un commit ni un push**: no entra en la aprobación humana escrita que exige
`AGENTS.md` antes de tocar una rama. Créalo sin preguntar. Después enumera en tu salida cada
issue con su número y su URL.

Caso concreto de este repo: una **deriva TR-02** que detectas y no puedes igualar tú, o un cambio
que obliga a tocar el gemelo del otro front, lleva issue en los **dos** repos, enlazados entre sí
— es la única deuda que se duplica a propósito, porque se paga en dos sitios.

## Stack

- Vue 3 + `<script setup lang="ts">` + Composition API
- Vite + TypeScript estricto (`vue-tsc -b` debe pasar limpio)
- **Pinia** para todo el estado global/compartido (montado en `main.ts` con `createPinia()`)
- Vuetify 3 + iconos Iconify/Tabler
- Axios para HTTP
- Backend Spring Boot compartido con el otro front (`/api/v1`)

## Manejo de estado: SIEMPRE Pinia (regla obligatoria)

**Todo estado global/compartido entre componentes o pantallas DEBE vivir en un
store de Pinia. Está prohibido el patrón híbrido de "estado module-scoped"
(declarar `const x = ref()` / `reactive()` a nivel de módulo dentro de un
composable). No hay excepciones para estado nuevo.** Esta regla aplica por igual
en ambos fronts del proyecto.

Convención (ya usada en cada feature de este repo):

1. **Store** en `src/features/<feature>/stores/<feature>.store.ts` (o
   `src/stores/<x>.store.ts` para estado transversal: `loader`, `toast`,
   `confirmDialog`, `app`). Setup store con estado + setters/acciones:
   ```ts
   export const useXxxStore = defineStore('xxx', () => {
     const items = ref<T[]>([])
     function setItems(d: T[]) {
       items.value = d
     }
     return { items, setItems }
   })
   ```
2. **Composable wrapper** `composables/use<Xxx>.ts` que usa `storeToRefs(store)`
   para el estado + concentra la lógica de API/notificaciones, manteniendo una
   API estable para los componentes (patrón de `useSpecies`, `useBreeds`, etc.).
3. Funciones standalone usadas fuera de componentes (interceptores axios) llaman
   al store dentro de la función: `useLoaderStore().push()`.

**Qué NO es estado global**: estado por-instancia de un componente sigue siendo
`ref()` local dentro de la función del composable/componente — eso NO es híbrido.
Lo prohibido es únicamente el `ref()`/`reactive()` singleton a nivel de módulo.

## Estructura por feature

`src/features/<feature>/` con `api/`, `stores/`, `composables/`, `components/`,
`views/`, `types/`.

## Los dos fronts son independientes, pero se escriben igual (TR-02)

No hay `@vetsoftware/core` ni workspace npm, y **no se va a añadir**: es una
decisión de plataforma, no una tarea pendiente. Cada repositorio se despliega,
versiona y evoluciona por su cuenta.

A cambio, la práctica es la misma en los dos. **Estos archivos se mantienen byte
a byte idénticos**; si tocas uno, tocas el otro en el mismo PR:

| Archivo                                                                                                       | Qué es                                                              |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/services/http/http.client.ts`                                                                            | cliente axios, refresh _single-flight_, lectores de `ProblemDetail` |
| `src/services/http/api-base-url.ts`                                                                           | resolución de la URL base                                           |
| `src/services/storage/storage.service.ts`                                                                     | único acceso a `localStorage`/`sessionStorage`                      |
| `src/services/telemetry/trace.ts`                                                                             | generador de `traceparent` (W3C)                                    |
| `src/stores/loader.store.ts`                                                                                  | debounce anti-parpadeo del velo                                     |
| `src/stores/toast.store.ts`                                                                                   | avisos                                                              |
| `src/composables/useGlobalLoader.ts` · `useToast.ts`                                                          | sus fachadas                                                        |
| `src/features/auth/utils/jwt.ts`                                                                              | decodificación del JWT                                              |
| `src/types/api.types.ts`                                                                                      | `ProblemDetail`                                                     |
| `src/plugins/vuetify.ts` · `vuetify-icon-aliases.ts`                                                          | tema e iconos de Vuetify                                            |
| `src/assets/styles/tokens.css` · `primitives.css`                                                             | capas 1 y 2 del sistema de diseño                                   |
| `src/components/feedback/{PawLoader,PageLoader,ToastStack}.vue`                                               | primitivas de feedback                                              |
| `scripts/check-bundle-budget.mjs` · `ds-audit.mjs` · `css-budget.mjs`                                         | verificadores                                                       |
| `tests/unit/{setup,storage-service,ui-stores}.spec.ts`                                                        | sus pruebas                                                         |
| `eslint.config.ts` · `stylelint.config.mjs` · `lint-staged.config.mjs` · `commitlint.config.js` · `AGENTS.md` | tooling                                                             |
| `stylelint-plugins/no-duplicate-primitive.mjs`                                                                | regla stylelint FE-08: rechaza CSS que reescribe una primitiva      |

**Divergencias permitidas, y solo estas.** Van siempre con un comentario que
diga por qué:

- `telemetry.ts`: el nombre de la aplicación.
- `http.client.ts`: un bloque delimitado con los presupuestos por llamada
  propios de cada app (el operativo declara `DIAN_TIMEOUT_MS` y
  `TRANSFER_TIMEOUT_MS`; la consola, ninguno).
- `check-bundle-budget.mjs`: las cifras del presupuesto.

Cualquier otra diferencia entre esos archivos es deriva, no diseño. Fue
exactamente así como el velo de carga acabó durando 300 ms en un front y 420 en
el otro durante semanas.

El patrón para escribir CSS nuevo sin volver a acumular ese tipo de deriva
—consumir `primitives.css` en vez de reescribirlo, qué mide cada una de las
dos puertas (`vetsoftware/no-duplicate-primitive` al escribir, `css:budget`
en el agregado) y la trampa de especificidad `(0,1,0)` vs. `(0,2,0)`— está
documentado en `AGENTS.md` (gemelo TR-02), sección "CSS: consumir el design
system, no reescribirlo".

## Convenciones que valen en los dos

**Clientes de API.** `src/features/<recurso>/api/<recurso>.api.ts` exporta un
objeto `<recurso>Api` con métodos `async` que devuelven **el cuerpo, no el
`AxiosResponse`**:

```ts
export const speciesApi = {
  async listAll(): Promise<SpecieResponse[]> {
    const { data } = await http.get<SpecieResponse[]>('/species')
    return data
  },
}
```

Vocabulario fijo: `listAll`, `findById`, `create`, `update`, `remove`,
`listBy<X>`, `search`. Ningún consumidor desestructura `{ data }`.

**Tipos.** Viven en `src/features/<recurso>/types/<recurso>.types.ts`, nunca
dentro del cliente, y **se llaman como el esquema del contrato**:
`SpecieResponse`, `CreateSpecieRequest`. Así `MatchesContract<X, 'X'>` se lee
igual en los dos repositorios y una deriva del contrato falla con el nombre a la
vista.

**Paginación.** Esta consola no consume hoy ningún endpoint paginado: sus
catálogos devuelven arrays planos. Cuando empiece a paginar, `PageResponse<T>` se
declara **una sola vez** en `src/types/pagination.ts` —nunca por feature— y se
ata al contrato con un centinela sobre una instanciación concreta
(`MatchesContract<PageResponse<XxxResponse>, 'PageResponseXxxResponse'>`), como hace el
operativo. Sin esa atadura, renombrar un campo en el backend no rompe la
compilación: devuelve `undefined` en la pantalla. El vocabulario del servidor es
`page` (base 0) + `pageSize` y el tope de filas por página es **200**; ojo, que
`usePagination` expone `size` y habrá que alinearlo.

**Estructura de un feature.** `src/features/<recurso-en-kebab>/` con `api/`,
`types/`, `stores/`, `composables/`, `components/`, `views/`. Lo transversal va
en `src/components/{feedback,layout,ui}/`, `src/composables/`, `src/stores/`.

**Iconos.** Una sola librería: Lucide, en componentes — también para los que
Vuetify pide para sí (`vuetify-icon-aliases.ts`). Ni webfont ni colección que
registrar en tiempo de ejecución. Un nombre que no exista no compila.

**Avisos.** `useToast()` con `success/info/warn/error` y `errorFrom(titulo,
error)`, que extrae el mensaje del `ProblemDetail` y el identificador de traza
de `X-Trace-Id`. Nunca escribas el texto del error a mano en un `catch`: eso
tira la traza.

**Sesión.** Solo `storageService` toca el almacenamiento del navegador.
