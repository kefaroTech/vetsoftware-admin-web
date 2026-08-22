import { useRouter } from 'vue-router'

/**
 * EST-09 · entrada de historial para que el gesto "atrás" del navegador
 * cierre el modal en vez de abandonar la pantalla. Sin argumento de URL: la
 * barra de direcciones no cambia y no se toca `route.query` (13 lecturas en
 * 5 ficheros que no deben dispararse por abrir un modal).
 *
 * Extraído de `ModalShell.vue` para no exceder el presupuesto de líneas del
 * SFC (`maxSfcLines: 500`, gate `css:budget`); es gemelo TR-02 igual que él.
 */
export function useModalHistory() {
  const router = useRouter()
  let entryId: string | null = null

  /** Al abrir: `history.state` se preserva con `...` porque `vue-router`
   * guarda ahí `position`/`back`/`current`/`forward`/`scroll`. */
  function push() {
    entryId = `ds-modal-${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.history.pushState({ ...window.history.state, __dsModal: entryId }, '')
  }

  /** Al cerrar por X/Escape/backdrop: retira la entrada SOLO si sigue siendo
   * la nuestra. Si el padre navegó tras guardar, `vue-router` ya sustituyó
   * `history.state` y `history.back()` deshacería esa navegación — el fallo
   * grave que esta guarda existe para evitar. El `afterEach` de un solo uso
   * cancela el `back()` pendiente si una navegación se completa antes del
   * `requestAnimationFrame` (resuelve async y puede no haber tocado
   * `history.state` todavía). */
  function release() {
    if (!entryId) return
    const mine = entryId
    entryId = null
    let cancel: (() => void) | null =
      router?.afterEach(() => {
        cancel?.()
        cancel = null
      }) ?? null
    requestAnimationFrame(() => {
      cancel?.()
      cancel = null
      if (window.history.state?.__dsModal === mine) window.history.back()
    })
  }

  /** Al recibir `popstate` (gesto "atrás"): la entrada ya no existe, no llamar a `back()`. */
  function clear() {
    entryId = null
  }

  return { push, release, clear }
}
