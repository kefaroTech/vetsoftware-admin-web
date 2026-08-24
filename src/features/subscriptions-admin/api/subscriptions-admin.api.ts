import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  SubscriptionItemOverlapResponse,
  SubscriptionResponse,
} from '../types/subscriptions-admin.types'

export const subscriptionsAdminApi = {
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<SubscriptionResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionResponse>>('/platform-subscriptions', {
      params: { page, pageSize },
      signal,
    })
    return data
  },

  async listItemOverlaps(signal?: AbortSignal): Promise<SubscriptionItemOverlapResponse[]> {
    const { data } = await http.get<SubscriptionItemOverlapResponse[]>(
      '/platform-subscriptions/item-overlaps',
      { signal },
    )
    return data
  },
}
