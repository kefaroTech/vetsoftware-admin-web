import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Ancho por debajo del cual la consola colapsa el sidebar a iconos (EST-10).
 *
 * TIENE que coincidir con el `@media (width <= 1024px)` de los SFC de
 * `src/components/layout/`. El valor está en dos sitios a propósito y no hay
 * forma de que sea uno solo: el colapso es CSS y el rótulo accesible es marcado.
 */
export const COMPACT_MAX_WIDTH = 1024

/**
 * Viewport compacto (tablet) — EST-10.
 *
 * Existe por un motivo de accesibilidad, no de maquetación. Al colapsar el
 * sidebar el rótulo de cada enlace desaparece; si desapareciera con
 * `display: none` el enlace se quedaría SIN NOMBRE ACCESIBLE y un lector de
 * pantalla anunciaría «enlace» a secas (WCAG 2.2 §2.4.4 Link Purpose, §4.1.2
 * Name, Role, Value). La alternativa correcta es `.ds-sr-only`, que saca el
 * nodo del flujo conservando el texto — y esa es una CLASE, no una propiedad,
 * así que hay que aplicarla desde el marcado. Escribir su cuerpo dentro de la
 * media query sería duplicar una primitiva gemela, que es justo lo que
 * `vetsoftware/no-duplicate-primitive` prohíbe.
 *
 * De ahí que el estado del viewport sea estado compartido entre `AppSidebar`,
 * `SidebarUserCard` y `AppHeader`, y por tanto un store de Pinia.
 */
export const useViewportStore = defineStore('viewport', () => {
  const isCompact = ref(false)

  function setCompact(value: boolean) {
    isCompact.value = value
  }

  return { isCompact, setCompact }
})
