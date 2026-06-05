import { storeToRefs } from 'pinia'
import { useConfirmDialogStore } from '@/stores/confirmDialog.store'

export function useConfirmDialog() {
  const store = useConfirmDialogStore()
  const { isOpen, message } = storeToRefs(store)
  return { isOpen, message, confirm: store.confirm, accept: store.accept, cancel: store.cancel }
}
