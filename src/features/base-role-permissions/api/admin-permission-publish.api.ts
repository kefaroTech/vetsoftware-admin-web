import { http } from '@/services/http/http.client'
import type { PublishAdminPermissionsResult } from '../types/admin-permission-publish.types'

export const adminPermissionPublishApi = {
  publish: () => http.post<PublishAdminPermissionsResult>('/admin/admin-permissions/publish'),
}
