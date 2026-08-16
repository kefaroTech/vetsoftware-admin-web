import { http } from '@/services/http/http.client'
import type {
  BaseRoleResponse,
  CreateBaseRoleRequest,
  UpdateBaseRoleRequest,
} from '../types/base-roles.types'

export const baseRolesApi = {
  async listAll(): Promise<BaseRoleResponse[]> {
    const { data } = await http.get<BaseRoleResponse[]>('/base-roles')
    return data
  },
  async findById(id: number): Promise<BaseRoleResponse> {
    const { data } = await http.get<BaseRoleResponse>(`/base-roles/${id}`)
    return data
  },
  async create(payload: CreateBaseRoleRequest): Promise<BaseRoleResponse> {
    const { data } = await http.post<BaseRoleResponse>('/base-roles', payload)
    return data
  },
  async update(id: number, payload: UpdateBaseRoleRequest): Promise<BaseRoleResponse> {
    const { data } = await http.put<BaseRoleResponse>(`/base-roles/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/base-roles/${id}`)
  },
}
