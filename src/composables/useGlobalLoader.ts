import { storeToRefs } from 'pinia'
import { useLoaderStore } from '@/stores/loader.store'

/**
 * Uso programático del loader global (también lo disparan los interceptores de
 * axios en request/response). Respaldado por el store de Pinia `loader`.
 */
export function pushLoader() {
  useLoaderStore().push()
}

export function popLoader() {
  useLoaderStore().pop()
}

export function useGlobalLoader() {
  const store = useLoaderStore()
  const { visible, pending } = storeToRefs(store)
  return { visible, pending, push: store.push, pop: store.pop }
}
