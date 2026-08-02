import { storeToRefs } from 'pinia'
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from '@/stores/notification.store'

export type { Notification, NotificationType }

export function useNotification() {
  const store = useNotificationStore()
  const { notifications } = storeToRefs(store)
  return { notifications, notify: store.notify, dismiss: store.dismiss }
}
