import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type { WompiEventsQuery, WompiWebhookEventResponse } from '../types/wompi-events.types'

const WOMPI_EVENTS = '/system/payment-gateway/wompi/events'

export const wompiEventsApi = {
  async search(
    query: WompiEventsQuery,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<WompiWebhookEventResponse>> {
    const { data } = await http.get<PageResponse<WompiWebhookEventResponse>>(WOMPI_EVENTS, {
      params: { ...query, page, pageSize },
      signal,
    })
    return data
  },
}
