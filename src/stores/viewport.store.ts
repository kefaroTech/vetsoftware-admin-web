import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Ancho por debajo del cual la navegación de la consola deja de ser un sidebar
 * persistente y pasa a ser un cajón modal.
 *
 * El VALOR no cambió con el rediseño de tablet; cambió lo que significa: antes
 * era «los rótulos colapsan a iconos», ahora es «la navegación es un cajón».
 * TIENE que coincidir con el `@media (width <= 1024px)` de los SFC de
 * `src/components/layout/`. Está en dos sitios a propósito y no hay forma de
 * que sea uno solo: el cajón es CSS y el `role`/`aria-modal`/`inert` que lo
 * convierten en diálogo son marcado.
 */
export const COMPACT_MAX_WIDTH = 1024

/**
 * Viewport de cajón (tablet y por debajo).
 *
 * Sustituye a `isCompact` (EST-10), que describía un raíl de 72 px con los
 * rótulos colapsados a iconos. Aquel diseño existía por accesibilidad: al
 * ocultar el rótulo con `display: none` el enlace se quedaba sin nombre
 * accesible, así que se ocultaba con `.ds-sr-only`, que conserva el texto.
 *
 * Ese apaño ya no está, y no porque se haya aflojado el criterio sino porque
 * su causa desapareció: en el cajón el rótulo es VISIBLE, y con el cajón
 * cerrado la navegación entera está fuera de pantalla y marcada `inert`. No
 * hay ningún enlace sin nombre en ningún estado. El raíl con `:title` que el
 * otro front usa no era alternativa: un tooltip se dispara con `:hover` y en
 * una tablet no hay hover, así que el rótulo no aparecía NUNCA para quien ve
 * (WCAG 2.2 §1.3.1 Info and Relationships, §3.2.4 Consistent Identification).
 *
 * `navOpen` vive aquí, no en `useNavDrawer.ts`: lo comparten `AppHeader` (la
 * hamburguesa) y `AppSidebar` (el cajón), que son hermanos y no tienen un
 * padre que se lo pase. Un `ref()` de ámbito de módulo dentro del composable
 * sería el patrón híbrido que este repo prohíbe. El composable orquesta el
 * comportamiento; el estado es del store.
 */
export const useViewportStore = defineStore('viewport', () => {
  const isDrawerViewport = ref(false)
  const navOpen = ref(false)

  function setDrawerViewport(value: boolean) {
    isDrawerViewport.value = value
  }

  function openNav() {
    navOpen.value = true
  }

  function closeNav() {
    navOpen.value = false
  }

  function toggleNav() {
    navOpen.value = !navOpen.value
  }

  return { isDrawerViewport, navOpen, setDrawerViewport, openNav, closeNav, toggleNav }
})
