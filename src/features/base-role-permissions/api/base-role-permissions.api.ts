import { http } from '@/services/http/http.client'
import type {
  BaseRolePermissionResponse,
  CreateBaseRolePermissionRequest,
  UpdateBaseRolePermissionRequest,
} from '../types/base-role-permissions.types'

export const baseRolePermissionsApi = {
  async listAll(): Promise<BaseRolePermissionResponse[]> {
    const { data } = await http.get<BaseRolePermissionResponse[]>('/base-role-permissions')
    return data
  },
  async findById(id: number): Promise<BaseRolePermissionResponse> {
    const { data } = await http.get<BaseRolePermissionResponse>(`/base-role-permissions/${id}`)
    return data
  },
  async create(payload: CreateBaseRolePermissionRequest): Promise<BaseRolePermissionResponse> {
    const { data } = await http.post<BaseRolePermissionResponse>('/base-role-permissions', payload)
    return data
  },
  async update(
    id: number,
    payload: UpdateBaseRolePermissionRequest,
  ): Promise<BaseRolePermissionResponse> {
    const { data } = await http.put<BaseRolePermissionResponse>(
      `/base-role-permissions/${id}`,
      payload,
    )
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/base-role-permissions/${id}`)
  },
}
