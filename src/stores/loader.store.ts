import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Debounce anti-parpadeo del velo de carga. Los tres valores son plataforma, no
 * gusto de cada aplicación: una petición más rápida que `SHOW_DELAY_MS` no llega
 * a mostrar nada, una vez visible el velo dura al menos `MIN_VISIBLE_MS` para que
 * no aparezca y desaparezca en el mismo parpadeo, y al llegar a cero pendientes
 * el ocultado espera `HIDE_GRACE_MS` antes de aplicarse de verdad.
 *
 * Esa gracia existe porque casi ninguna pantalla dispara sus peticiones en
 * paralelo: las encadena con `await`, y entre una y la siguiente `pending` pasa
 * por 0 durante el hueco de un tick de microtareas/red. Sin gracia, ese cero
 * momentáneo ocultaba el velo de inmediato (rama antigua sin temporizador) y la
 * siguiente petición lo volvía a mostrar `SHOW_DELAY_MS` después: con N peticiones
 * secuenciales el usuario veía N-1 parpadeos en vez de una animación continua.
 * `HIDE_GRACE_MS` da tiempo a que la siguiente petición de la cadena llegue y
 * cancele el ocultado antes de que se ejecute.
 *
 * Este archivo se mantiene idéntico en los dos fronts. Divergieron una vez
 * (200/300 aquí, 120/420 allá) porque alguien tocó los números en un repositorio
 * y no en el otro, y durante semanas la misma aplicación se sintió distinta según
 * por dónde se entrara. Si hay que cambiar SHOW_DELAY_MS, MIN_VISIBLE_MS o
 * HIDE_GRACE_MS, se cambian en ambos.
 */
const SHOW_DELAY_MS = 200
const MIN_VISIBLE_MS = 300
const HIDE_GRACE_MS = 150

export const useLoaderStore = defineStore('loader', () => {
  const pending = ref(0)
  const visible = ref(false)
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let shownAt = 0

  function clearShowTimer() {
    if (showTimer !== null) {
      clearTimeout(showTimer)
      showTimer = null
    }
  }

  function clearHideTimer() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function showNow() {
    visible.value = true
    shownAt = Date.now()
  }

  function hideAfterMinVisible() {
    const elapsed = Date.now() - shownAt
    const remaining = Math.max(HIDE_GRACE_MS, MIN_VISIBLE_MS - elapsed)
    clearHideTimer()
    hideTimer = setTimeout(() => {
      hideTimer = null
      if (pending.value === 0) visible.value = false
    }, remaining)
  }

  function push() {
    pending.value++
    clearHideTimer()
    if (pending.value === 1 && !visible.value) {
      clearShowTimer()
      showTimer = setTimeout(() => {
        showTimer = null
        if (pending.value > 0) showNow()
      }, SHOW_DELAY_MS)
    }
  }

  function pop() {
    pending.value = Math.max(0, pending.value - 1)
    if (pending.value === 0) {
      if (visible.value) {
        hideAfterMinVisible()
      } else {
        clearShowTimer()
      }
    }
  }

  return { pending, visible, push, pop }
})
