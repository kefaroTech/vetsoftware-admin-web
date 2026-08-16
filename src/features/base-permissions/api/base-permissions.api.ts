import { http } from '@/services/http/http.client'
import type {
  BasePermissionResponse,
  CreateBasePermissionRequest,
  UpdateBasePermissionRequest,
} from '../types/base-permissions.types'

export const basePermissionsApi = {
  async listAll(): Promise<BasePermissionResponse[]> {
    const { data } = await http.get<BasePermissionResponse[]>('/base-permissions')
    return data
  },
  async findById(id: number): Promise<BasePermissionResponse> {
    const { data } = await http.get<BasePermissionResponse>(`/base-permissions/${id}`)
    return data
  },
  async create(payload: CreateBasePermissionRequest): Promise<BasePermissionResponse> {
    const { data } = await http.post<BasePermissionResponse>('/base-permissions', payload)
    return data
  },
  async update(id: number, payload: UpdateBasePermissionRequest): Promise<BasePermissionResponse> {
    const { data } = await http.put<BasePermissionResponse>(`/base-permissions/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/base-permissions/${id}`)
  },
}
