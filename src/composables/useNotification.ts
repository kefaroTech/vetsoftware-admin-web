import { storeToRefs } from 'pinia'
import { useNotificationStore } from '@/stores/notification.store'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'

export function useNotification() {
  const store = useNotificationStore()
  const { notifications } = storeToRefs(store)
  return {
    notifications,
    notify: store.notify,
    dismiss: store.dismiss,
    /**
     * Aviso de error a partir del error de la petición (TR-05).
     *
     * <p>Este repositorio descartaba el error entero: sus `catch` no lo capturaban y el aviso era
     * un texto fijo escrito a mano. Eso tiraba dos cosas a la vez — el mensaje que el backend
     * había redactado y el identificador de la traza que emite en `X-Trace-Id`—, así que ante un
     * fallo no quedaba ni qué pasó ni dónde buscarlo.
     *
     * <p>El texto fijo se mantiene como respaldo: es más específico de la pantalla que el
     * `detail` genérico del servidor, y por eso se prefiere cuando el backend no manda uno.
     */
    notifyError(fallback: string, error: unknown) {
      return store.notify(getProblemDetailMessage(error, fallback), 'error', getTraceId(error))
    },
  }
}
