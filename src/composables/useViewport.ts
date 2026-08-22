import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { COMPACT_MAX_WIDTH, useViewportStore } from '@/stores/viewport.store'

/**
 * Fachada del store de viewport (EST-10). El porqué está en `viewport.store.ts`.
 *
 * El listener se registra por componente pero el estado es uno solo: varios
 * consumidores no se pisan, solo comparten la misma lectura.
 */
export function useViewport() {
  const store = useViewportStore()
  const { isCompact } = storeToRefs(store)

  let media: MediaQueryList | null = null

  function sync(event: MediaQueryList | MediaQueryListEvent) {
    store.setCompact(event.matches)
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    media = window.matchMedia(`(width <= ${COMPACT_MAX_WIDTH}px)`)
    sync(media)
    media.addEventListener('change', sync)
  })

  onUnmounted(() => {
    media?.removeEventListener('change', sync)
    media = null
  })

  return { isCompact }
}
