import { ref } from 'vue'

export function useConfirmDialog() {
  const isOpen = ref(false)
  const message = ref('')
  let resolver: ((confirmed: boolean) => void) | null = null

  function confirm(msg: string): Promise<boolean> {
    message.value = msg
    isOpen.value = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function accept() {
    isOpen.value = false
    resolver?.(true)
  }

  function cancel() {
    isOpen.value = false
    resolver?.(false)
  }

  return { isOpen, message, confirm, accept, cancel }
}
