import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Debounce anti-parpadeo del velo de carga. Los dos valores son plataforma, no
 * gusto de cada aplicación: una petición más rápida que `SHOW_DELAY_MS` no llega
 * a mostrar nada, y una vez visible el velo dura al menos `MIN_VISIBLE_MS` para
 * que no aparezca y desaparezca en el mismo parpadeo.
 *
 * Este archivo se mantiene idéntico en los dos fronts. Divergieron (200/300 aquí,
 * 120/420 allá) porque alguien tocó dos números en un repositorio y no en el otro,
 * y durante semanas la misma aplicación se sintió distinta según por dónde se
 * entrara. Si hay que cambiarlos, se cambian en ambos.
 */
const SHOW_DELAY_MS = 200
const MIN_VISIBLE_MS = 300

export const useLoaderStore = defineStore('loader', () => {
  const pending = ref(0)
  const visible = ref(false)
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let shownAt = 0

  function clearShowTimer() {
    if (showTimer !== null) {
      clearTimeout(showTimer)
      showTimer = null
    }
  }

  function showNow() {
    visible.value = true
    shownAt = Date.now()
  }

  function hideAfterMinVisible() {
    const elapsed = Date.now() - shownAt
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
    if (remaining === 0) {
      visible.value = false
    } else {
      setTimeout(() => {
        if (pending.value === 0) visible.value = false
      }, remaining)
    }
  }

  function push() {
    pending.value++
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
