import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfirmDialogStore = defineStore('confirmDialog', () => {
  const isOpen = ref(false)
  const message = ref('')
  let resolver: ((confirmed: boolean) => void) | null = null

  function confirm(msg: string): Promise<boolean> {
    // Si ya hay una pregunta abierta sin responder, se cancela antes de
    // sustituirla: su promesa se resuelve con `false`, que es la respuesta
    // segura cuando el usuario nunca llegó a decidir. Sin esto, reasignar
    // `resolver` perdería el anterior y quien esperaba esa primera respuesta
    // se quedaría colgado para siempre, sin un solo error que lo delate.
    resolver?.(false)
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
})
