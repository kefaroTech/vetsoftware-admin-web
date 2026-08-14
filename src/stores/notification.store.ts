import { defineStore } from 'pinia'
import { ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: number
  message: string
  type: NotificationType
  /** Traza del backend (TR-05); solo en los avisos nacidos de una peticion fallida. */
  traceId?: string
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  let nextId = 0

  function dismiss(id: number) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  function notify(message: string, type: NotificationType = 'info', traceId?: string) {
    const id = nextId++
    notifications.value.push({ id, message, type, traceId })
    // Un error con traza se queda mas tiempo: alguien puede querer copiarla.
    setTimeout(() => dismiss(id), traceId ? 9000 : 4000)
  }

  return { notifications, notify, dismiss }
})
