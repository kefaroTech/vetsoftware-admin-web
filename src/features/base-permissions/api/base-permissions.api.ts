import { http } from '@/services/http/http.client'
import type {
  BasePermission,
  CreateBasePermissionCommand,
  UpdateBasePermissionCommand,
} from '../types/base-permissions.types'

export const basePermissionsApi = {
  list: () => http.get<BasePermission[]>('/base-permissions'),
  getById: (id: number) => http.get<BasePermission>(`/base-permissions/${id}`),
  create: (payload: CreateBasePermissionCommand) =>
    http.post<BasePermission>('/base-permissions', payload),
  update: (id: number, payload: UpdateBasePermissionCommand) =>
    http.put<BasePermission>(`/base-permissions/${id}`, payload),
  remove: (id: number) => http.delete(`/base-permissions/${id}`),
}
