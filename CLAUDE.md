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
   `src/stores/<x>.store.ts` para estado transversal: `loader`, `notification`,
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
