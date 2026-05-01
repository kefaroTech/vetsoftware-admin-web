import { http } from '@/services/http/http.client'
import type { Permission, CreatePermissionCommand, UpdatePermissionCommand } from '../types/permissions.types'

export const permissionsApi = {
  list: () => http.get<Permission[]>('/permissions'),
  getById: (id: number) => http.get<Permission>(`/permissions/${id}`),
  create: (payload: CreatePermissionCommand) => http.post<Permission>('/permissions', payload),
  update: (id: number, payload: UpdatePermissionCommand) =>
    http.put<Permission>(`/permissions/${id}`, payload),
  remove: (id: number) => http.delete(`/permissions/${id}`),
}
