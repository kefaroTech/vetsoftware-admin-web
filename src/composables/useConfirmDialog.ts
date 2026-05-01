import { ref } from 'vue'

const isOpen = ref(false)
const message = ref('')
let resolver: ((confirmed: boolean) => void) | null = null

export function useConfirmDialog() {
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
    resolver = null
  }

  function cancel() {
    isOpen.value = false
    resolver?.(false)
    resolver = null
  }

  return { isOpen, message, confirm, accept, cancel }
}
