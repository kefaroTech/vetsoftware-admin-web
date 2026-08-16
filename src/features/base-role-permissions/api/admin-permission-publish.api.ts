import { http } from '@/services/http/http.client'
import type { PublishAdminPermissionsResponse } from '../types/admin-permission-publish.types'

export const adminPermissionPublishApi = {
  async publish(): Promise<PublishAdminPermissionsResponse> {
    const { data } = await http.post<PublishAdminPermissionsResponse>(
      '/admin/admin-permissions/publish',
    )
    return data
  },
}
