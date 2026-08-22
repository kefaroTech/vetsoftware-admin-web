import type { Ref } from 'vue'

/**
 * A11Y-08 · trampa de foco y devolución de foco de `ModalShell`.
 *
 * Extraído del propio `ModalShell.vue` para no exceder el presupuesto de
 * líneas del SFC (`maxSfcLines: 500`, gate `css:budget`); es gemelo TR-02
 * igual que él, igual que `useModalHistory.ts` antes.
 */

// Selector de tabulables — APG Dialog (Modal). Se recalcula en cada Tab (no se
// cachea): el cuerpo de un modal cambia con `v-if` a cada paso del formulario.
const TABBABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), ' +
  'audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), ' +
  'details > summary:first-of-type, iframe'

export interface ModalFocusOptions {
  cardEl: Ref<HTMLElement | null>
  closeBtn: Ref<HTMLButtonElement | null>
  /** Getters, no valores: para que un cambio reactivo del prop no quede
   *  congelado en el cierre del composable (creado una sola vez en `setup`). */
  getInitialFocus: () => (() => HTMLElement | null) | undefined
  getReturnFocusTo: () => HTMLElement | (() => HTMLElement | null) | string | null | undefined
}

export function useModalFocus(opts: ModalFocusOptions) {
  let triggerEl: HTMLElement | null = null

  function tabbables(): HTMLElement[] {
    if (!opts.cardEl.value) return []
    return Array.from(opts.cardEl.value.querySelectorAll<HTMLElement>(TABBABLE)).filter(
      (el) => el.getClientRects().length > 0,
    )
  }

  /**
   * Trampa de foco. Se escucha en el `.overlay` (`@keydown.capture` en el
   * template de `ModalShell`), NUNCA en `window`: `BaseSelect`/`SearchableSelect`
   * teletransportan su panel a `<body>`, fuera del árbol del overlay, así que
   * un `keydown` de Tab originado ahí no llega aquí y el selector con búsqueda
   * sigue funcionando dentro de cualquier modal sin listas de excepción.
   * `aria-modal="true"` ya delimita el diálogo para el lector de pantalla: no
   * hace falta `inert`, que además inutilizaría esos paneles teletransportados.
   */
  function onTrapTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    const items = tabbables()
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) {
      e.preventDefault()
      opts.cardEl.value?.focus()
      return
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  /** Captura el disparador en el flanco de apertura, para la cadena de respaldo de abajo. */
  function captureTrigger() {
    triggerEl = (document.activeElement as HTMLElement) ?? null
  }

  function resolveInitialFocus(): HTMLElement | null {
    const custom = opts.getInitialFocus()?.()
    if (custom) return custom
    if (opts.closeBtn.value) return opts.closeBtn.value
    return tabbables()[0] ?? opts.cardEl.value
  }

  /** Cadena de respaldo: prop > disparador capturado al abrir > `<h1>` de `main`
   *  (se le asigna `tabIndex=-1` desde JS, inofensivo) > `main` > nada. */
  function resolveReturnFocus(): HTMLElement | null {
    const returnFocusTo = opts.getReturnFocusTo()
    const custom = typeof returnFocusTo === 'function' ? returnFocusTo() : returnFocusTo
    if (typeof custom === 'string') {
      const el = document.querySelector<HTMLElement>(custom)
      if (el) return el
    } else if (custom?.isConnected) {
      return custom
    }
    if (triggerEl?.isConnected && triggerEl.offsetParent !== null) return triggerEl
    const h1 =
      document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('h1')
    if (h1) {
      h1.tabIndex = -1
      return h1
    }
    const main = document.querySelector<HTMLElement>('main')
    if (main) main.tabIndex = -1
    return main
  }

  return { onTrapTab, captureTrigger, resolveInitialFocus, resolveReturnFocus }
}
