import axios from 'axios'
import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { subscriptionsAdminApi } from '../api/subscriptions-admin.api'
import { useSubscriptionsAdminStore } from '../stores/subscriptions-admin.store'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'

export function useSubscriptionsAdmin() {
  const store = useSubscriptionsAdminStore()
  const {
    subscriptionsPage,
    overlaps,
    loadingSubscriptions,
    loadingOverlaps,
    subscriptionsError,
    subscriptionsErrorTraceId,
    overlapsError,
    overlapsErrorTraceId,
  } = storeToRefs(store)
  const { errorFrom } = useToast()

  const subscriptions = computed(() => subscriptionsPage.value.content)
  const page = computed(() => subscriptionsPage.value.page + 1)
  const pageSize = computed(() => subscriptionsPage.value.pageSize)
  const total = computed(() => subscriptionsPage.value.totalElements)
  const pageCount = computed(() => Math.max(subscriptionsPage.value.totalPages, 1))
  const loading = computed(() => loadingSubscriptions.value || loadingOverlaps.value)

  // Son recursos distintos, así que cada uno puede cancelarse sin invalidar al otro.
  // Estas referencias pertenecen a esta instancia del composable; no son singletons de módulo.
  let subscriptionsRequest: AbortController | null = null
  let overlapsRequest: AbortController | null = null

  async function loadSubscriptions(oneBasedPage = page.value) {
    subscriptionsRequest?.abort()
    const controller = new AbortController()
    subscriptionsRequest = controller
    store.setLoadingSubscriptions(true)
    store.setSubscriptionsError(null)

    try {
      const result = await subscriptionsAdminApi.listAll(
        Math.max(oneBasedPage - 1, 0),
        pageSize.value,
        controller.signal,
      )
      if (!controller.signal.aborted) store.setSubscriptionsPage(result)
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      store.setSubscriptionsError(
        getProblemDetailMessage(error, 'No se pudieron cargar los contratos'),
        getTraceId(error) ?? null,
      )
      errorFrom('Error al cargar los contratos', error)
    } finally {
      if (subscriptionsRequest === controller) {
        store.setLoadingSubscriptions(false)
        subscriptionsRequest = null
      }
    }
  }

  async function loadOverlaps() {
    overlapsRequest?.abort()
    const controller = new AbortController()
    overlapsRequest = controller
    store.setLoadingOverlaps(true)
    store.setOverlapsError(null)

    try {
      const result = await subscriptionsAdminApi.listItemOverlaps(controller.signal)
      if (!controller.signal.aborted) store.setOverlaps(result)
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      store.setOverlapsError(
        getProblemDetailMessage(error, 'No se pudo comprobar la vigilancia de solapes'),
        getTraceId(error) ?? null,
      )
      errorFrom('Error al comprobar los solapes de facturación', error)
    } finally {
      if (overlapsRequest === controller) {
        store.setLoadingOverlaps(false)
        overlapsRequest = null
      }
    }
  }

  async function refreshAll() {
    await Promise.all([loadSubscriptions(page.value), loadOverlaps()])
  }

  onUnmounted(() => {
    subscriptionsRequest?.abort()
    overlapsRequest?.abort()
  })

  return {
    subscriptions,
    page,
    pageSize,
    total,
    pageCount,
    overlaps,
    loading,
    loadingSubscriptions,
    loadingOverlaps,
    subscriptionsError,
    subscriptionsErrorTraceId,
    overlapsError,
    overlapsErrorTraceId,
    loadSubscriptions,
    loadOverlaps,
    refreshAll,
  }
}
