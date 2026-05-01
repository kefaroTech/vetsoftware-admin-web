import { http } from '@/services/http/http.client'
import type {
  BaseRolePermission,
  CreateBaseRolePermissionCommand,
  UpdateBaseRolePermissionCommand,
} from '../types/base-role-permissions.types'

export const baseRolePermissionsApi = {
  list: () => http.get<BaseRolePermission[]>('/base-role-permissions'),
  getById: (id: number) => http.get<BaseRolePermission>(`/base-role-permissions/${id}`),
  create: (payload: CreateBaseRolePermissionCommand) =>
    http.post<BaseRolePermission>('/base-role-permissions', payload),
  update: (id: number, payload: UpdateBaseRolePermissionCommand) =>
    http.put<BaseRolePermission>(`/base-role-permissions/${id}`, payload),
  remove: (id: number) => http.delete(`/base-role-permissions/${id}`),
}
