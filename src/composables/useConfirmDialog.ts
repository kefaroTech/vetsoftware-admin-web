import { storeToRefs } from 'pinia'
import { useConfirmDialogStore } from '@/stores/confirmDialog.store'

/**
 * Fachada del diálogo de confirmación.
 *
 * Expone TODO lo que `ConfirmOptions` deja configurar (`consequence`,
 * `confirmLabel`), no solo el mensaje: `AppConfirmDialog.vue` los pinta y el
 * store ya los guarda, así que dejarlos fuera de aquí rompía la cadena por el
 * medio — el diálogo se quedaba sin el banner de consecuencia y sin el rótulo
 * con la acción nombrada que pide WCAG 2.2 §3.3.4, que es justo el motivo por
 * el que se añadieron.
 */
export function useConfirmDialog() {
  const store = useConfirmDialogStore()
  const { isOpen, message, consequence, confirmLabel } = storeToRefs(store)
  return {
    isOpen,
    message,
    consequence,
    confirmLabel,
    confirm: store.confirm,
    accept: store.accept,
    cancel: store.cancel,
  }
}
