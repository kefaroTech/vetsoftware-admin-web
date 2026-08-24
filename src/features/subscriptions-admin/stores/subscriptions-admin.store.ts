import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emptyPage, type PageResponse } from '@/types/pagination'
import type {
  SubscriptionItemOverlapResponse,
  SubscriptionResponse,
} from '../types/subscriptions-admin.types'

export const useSubscriptionsAdminStore = defineStore('subscriptionsAdmin', () => {
  const subscriptionsPage =
    ref<PageResponse<SubscriptionResponse>>(emptyPage<SubscriptionResponse>())
  const overlaps = ref<SubscriptionItemOverlapResponse[]>([])

  const loadingSubscriptions = ref(false)
  const loadingOverlaps = ref(false)
  const subscriptionsError = ref<string | null>(null)
  const subscriptionsErrorTraceId = ref<string | null>(null)
  const overlapsError = ref<string | null>(null)
  const overlapsErrorTraceId = ref<string | null>(null)

  function setSubscriptionsPage(value: PageResponse<SubscriptionResponse>) {
    subscriptionsPage.value = value
  }

  function setOverlaps(value: SubscriptionItemOverlapResponse[]) {
    overlaps.value = value
  }

  function setLoadingSubscriptions(value: boolean) {
    loadingSubscriptions.value = value
  }

  function setLoadingOverlaps(value: boolean) {
    loadingOverlaps.value = value
  }

  function setSubscriptionsError(message: string | null, traceId: string | null = null) {
    subscriptionsError.value = message
    subscriptionsErrorTraceId.value = traceId
  }

  function setOverlapsError(message: string | null, traceId: string | null = null) {
    overlapsError.value = message
    overlapsErrorTraceId.value = traceId
  }

  return {
    subscriptionsPage,
    overlaps,
    loadingSubscriptions,
    loadingOverlaps,
    subscriptionsError,
    subscriptionsErrorTraceId,
    overlapsError,
    overlapsErrorTraceId,
    setSubscriptionsPage,
    setOverlaps,
    setLoadingSubscriptions,
    setLoadingOverlaps,
    setSubscriptionsError,
    setOverlapsError,
  }
})
