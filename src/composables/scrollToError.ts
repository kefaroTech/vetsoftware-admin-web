import { nextTick } from 'vue'

/**
 * Marcadores DOM que dejan los primitivos de formulario cuando un campo es inválido:
 * - `aria-invalid="true"` → AppInput, AppSelect, AppTextarea, AppCheckbox.
 * - `p.error` → mensaje de error que pintan bajo el campo (dentro de `.field` o, en
 *   AppCheckbox, de `.checkfield`).
 * - `[data-error-anchor]` → marcador explícito para lo que no es un campo pero sí es el
 *   motivo del fallo, típicamente `ErrorSummary`. Sin él, un formulario desplazado deja el
 *   mensaje fuera de la vista y parece que no pasó nada.
 */
const ERROR_SELECTOR = '[aria-invalid="true"], .invalid, p.error, [data-error-anchor]'

function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0
}

/** Elementos capaces de recibir foco de teclado dentro del objetivo desplazado. */
const FOCUSABLE_SELECTOR = 'input, select, textarea, [tabindex]'

/**
 * Tras una validación fallida, centra verticalmente el scroll sobre el PRIMER campo
 * inválido (el que esté más arriba en la pantalla) con scroll suave y le da el foco
 * (WCAG 2.4.3) para que el teclado y el lector de pantalla lleguen a él sin más gestos.
 *
 * Sin `root`, se acota automáticamente al modal abierto más reciente (`.overlay` de
 * ModalShell) si lo hay; si no, al documento. Así el mismo `scrollToFirstError()` sirve
 * tanto para modales como para vistas de página completa sin pasar contenedores.
 *
 * @returns `true` si encontró un campo inválido y desplazó hacia él.
 */
export async function scrollToFirstError(root?: ParentNode): Promise<boolean> {
  // Esperamos a que Vue pinte el estado inválido (bordes rojos + mensajes) antes de medir.
  await nextTick()

  let scope: ParentNode = document
  if (root) {
    scope = root
  } else {
    const overlays = document.querySelectorAll<HTMLElement>('.overlay')
    const topOverlay = overlays[overlays.length - 1]
    if (topOverlay) scope = topOverlay
  }

  const candidates = Array.from(scope.querySelectorAll<HTMLElement>(ERROR_SELECTOR))
    // El mensaje vive en <p.error>; centramos sobre el campo completo (label + input + error).
    .map((el) =>
      el.matches('p.error') ? (el.closest<HTMLElement>('.field, .checkfield') ?? el) : el,
    )
    .filter(isVisible)

  if (candidates.length === 0) return false

  // "Primer campo inválido" = el más arriba en la pantalla (menor top).
  const target = candidates.reduce((top, el) =>
    el.getBoundingClientRect().top < top.getBoundingClientRect().top ? el : top,
  )

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const focusTarget = target.matches(FOCUSABLE_SELECTOR)
    ? target
    : target.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
  focusTarget?.focus({ preventScroll: true })

  return true
}
