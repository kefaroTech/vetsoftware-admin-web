import { computed, ref } from 'vue'

const SHOW_DELAY_MS = 200
const MIN_VISIBLE_MS = 300

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

export function pushLoader() {
  pending.value++
  if (pending.value === 1 && !visible.value) {
    clearShowTimer()
    showTimer = setTimeout(() => {
      showTimer = null
      if (pending.value > 0) showNow()
    }, SHOW_DELAY_MS)
  }
}

export function popLoader() {
  pending.value = Math.max(0, pending.value - 1)
  if (pending.value === 0) {
    if (visible.value) {
      hideAfterMinVisible()
    } else {
      clearShowTimer()
    }
  }
}

export function useGlobalLoader() {
  return {
    visible: computed(() => visible.value),
    pending: computed(() => pending.value),
    push: pushLoader,
    pop: popLoader,
  }
}
