/**
 * Registro de diálogos abiertos — pila PLANA y NO reactiva (array module-scoped,
 * no `ref()`): es un registro de instancias vivas, del mismo género que un
 * registro de listeners, y nunca se lee durante el render. Por eso NO es el
 * patrón "estado module-scoped" prohibido por convención (ese prohíbe sustituir
 * Pinia por estado reactivo COMPARTIDO; aquí no hay nada reactivo).
 *
 * Sirve para dos cosas, ambas del `ModalShell` gemelo:
 * - Que Escape y el gesto "atrás" del navegador los atienda SOLO el modal
 *   superior cuando hay varios anidados (`isTop`).
 * - Bloquear el scroll del fondo mientras haya al menos un modal abierto que
 *   lo pida, y restaurarlo exactamente como estaba al salir el último.
 */

interface Layer {
  id: number
  lockScroll: boolean
}

let seq = 0
const stack: Layer[] = []
let savedOverflow = ''
let savedPaddingRight = ''

function lockBodyScroll() {
  savedOverflow = document.body.style.overflow
  savedPaddingRight = document.body.style.paddingRight
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  document.body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
}

function unlockBodyScroll() {
  document.body.style.overflow = savedOverflow
  document.body.style.paddingRight = savedPaddingRight
}

export function useModalLayer() {
  /** Entra en la pila. `lockScroll` decide si esta capa participa del bloqueo. */
  function enter(lockScroll = true): Layer {
    const layer: Layer = { id: ++seq, lockScroll }
    const hadLockedLayer = stack.some((l) => l.lockScroll)
    stack.push(layer)
    if (lockScroll && !hadLockedLayer) lockBodyScroll()
    return layer
  }

  /** Sale de la pila y restaura el scroll si ninguna capa restante lo pedía. */
  function leave(layer: Layer) {
    const idx = stack.indexOf(layer)
    if (idx === -1) return
    stack.splice(idx, 1)
    if (layer.lockScroll && !stack.some((l) => l.lockScroll)) unlockBodyScroll()
  }

  /** ¿Es la capa superior? Lo consultan Escape, `popstate` y la trampa de foco. */
  function isTop(layer: Layer): boolean {
    return stack.at(-1)?.id === layer.id
  }

  return { enter, leave, isTop }
}

export type { Layer as ModalLayer }
