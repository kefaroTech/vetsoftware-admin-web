import { http } from '@/services/http/http.client'
import type { BaseRole, CreateBaseRoleCommand, UpdateBaseRoleCommand } from '../types/base-roles.types'

export const baseRolesApi = {
  list: () => http.get<BaseRole[]>('/base-roles'),
  getById: (id: number) => http.get<BaseRole>(`/base-roles/${id}`),
  create: (payload: CreateBaseRoleCommand) => http.post<BaseRole>('/base-roles', payload),
  update: (id: number, payload: UpdateBaseRoleCommand) =>
    http.put<BaseRole>(`/base-roles/${id}`, payload),
  remove: (id: number) => http.delete(`/base-roles/${id}`),
}
