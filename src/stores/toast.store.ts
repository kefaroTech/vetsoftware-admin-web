import { defineStore } from 'pinia'
import { reactive } from 'vue'

export type ToastKind = 'success' | 'info' | 'warn' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
  /**
   * Identificador de la traza del backend (TR-05). Solo lo llevan los avisos nacidos de una
   * peticion fallida, y es lo que permite a soporte encontrar que paso en el servidor a partir
   * de un «se quedo cargando».
   */
  traceId?: string
}

const DEFAULT_DURATION = 3000

export const useToastStore = defineStore('toast', () => {
  const toasts = reactive<Toast[]>([])
  let nextId = 1

  function dismiss(id: number): void {
    const idx = toasts.findIndex((t) => t.id === id)
    if (idx >= 0) toasts.splice(idx, 1)
  }

  function push(
    kind: ToastKind,
    title: string,
    message?: string,
    duration: number = DEFAULT_DURATION,
    traceId?: string,
  ): number {
    const id = nextId++
    toasts.push({ id, kind, title, message, traceId })
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  return { toasts, push, dismiss }
})
