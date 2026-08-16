import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { useToastStore, type Toast, type ToastKind } from '@/stores/toast.store'

export type { Toast, ToastKind }

/**
 * Un fallo de red se queda más tiempo en pantalla que un «guardado correctamente»: lleva un
 * identificador de traza que alguien puede querer copiar, y tres segundos no dan para leerlo.
 */
const ERROR_DURATION = 9000

/**
 * Wrapper sobre el store de Pinia `toast`. Mantiene la API previa
 * (success/info/warn/error/dismiss + lista `toasts`) para no tocar call sites.
 */
export function useToast() {
  const store = useToastStore()
  return {
    toasts: store.toasts,
    dismiss: store.dismiss,
    success(title: string, message?: string, duration?: number) {
      return store.push('success', title, message, duration)
    },
    info(title: string, message?: string, duration?: number) {
      return store.push('info', title, message, duration)
    },
    warn(title: string, message?: string, duration?: number) {
      return store.push('warn', title, message, duration)
    },
    error(title: string, message?: string, duration?: number) {
      return store.push('error', title, message, duration)
    },
    /**
     * Aviso de error a partir del error de la petición (TR-05).
     *
     * <p>Extrae el mensaje y, además, el identificador de la traza que el backend ya venía
     * emitiendo en `X-Trace-Id`. Es la razón de existir de este método: mientras cada llamada
     * escribiera `error(titulo, getProblemDetailMessage(e))` a mano, el identificador se perdía
     * en el 100 % de los casos aunque estuviera ahí.
     */
    errorFrom(title: string, error: unknown, fallback?: string) {
      return store.push(
        'error',
        title,
        getProblemDetailMessage(error, fallback),
        ERROR_DURATION,
        getTraceId(error),
      )
    },
  }
}
