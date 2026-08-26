import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { COMPACT_MAX_WIDTH, useViewportStore } from '@/stores/viewport.store'

/**
 * Fachada del store de viewport. El porqué está en `viewport.store.ts`.
 *
 * El listener se registra por componente pero el estado es uno solo: varios
 * consumidores no se pisan, solo comparten la misma lectura. `AppHeader` la
 * consume para decidir si pinta la hamburguesa; `AppSidebar`, a través de
 * `useNavDrawer`, para saber si el `<aside>` es un diálogo o una región.
 */
export function useViewport() {
  const store = useViewportStore()
  const { isDrawerViewport, navOpen } = storeToRefs(store)

  let media: MediaQueryList | null = null

  function sync(event: MediaQueryList | MediaQueryListEvent) {
    store.setDrawerViewport(event.matches)
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

  return {
    isDrawerViewport,
    navOpen,
    openNav: store.openNav,
    closeNav: store.closeNav,
    toggleNav: store.toggleNav,
  }
}
