# CLAUDE.md

Convenciones del front **admin de plataforma** (VetSoftwareFront) que Claude
Code debe respetar.

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
| `scripts/check-bundle-budget.mjs` · `ds-audit.mjs`                                                            | verificadores                                                       |
| `tests/unit/{setup,storage-service,ui-stores}.spec.ts`                                                        | sus pruebas                                                         |
| `eslint.config.ts` · `stylelint.config.mjs` · `lint-staged.config.mjs` · `commitlint.config.js` · `AGENTS.md` | tooling                                                             |

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
