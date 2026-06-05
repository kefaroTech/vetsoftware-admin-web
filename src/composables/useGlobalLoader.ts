import { storeToRefs } from 'pinia'
import { useLoaderStore } from '@/stores/loader.store'

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
